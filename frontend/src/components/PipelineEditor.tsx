import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
  NodeTypes,
  EdgeTypes,
  useReactFlow
} from 'reactflow'
import 'reactflow/dist/style.css'
import { NodeType } from 'shared'
import NodeConfigPanel from './NodeConfigPanel'
import CustomNode from './CustomNode'
import CustomEdge from './CustomEdge'
import { useAppDispatch, useAppSelector } from '../store'
import { setNodes as setNodesAction, setEdges as setEdgesAction, updateNode as updateNodeAction, deleteNode as deleteNodeAction } from '../store/pipelineSlice'

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

const nodeTypes: NodeTypes = {
  custom: CustomNode
}

const edgeTypes: EdgeTypes = {
  custom: CustomEdge
}

const PipelineEditorContent: React.FC = () => {
  const dispatch = useAppDispatch()
  const { nodes: reduxNodes, edges: reduxEdges } = useAppSelector(state => state.pipeline)
  const selectedPipelineId = useAppSelector(state => state.pipeline.selectedPipeline?.id)
  const { setViewport } = useReactFlow()
  const previousPipelineIdRef = useRef<string | undefined>()

  const [nodes, setNodes, onReactFlowNodesChange] = useNodesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const [edges, setEdges, onReactFlowEdgesChange] = useEdgesState(
    reduxEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'custom',
      animated: true,
      style: { stroke: '#000', strokeWidth: 2, cursor: 'pointer' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#000'
      },
      data: {} as any
    }))
  )

  // エッジの変更をReduxに同期
  const onEdgesChange = useCallback((changes: any[]) => {
    onReactFlowEdgesChange(changes)

    // エッジの削除をReduxに反映
    setEdges((currentEdges) => {
      const hasRemoval = changes.some(change => change.type === 'remove')
      if (hasRemoval) {
        setTimeout(() => {
          const updatedEdges = currentEdges.filter(edge =>
            !changes.some(change => change.type === 'remove' && change.id === edge.id)
          )
          dispatch(setEdgesAction(
            updatedEdges.map(e => ({
              id: e.id,
              source: e.source,
              target: e.target
            }))
          ))
        }, 0)
      }
      return currentEdges
    })
  }, [onReactFlowEdgesChange, setEdges, dispatch])

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => {
      const newEdges = eds.filter(e => e.id !== edgeId)

      // Reduxに変更を反映
      dispatch(setEdgesAction(
        newEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target
        }))
      ))

      return newEdges
    })
  }, [setEdges, dispatch])

  const deleteNode = useCallback((nodeId: string) => {
    // データソースノードは削除できない
    const nodeToDelete = reduxNodes.find(n => n.id === nodeId)
    if (nodeToDelete?.type === 'dataSource') {
      alert('データソースノードは削除できません')
      return
    }

    setNodes((nds) => nds.filter(n => n.id !== nodeId))
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId))

    dispatch(deleteNodeAction(nodeId))

    // 削除したノードが選択されていた場合、選択を解除
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
    }
  }, [reduxNodes, setNodes, setEdges, dispatch, selectedNode])

  // reduxNodesが変更されたときに内部stateを更新
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setNodes(reduxNodes.map(n => ({
      id: n.id,
      type: 'custom',
      position: n.position || { x: 0, y: 0 },
      data: {
        label: n.label,
        nodeType: n.type,
        config: n.config,
        onDelete: deleteNode,
        isDeletable: n.type !== 'dataSource'
      },
      className: 'group',
      style: {
        background: nodeTypeColors[n.type],
        color: 'white',
        border: '1px solid #222',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: '13px'
      }
    })))
  }, [reduxNodes, setNodes])

  // reduxEdgesが変更されたときに内部stateを更新
  useEffect(() => {
    setEdges(reduxEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'custom',
      animated: true,
      style: { stroke: '#000', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#000'
      },
      data: {
        onDelete: deleteEdge
      }
    })))
  }, [reduxEdges, setEdges, deleteEdge])

  // 初期ビューポートを計算
  const initialViewport = useMemo(() => {
    const dataSourceNode = reduxNodes.find(n => n.type === 'dataSource')
    if (dataSourceNode && dataSourceNode.position) {
      const targetScreenX = 30
      const targetScreenY = 30
      const zoom = 1
      return {
        x: targetScreenX - dataSourceNode.position.x * zoom,
        y: targetScreenY - dataSourceNode.position.y * zoom,
        zoom: zoom
      }
    }
    return { x: 0, y: 0, zoom: 1 }
  }, [reduxNodes])

  // パイプラインが切り替わったときにビューポイントをリセット
  useEffect(() => {
    if (selectedPipelineId !== previousPipelineIdRef.current) {
      previousPipelineIdRef.current = selectedPipelineId

      // パイプラインが切り替わったときにビューポイントをリセット
      if (selectedPipelineId && reduxNodes.length > 0) {
        setViewport(initialViewport, { duration: 0 })
      }
    }
  }, [selectedPipelineId, initialViewport, setViewport, reduxNodes.length])

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const newEdges = addEdge({
        ...params,
        type: 'custom',
        animated: true,
        style: { stroke: '#000', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#000'
        },
        data: {
          onDelete: deleteEdge
        }
      }, edges)

      setEdges(newEdges)

      // Reduxに変更を反映
      dispatch(setEdgesAction(
        newEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target
        }))
      ))
    },
    [edges, setEdges, dispatch, deleteEdge]
  )

  // ノードのドラッグが終了したときにReduxに通知
  const onNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node) => {
    dispatch(setNodesAction(
      nodes.map(n => ({
        id: n.id,
        type: n.data.nodeType,
        label: n.data.label,
        config: n.data.config,
        position: n.position
      }))
    ))
  }, [nodes, dispatch])

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    // キャンバスをクリックした時はノードの選択を解除
    setSelectedNode(null)
  }, [])

  const updateNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map(n =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config } }
          : n
      )
    )

    dispatch(updateNodeAction({ id: nodeId, updates: { config } }))
  }, [setNodes, dispatch])

  const updateNode = useCallback((nodeId: string, updates: { nodeType?: NodeType, label?: string, config?: any }) => {
    setNodes((nds) => {
      const newNodes = nds.map(n => {
        if (n.id === nodeId) {
          const newNodeType = updates.nodeType || n.data.nodeType
          const newLabel = updates.label !== undefined ? updates.label : n.data.label
          const newConfig = updates.config !== undefined ? updates.config : n.data.config

          // Update style if nodeType changed
          const newStyle = updates.nodeType ? {
            background: nodeTypeColors[updates.nodeType],
            color: 'white',
            border: '1px solid #222',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: '13px'
          } : n.style

          return {
            ...n,
            data: {
              ...n.data,
              nodeType: newNodeType,
              label: newLabel,
              config: newConfig
            },
            style: newStyle
          }
        }
        return n
      })

      // Update selectedNode if it was modified
      const updatedNode = newNodes.find(n => n.id === nodeId)
      if (updatedNode && selectedNode?.id === nodeId) {
        setSelectedNode(updatedNode)
      }

      return newNodes
    })

    dispatch(updateNodeAction({
      id: nodeId,
      updates: {
        ...(updates.nodeType && { type: updates.nodeType }),
        ...(updates.label !== undefined && { label: updates.label }),
        ...(updates.config !== undefined && { config: updates.config })
      }
    }))
  }, [setNodes, dispatch, selectedNode])

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 bg-white rounded-lg shadow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onReactFlowNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          defaultViewport={initialViewport}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable={true}
          nodesDraggable={true}
          elementsSelectable={true}
          deleteKeyCode="Delete"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="flex-shrink-0 w-80 bg-white rounded-lg shadow p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              ノード設定
            </h3>
            <div className="flex gap-2">
              {selectedNode.data.nodeType !== 'dataSource' && (
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="text-red-600 hover:text-red-700 px-2 py-1 text-sm"
                  title="ノードを削除"
                >
                  削除
                </button>
              )}
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
          <NodeConfigPanel
            node={selectedNode}
            nodes={nodes}
            edges={edges}
            onConfigChange={(config) => updateNodeConfig(selectedNode.id, config)}
            onNodeUpdate={(updates) => updateNode(selectedNode.id, updates)}
          />
        </div>
      )}
    </div>
  )
}

// propsがないため、常に再レンダリングをスキップ
const PipelineEditor = React.memo(PipelineEditorContent, () => true)

PipelineEditor.displayName = 'PipelineEditor'

export default PipelineEditor
