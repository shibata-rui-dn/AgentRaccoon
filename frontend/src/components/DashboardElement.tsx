import React, { memo, useCallback } from 'react'
import { GripVertical, Download, Trash2 } from 'lucide-react'
import { useAppDispatch } from '../store'
import {
  setSelectedElement,
  setEditingNameId,
  updateElement,
  deleteElement,
  startDragging
} from '../store/dashboardSlice'
import { GridElement } from '../store/dashboardSlice'
import DashboardElementContent from './DashboardElementContent'

const GRID_CELL_SIZE = 20

// ヘッダー部分を分離してメモ化
const ElementHeader = memo<{
  element: GridElement
  editingNameId: string | null
  onHeaderMouseDown: (e: React.MouseEvent) => void
  onDelete: () => void
  onDownload: (elementId: string, e: React.MouseEvent) => void
}>(({ element, editingNameId, onHeaderMouseDown, onDelete, onDownload }) => {
  const dispatch = useAppDispatch()

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    dispatch(updateElement({ id: element.id, updates: { name: e.target.value } }))
  }, [element.id, dispatch])

  const handleNameBlur = useCallback(() => {
    dispatch(setEditingNameId(null))
  }, [dispatch])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      dispatch(setEditingNameId(null))
    }
    e.stopPropagation()
  }, [dispatch])

  const handleNameDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(setEditingNameId(element.id))
  }, [element.id, dispatch])

  return (
    <div
      className="flex items-center justify-between px-2 py-1 bg-gray-100 border-b border-gray-300 cursor-move"
      onMouseDown={onHeaderMouseDown}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />
        {editingNameId === element.id ? (
          <input
            type="text"
            value={element.name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            autoFocus
            className="text-xs font-medium text-gray-700 bg-white border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
          />
        ) : (
          <span
            className="text-xs font-medium text-gray-700 truncate hover:bg-gray-200 px-1 rounded cursor-text"
            onDoubleClick={handleNameDoubleClick}
          >
            {element.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Download button */}
        <button
          onClick={(e) => onDownload(element.id, e)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-green-100 transition-colors"
          title="ダウンロード"
        >
          <Download className="w-3 h-3 text-green-600" />
        </button>
        {/* Delete button */}
        <button
          onClick={onDelete}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 transition-colors"
          title="削除"
        >
          <Trash2 className="w-3 h-3 text-red-600" />
        </button>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // 名前と編集状態が変わらない限り再レンダリングしない
  return (
    prevProps.element.id === nextProps.element.id &&
    prevProps.element.name === nextProps.element.name &&
    prevProps.editingNameId === nextProps.editingNameId
  )
})

interface DashboardElementProps {
  element: GridElement
  isSelected: boolean
  editingNameId: string | null
  onResizeStart: (elementId: string, e: React.MouseEvent) => void
  onDownload: (elementId: string, e: React.MouseEvent) => void
}

const DashboardElement: React.FC<DashboardElementProps> = ({
  element,
  isSelected,
  editingNameId,
  onResizeStart,
  onDownload
}) => {
  const dispatch = useAppDispatch()

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(setSelectedElement(element.id))
  }, [element.id, dispatch])

  const handleDelete = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    dispatch(deleteElement(element.id))
  }, [element.id, dispatch])

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // 親要素へのイベント伝播を防ぐ
    if (editingNameId !== element.id) {
      // 要素を選択してからドラッグを開始
      dispatch(setSelectedElement(element.id))
      dispatch(startDragging({
        elementId: element.id,
        x: e.clientX,
        y: e.clientY,
        elementX: element.x,
        elementY: element.y
      }))
    } else {
      // 編集中の場合は選択のみ
      dispatch(setSelectedElement(element.id))
    }
  }, [editingNameId, element.id, element.x, element.y, dispatch])

  return (
    <div
      className={`absolute border-2 transition-colors group flex flex-col ${
        isSelected
          ? 'border-blue-500 bg-white shadow-lg'
          : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
      style={{
        left: `${element.x * GRID_CELL_SIZE}px`,
        top: `${element.y * GRID_CELL_SIZE}px`,
        width: `${element.width * GRID_CELL_SIZE}px`,
        height: `${element.height * GRID_CELL_SIZE}px`
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Element Header */}
      <ElementHeader
        element={element}
        editingNameId={editingNameId}
        onHeaderMouseDown={handleHeaderMouseDown}
        onDelete={handleDelete}
        onDownload={onDownload}
      />

      {/* Element Content */}
      <div className="flex-1 overflow-hidden relative">
        <DashboardElementContent element={element} />
        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => onResizeStart(element.id, e)}
        >
          <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-gray-400" />
        </div>
      </div>
    </div>
  )
}

// メモ化により、propsが変更されない限り再レンダリングを防止
export default memo(DashboardElement, (prevProps, nextProps) => {
  // element の参照ではなく、実際のプロパティを比較
  // これにより、他の要素が変更されても、このコンポーネントは再レンダリングされない
  return (
    prevProps.element.id === nextProps.element.id &&
    prevProps.element.name === nextProps.element.name &&
    prevProps.element.type === nextProps.element.type &&
    prevProps.element.x === nextProps.element.x &&
    prevProps.element.y === nextProps.element.y &&
    prevProps.element.width === nextProps.element.width &&
    prevProps.element.height === nextProps.element.height &&
    prevProps.element.pipelineId === nextProps.element.pipelineId &&
    prevProps.element.leafNodeId === nextProps.element.leafNodeId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.editingNameId === nextProps.editingNameId
  )
})
