import React, { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { X, AlertCircle } from 'lucide-react'

interface CustomNodeData {
  label: string
  nodeType: string
  config: any
  onDelete?: (nodeId: string) => void
  isDeletable?: boolean
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ id, data }) => {
  const [showTooltip, setShowTooltip] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onDelete) {
      data.onDelete(id)
    }
  }

  // カスタムノードの場合は最大5つの入力ハンドルを表示
  const isCustomNode = data.nodeType === 'custom'
  const isVisualizationNode = data.nodeType === 'visualization'
  const isDashboardNode = data.nodeType === 'dashboard'
  const isDataSourceNode = data.nodeType === 'dataSource'
  const isInitialDataSource = isDataSourceNode && data.config?.isInitial === true
  const inputHandleCount = isCustomNode ? 5 : 1

  // データソースの検証
  const hasWarning = isDataSourceNode && !data.config?.databaseId
  const warningMessage = hasWarning
    ? '参照データが設定されていません。ノードをクリックして設定パネルからデータベースを選択してください。'
    : ''

  return (
    <>
      {/* 複数の入力ハンドル */}
      {isCustomNode ? (
        // カスタムノード: 5つの入力ハンドルを上部に配置
        Array.from({ length: inputHandleCount }).map((_, index) => (
          <Handle
            key={`input-${index}`}
            type="target"
            position={Position.Top}
            id={`input-${index}`}
            style={{
              left: `${((index + 1) * 100) / (inputHandleCount + 1)}%`,
              background: '#555'
            }}
          />
        ))
      ) : !isInitialDataSource ? (
        // 通常のノード: 単一の入力ハンドル（上部）
        // 初期データソースは入力ハンドルなし
        <Handle type="target" position={Position.Top} />
      ) : null}

      {data.label}

      {/* 警告アイコン */}
      {hasWarning && (
        <div
          className="absolute -top-2 -left-2 z-10"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="relative">
            <AlertCircle className="w-5 h-5 text-orange-500 bg-white rounded-full" />
            {showTooltip && (
              <div className="absolute left-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-20 pointer-events-none">
                {warningMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {data.isDeletable && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
          title="削除"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}

      {/* 出力ハンドル */}
      {/* 可視化ノードとダッシュボードノードは出力ハンドルなし */}
      {!isVisualizationNode && !isDashboardNode && (
        <Handle type="source" position={Position.Bottom} />
      )}
    </>
  )
}

export default memo(CustomNode)
