import React from 'react'
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge
} from 'reactflow'
import { X } from 'lucide-react'

interface CustomEdgeProps extends EdgeProps {
  data?: {
    onDelete?: (edgeId: string) => void
  }
}

const CustomEdge: React.FC<CustomEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data?.onDelete) {
      data.onDelete(id)
    }
  }

  // selectedプロパティで選択状態を判定（ReactFlowの標準機能を使用）
  const isSelected = selected

  return (
    <>
      {/* 透明な太い線でクリック範囲を広げる */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        style={{ cursor: 'pointer' }}
      />
      {/* 実際に表示されるエッジ */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      {/* 選択時に削除ボタンを表示 */}
      {isSelected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
              zIndex: 1000
            }}
            className="nodrag nopan"
          >
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg border-2 border-white transition-transform hover:scale-110"
              title="エッジを削除"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default CustomEdge
