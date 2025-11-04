import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Node, Edge } from 'reactflow'
import { useDatabases } from '../hooks/useDatabases'
import { useAvailableFields } from '../hooks/useAvailableFields'
import { generateFilterCode, generateTransformCode, generateAggregateCode } from '../utils/codeGenerator'
import DataSourceConfig from './pipeline/DataSourceConfig'
import FilterConfig from './pipeline/FilterConfig'
import TransformConfig from './pipeline/TransformConfig'
import AggregateConfig from './pipeline/AggregateConfig'
import VisualizationConfig from './pipeline/VisualizationConfig'
import CustomConfig from './pipeline/CustomConfig'

interface NodeConfigPanelProps {
  node: Node
  nodes: Node[]
  edges: Edge[]
  onConfigChange: (config: any) => void
  onNodeUpdate?: (updates: { nodeType?: any, label?: string, config?: any }) => void
}

const nodeTypeLabels = {
  dataSource: 'データソース',
  filter: 'フィルター',
  transform: '変換',
  aggregate: '集計',
  join: '結合',
  visualization: '可視化',
  custom: 'カスタム',
  dashboard: 'ダッシュボード'
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  nodes,
  edges,
  onConfigChange,
  onNodeUpdate
}) => {
  const [config, setConfig] = useState(node.data.config || {})
  const [nodeName, setNodeName] = useState(node.data.label || '')
  const { databases } = useDatabases()
  const availableFields = useAvailableFields(node, nodes, edges, databases)

  useEffect(() => {
    setConfig(node.data.config || {})
    setNodeName(node.data.label || '')
  }, [node])

  const handleConfigChange = useCallback((newConfig: any) => {
    setConfig(newConfig)
    onConfigChange(newConfig)
  }, [onConfigChange])

  const handleNodeNameChange = useCallback((newName: string) => {
    setNodeName(newName)
    if (onNodeUpdate) {
      onNodeUpdate({ label: newName })
    }
  }, [onNodeUpdate])

  const handleConvertToCustom = useCallback(() => {
    const nodeType = node.data.nodeType
    let code = ''

    if (nodeType === 'filter') {
      code = generateFilterCode(config.conditions || [])
    } else if (nodeType === 'transform') {
      code = generateTransformCode(config.transformations || [], availableFields)
    } else if (nodeType === 'aggregate') {
      code = generateAggregateCode(config.groupBy || [], config.aggregations || [])
    }

    if (code && onNodeUpdate) {
      onNodeUpdate({
        nodeType: 'custom',
        label: 'カスタム',
        config: { customCode: code }
      })
    }
  }, [node.data.nodeType, config, availableFields, onNodeUpdate])

  const commonProps = useMemo(() => ({
    node,
    config,
    availableFields,
    onConfigChange: handleConfigChange,
    onConvertToCustom: handleConvertToCustom
  }), [node, config, availableFields, handleConfigChange, handleConvertToCustom])

  const renderConfig = useMemo(() => {
    switch (node.data.nodeType) {
      case 'dataSource':
        return <DataSourceConfig {...commonProps} databases={databases} />
      case 'filter':
        return <FilterConfig {...commonProps} />
      case 'transform':
        return <TransformConfig {...commonProps} />
      case 'aggregate':
        return <AggregateConfig {...commonProps} />
      case 'visualization':
        return <VisualizationConfig {...commonProps} />
      case 'custom':
        return <CustomConfig {...commonProps} />
      case 'dashboard':
        return (
          <div className="text-sm text-gray-600 p-4 bg-indigo-50 rounded-md border border-indigo-200">
            <p className="font-semibold mb-2">ダッシュボード参照用ノード</p>
            <p>このノードは処理を行いませんが、ダッシュボードが参照可能なテーブルとして扱われます。</p>
          </div>
        )
      default:
        return <div className="text-gray-500">このノードタイプの設定はありません</div>
    }
  }, [node.data.nodeType, commonProps, databases])

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ノード名
          </label>
          <input
            type="text"
            value={nodeName}
            onChange={(e) => handleNodeNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ノード名を入力"
          />
        </div>
        <div>
          <p className="text-sm text-gray-600">
            種類: <span className="font-semibold">{nodeTypeLabels[node.data.nodeType as keyof typeof nodeTypeLabels]}</span>
          </p>
        </div>
      </div>

      {renderConfig}
    </div>
  )
}

export default React.memo(NodeConfigPanel)
