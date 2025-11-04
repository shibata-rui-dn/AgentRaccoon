import React, { useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchPipelines } from '../store/pipelineSlice'
import {
  fetchDashboards,
  loadDashboard,
  createDashboard,
  saveDashboard,
  deleteDashboard,
  renameDashboard,
  executePipeline,
  addElement,
  updateElement,
  // setSelectedElement は DashboardElement で使用されているため、インポートが必要
  startDrawing,
  updateDrawing,
  endDrawing,
  startResizing,
  updateResize,
  endResizing,
  updateDrag,
  endDragging,
  startEditingDashboardName,
  setEditingDashboardName,
  cancelEditingDashboardName,
  showNewDashboardDialog,
  hideNewDashboardDialog,
  setNewDashboardName
} from '../store/dashboardSlice'
import {
  selectDashboardElements,
  selectSelectedElement,
  selectDrawingRect,
  selectCurrentDashboard,
  selectDashboards,
  selectHasUnsavedChanges,
  selectIsSaving,
  selectAvailableLeafNodes
} from '../store/selectors'
import DashboardElement from '../components/DashboardElement'
import DashboardTabs from '../components/DashboardTabs'
import ElementConfigPanel from '../components/ElementConfigPanel'

const GRID_CELL_SIZE = 20
const MIN_ELEMENT_WIDTH = 8
const MIN_ELEMENT_HEIGHT = 6

type ElementType = 'bar' | 'line' | 'scatter' | 'pie' | 'table'

const DashboardView: React.FC = () => {
  const dispatch = useAppDispatch()

  // Select state from Redux store using memoized selectors
  const pipelines = useAppSelector(state => state.pipeline.pipelines)
  const elements = useAppSelector(selectDashboardElements)
  const selectedElement = useAppSelector(selectSelectedElement)
  const drawingRect = useAppSelector(selectDrawingRect)
  const currentDashboard = useAppSelector(selectCurrentDashboard)
  const dashboards = useAppSelector(selectDashboards)
  const hasUnsavedChanges = useAppSelector(selectHasUnsavedChanges)
  const isSaving = useAppSelector(selectIsSaving)
  const availableLeafNodes = useAppSelector(selectAvailableLeafNodes)

  // UI state
  const selectedElementId = useAppSelector(state => state.dashboard.selectedElementId)
  const isDrawing = useAppSelector(state => state.dashboard.isDrawing)
  const isResizing = useAppSelector(state => state.dashboard.isResizing)
  const isDragging = useAppSelector(state => state.dashboard.isDragging)
  const resizingElementId = useAppSelector(state => state.dashboard.resizingElementId)
  const draggingElementId = useAppSelector(state => state.dashboard.draggingElementId)
  const resizeStart = useAppSelector(state => state.dashboard.resizeStart)
  const dragStart = useAppSelector(state => state.dashboard.dragStart)
  const editingNameId = useAppSelector(state => state.dashboard.editingNameId)
  const editingDashboardId = useAppSelector(state => state.dashboard.editingDashboardId)
  const editingDashboardName = useAppSelector(state => state.dashboard.editingDashboardName)
  const showNewDashboardDialogState = useAppSelector(state => state.dashboard.showNewDashboardDialog)
  const newDashboardName = useAppSelector(state => state.dashboard.newDashboardName)
  const elementCounter = useAppSelector(state => state.dashboard.elementCounter)

  const [gridDimensions, setGridDimensions] = React.useState({ rows: 30, cols: 50 })

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchPipelines())
    dispatch(fetchDashboards())
  }, [dispatch])

  // Auto-open dashboard after list is loaded
  useEffect(() => {
    if (dashboards.length > 0 && !currentDashboard) {
      const lastUsedId = localStorage.getItem('lastUsedDashboardId')

      if (lastUsedId && dashboards.some(d => d.id === lastUsedId)) {
        dispatch(loadDashboard(lastUsedId))
      } else {
        dispatch(loadDashboard(dashboards[0].id))
      }
    }
  }, [dashboards, currentDashboard, dispatch])

  // Grid size calculation
  useEffect(() => {
    const updateGridSize = () => {
      const container = document.getElementById('grid-container')
      if (container) {
        const width = container.clientWidth
        const height = container.clientHeight
        const cols = Math.floor(width / GRID_CELL_SIZE)
        const rows = Math.floor(height / GRID_CELL_SIZE)
        setGridDimensions({ rows, cols })
      }
    }

    updateGridSize()
    window.addEventListener('resize', updateGridSize)
    return () => window.removeEventListener('resize', updateGridSize)
  }, [])

  // Auto-save interval
  useEffect(() => {
    if (!currentDashboard) return

    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        dispatch(saveDashboard())
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [currentDashboard, hasUnsavedChanges, dispatch])

  // Auto-save on unmount
  useEffect(() => {
    return () => {
      if (currentDashboard && hasUnsavedChanges) {
        dispatch(saveDashboard())
      }
    }
  }, [currentDashboard, hasUnsavedChanges, dispatch])

  // Resize handler
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizingElementId || !resizeStart) return

    const deltaX = e.clientX - resizeStart.x
    const deltaY = e.clientY - resizeStart.y

    dispatch(updateResize({ deltaX, deltaY, gridCellSize: GRID_CELL_SIZE }))
  }, [isResizing, resizingElementId, resizeStart, dispatch])

  const handleResizeEnd = useCallback(() => {
    dispatch(endResizing())
  }, [dispatch])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)
      return () => {
        window.removeEventListener('mousemove', handleResizeMove)
        window.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Drag handler
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggingElementId || !dragStart) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    dispatch(updateDrag({ deltaX, deltaY, gridCellSize: GRID_CELL_SIZE }))
  }, [isDragging, draggingElementId, dragStart, dispatch])

  const handleDragEnd = useCallback(() => {
    dispatch(endDragging())
  }, [dispatch])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // Grid interaction handlers
  const handleMouseDown = useCallback((x: number, y: number) => {
    // 要素のクリックは DashboardElement で処理されるので、ここでは描画開始のみ
    // グリッドセルをクリックしたら描画モードに入る
    dispatch(startDrawing({ x, y }))
  }, [dispatch])

  const handleMouseMove = useCallback((x: number, y: number) => {
    if (isDrawing) {
      dispatch(updateDrawing({ x, y }))
    }
  }, [isDrawing, dispatch])

  const handleMouseUp = useCallback(() => {
    if (isDrawing && drawingRect) {
      if (!currentDashboard) {
        dispatch(endDrawing())
        dispatch(showNewDashboardDialog())
        return
      }

      const { x, y, width, height } = drawingRect

      if (width >= MIN_ELEMENT_WIDTH && height >= MIN_ELEMENT_HEIGHT) {
        dispatch(addElement({
          name: `要素名${elementCounter}`,
          type: null,
          x,
          y,
          width,
          height,
          pipelineId: null,
          leafNodeId: null
        }))
      }
    }
    dispatch(endDrawing())
  }, [isDrawing, drawingRect, currentDashboard, elementCounter, dispatch])

  // Element configuration handlers
  // elementId を引数で受け取ることで、ハンドラーは常に安定した参照を持つ
  const handleUpdateElementName = useCallback((elementId: string, name: string) => {
    dispatch(updateElement({ id: elementId, updates: { name } }))
  }, [dispatch])

  const handleSelectElementType = useCallback((elementId: string, type: ElementType) => {
    dispatch(updateElement({ id: elementId, updates: { type } }))
  }, [dispatch])

  const handleSelectPipeline = useCallback(async (elementId: string, pipelineId: string) => {
    dispatch(executePipeline(pipelineId))
    dispatch(updateElement({
      id: elementId,
      updates: { pipelineId, leafNodeId: null }
    }))
  }, [dispatch])

  const handleSelectLeafNode = useCallback((elementId: string, leafNodeId: string) => {
    dispatch(updateElement({ id: elementId, updates: { leafNodeId } }))
  }, [dispatch])

  const handleResizeStart = useCallback((elementId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const element = elements.find(el => el.id === elementId)
    if (!element) return

    dispatch(startResizing({
      elementId,
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height
    }))
  }, [elements, dispatch])

  const handleDownload = useCallback((elementId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    const element = elements.find(el => el.id === elementId)
    if (!element || !element.pipelineId || !element.leafNodeId) {
      alert('ダウンロードするデータがありません')
      return
    }

    const leafNodes = availableLeafNodes[element.pipelineId]
    if (!leafNodes) {
      alert('データを読み込み中です')
      return
    }

    const leafNode = leafNodes.find(ln => ln.nodeId === element.leafNodeId)
    if (!leafNode || !leafNode.data || leafNode.data.length === 0) {
      alert('ダウンロードするデータがありません')
      return
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(leafNode.data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

      const fileName = `${element.name}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error('Download error:', error)
      alert('ダウンロード中にエラーが発生しました')
    }
  }, [elements, availableLeafNodes])

  // Dashboard management handlers
  const handleLoadDashboard = useCallback(async (dashboardId: string) => {
    if (currentDashboard && hasUnsavedChanges) {
      await dispatch(saveDashboard()).unwrap()
    }
    dispatch(loadDashboard(dashboardId))
  }, [currentDashboard, hasUnsavedChanges, dispatch])

  const handleNewDashboard = useCallback(() => {
    dispatch(showNewDashboardDialog())
  }, [dispatch])

  const handleCreateDashboard = useCallback(async () => {
    if (!newDashboardName.trim()) {
      alert('ダッシュボード名を入力してください')
      return
    }

    await dispatch(createDashboard(newDashboardName.trim())).unwrap()
    await dispatch(fetchDashboards()).unwrap()
  }, [newDashboardName, dispatch])

  const handleDeleteDashboard = useCallback(async (dashboardId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const dashboard = dashboards.find(d => d.id === dashboardId)
    if (!dashboard) return

    if (!confirm(`ダッシュボード「${dashboard.name}」を削除しますか？`)) return

    await dispatch(deleteDashboard(dashboardId)).unwrap()
    await dispatch(fetchDashboards()).unwrap()

    if (currentDashboard?.id === dashboardId) {
      const remainingDashboards = dashboards.filter(d => d.id !== dashboardId)
      if (remainingDashboards.length > 0) {
        handleLoadDashboard(remainingDashboards[0].id)
      }
    }
  }, [dashboards, currentDashboard, dispatch, handleLoadDashboard])

  const handleStartEditDashboardName = useCallback((dashboardId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(startEditingDashboardName({ dashboardId, name: currentName }))
  }, [dispatch])

  const handleRenameDashboard = useCallback(async (dashboardId: string) => {
    if (!editingDashboardName.trim()) {
      alert('ダッシュボード名を入力してください')
      return
    }

    await dispatch(renameDashboard({ dashboardId, name: editingDashboardName.trim() })).unwrap()
    await dispatch(fetchDashboards()).unwrap()
  }, [editingDashboardName, dispatch])

  const handleCancelEditDashboardName = useCallback(() => {
    dispatch(cancelEditingDashboardName())
  }, [dispatch])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header - Browser Style Tabs */}
      <DashboardTabs
        dashboards={dashboards}
        currentDashboard={currentDashboard}
        editingDashboardId={editingDashboardId}
        editingDashboardName={editingDashboardName}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onLoadDashboard={handleLoadDashboard}
        onNewDashboard={handleNewDashboard}
        onStartEditDashboardName={handleStartEditDashboardName}
        onSetEditingDashboardName={(value) => dispatch(setEditingDashboardName(value))}
        onRenameDashboard={handleRenameDashboard}
        onCancelEditDashboardName={handleCancelEditDashboardName}
        onDeleteDashboard={handleDeleteDashboard}
        onSaveDashboard={() => dispatch(saveDashboard())}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Element Configuration */}
        <ElementConfigPanel
          selectedElement={selectedElement}
          pipelines={pipelines}
          availableLeafNodes={availableLeafNodes}
          onUpdateElementName={handleUpdateElementName}
          onSelectElementType={handleSelectElementType}
          onSelectPipeline={handleSelectPipeline}
          onSelectLeafNode={handleSelectLeafNode}
        />

        {/* Right Panel - Grid Canvas */}
        <div id="grid-container" className="flex-1 bg-gray-50 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-white"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid cells for interaction */}
            {Array.from({ length: gridDimensions.rows }).map((_, row) => (
              <div key={row} className="flex">
                {Array.from({ length: gridDimensions.cols }).map((_, col) => (
                  <div
                    key={col}
                    style={{ width: `${GRID_CELL_SIZE}px`, height: `${GRID_CELL_SIZE}px` }}
                    className="hover:bg-blue-50 cursor-crosshair"
                    onMouseDown={() => handleMouseDown(col, row)}
                    onMouseMove={() => handleMouseMove(col, row)}
                  />
                ))}
              </div>
            ))}

            {/* Existing elements */}
            {elements.map(element => (
              <DashboardElement
                key={element.id}
                element={element}
                isSelected={selectedElementId === element.id}
                editingNameId={editingNameId}
                onResizeStart={handleResizeStart}
                onDownload={handleDownload}
              />
            ))}

            {/* Drawing rectangle */}
            {drawingRect && (
              <div
                className="absolute border-2 border-dashed border-blue-400 bg-blue-50 bg-opacity-30 pointer-events-none"
                style={{
                  left: `${drawingRect.x * GRID_CELL_SIZE}px`,
                  top: `${drawingRect.y * GRID_CELL_SIZE}px`,
                  width: `${drawingRect.width * GRID_CELL_SIZE}px`,
                  height: `${drawingRect.height * GRID_CELL_SIZE}px`
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* New Dashboard Dialog */}
      {showNewDashboardDialogState && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => dispatch(hideNewDashboardDialog())}
        >
          <Card className="w-96" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>新規ダッシュボード</CardTitle>
              <CardDescription>
                新しいダッシュボード名を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ダッシュボード名</Label>
                <Input
                  value={newDashboardName}
                  onChange={(e) => dispatch(setNewDashboardName(e.target.value))}
                  placeholder="例: 売上分析ダッシュボード"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateDashboard()
                    } else if (e.key === 'Escape') {
                      dispatch(hideNewDashboardDialog())
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => dispatch(hideNewDashboardDialog())}
                >
                  キャンセル
                </Button>
                <Button onClick={handleCreateDashboard}>
                  作成
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default DashboardView
