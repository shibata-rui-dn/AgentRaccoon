import React from 'react'
import { NodeType, PipelineNode } from 'shared'
import { Button } from '@/components/ui/button'
import { useReactFlow } from 'reactflow'
import { useAppDispatch } from '../store'
import { store } from '../store'
import { addNode as addNodeAction } from '../store/pipelineSlice'

// Browser-compatible random integer generator
const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const nodeTypeColors: Record<NodeType, string> = {
  dataSource: '#3b82f6',
  filter: '#10b981',
  transform: '#f59e0b',
  aggregate: '#8b5cf6',
  join: '#ec4899',
  visualization: '#06b6d4',
  custom: '#ef4444',
  dashboard: '#6366f1'
}

const nodeTypeLabels: Record<NodeType, string> = {
  dataSource: 'データソース',
  filter: 'フィルター',
  transform: '変換',
  aggregate: '集計',
  join: '結合',
  visualization: '可視化',
  custom: 'カスタム',
  dashboard: 'ダッシュボード'
}

// 既存のノードと重複しない一意の名前を生成する関数
const generateUniqueName = (baseName: string, existingNodes: PipelineNode[]): string => {
  const existingLabels = existingNodes.map(node => node.label)

  // ベース名がまだ使われていない場合はそのまま返す
  if (!existingLabels.includes(baseName)) {
    return baseName
  }

  // 番号を付与して一意の名前を生成
  let counter = 1
  let uniqueName = `${baseName}${counter}`

  while (existingLabels.includes(uniqueName)) {
    counter++
    uniqueName = `${baseName}${counter}`
  }

  return uniqueName
}

const NodeAddButtons: React.FC = React.memo(() => {
  const dispatch = useAppDispatch()
  const { screenToFlowPosition } = useReactFlow()

  const addNode = (type: NodeType) => {
    // ノード追加時にのみstoreから直接取得することで、不要な再レンダリングを防ぐ
    const existingNodes = store.getState().pipeline.nodes
    const baseName = nodeTypeLabels[type]
    const uniqueName = generateUniqueName(baseName, existingNodes)

    // ReactFlowのキャンバス要素を取得
    const reactFlowWrapper = document.querySelector('.react-flow')
    if (!reactFlowWrapper) {
      // フォールバック：要素が見つからない場合はデフォルト位置
      const newNode = {
        id: `node_${Date.now()}`,
        type: type,
        label: uniqueName,
        config: {},
        position: { x: 250, y: 250 }
      }
      dispatch(addNodeAction(newNode))
      return
    }

    // ReactFlowキャンバスの矩形情報を取得
    const rect = reactFlowWrapper.getBoundingClientRect()

    // ReactFlowキャンバスの中心付近のスクリーン座標
    const centerX = rect.left + rect.width / 2 + randomInt(-50, 50)
    const centerY = rect.top + rect.height / 2 + randomInt(-100, -50)

    // スクリーン座標をReactFlowの座標系に変換（自動的にバウンディングボックスを考慮）
    const position = screenToFlowPosition({ x: centerX, y: centerY })

    const newNode = {
      id: `node_${Date.now()}`,
      type: type,
      label: uniqueName,
      config: {},
      position: position
    }

    dispatch(addNodeAction(newNode))
  }

  return (
    <div className="border-t pt-3">
      <h4 className="text-sm font-semibold mb-2">ノードを追加する</h4>
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => addNode('dataSource')}
          size="sm"
          className="text-xs"
          style={{ background: nodeTypeColors.dataSource }}
        >
          データソース
        </Button>
        <Button
          onClick={() => addNode('filter')}
          size="sm"
          className="text-xs"
          style={{ background: nodeTypeColors.filter }}
        >
          フィルター
        </Button>
        <Button
          onClick={() => addNode('transform')}
          size="sm"
          className="text-xs"
          style={{ background: nodeTypeColors.transform }}
        >
          変換
        </Button>
        <Button
          onClick={() => addNode('aggregate')}
          size="sm"
          className="text-xs"
          style={{ background: nodeTypeColors.aggregate }}
        >
          集計
        </Button>
        <Button
          onClick={() => addNode('visualization')}
          size="sm"
          className="text-xs"
          style={{ background: nodeTypeColors.visualization }}
        >
          可視化
        </Button>
        <Button
          onClick={() => addNode('custom')}
          size="sm"
          className="text-xs"
          style={{ background: nodeTypeColors.custom }}
        >
          カスタム
        </Button>
        <Button
          onClick={() => addNode('dashboard')}
          size="sm"
          className="text-xs"
          style={{ background: nodeTypeColors.dashboard }}
        >
          ダッシュボード
        </Button>
      </div>
    </div>
  )
})

NodeAddButtons.displayName = 'NodeAddButtons'

export default NodeAddButtons
