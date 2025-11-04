import React, { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BarChart3, LineChart, ScatterChart, PieChart, Table as TableIcon } from 'lucide-react'
import { GridElement, LeafNodeData } from '../store/dashboardSlice'
import { Pipeline } from 'shared'

type ElementType = 'bar' | 'line' | 'scatter' | 'pie' | 'table'

interface ElementConfigPanelProps {
  selectedElement: GridElement | null
  pipelines: Pipeline[]
  availableLeafNodes: Record<string, LeafNodeData[]>
  onUpdateElementName: (elementId: string, name: string) => void
  onSelectElementType: (elementId: string, type: ElementType) => void
  onSelectPipeline: (elementId: string, pipelineId: string) => void
  onSelectLeafNode: (elementId: string, leafNodeId: string) => void
}

// 位置とサイズを表示するコンポーネント（これだけは毎回更新される）
const ElementPositionDisplay: React.FC<{ x: number; y: number; width: number; height: number }> = memo(({ x, y, width, height }) => {
  return (
    <>
      位置: ({x}, {y})
      <br />
      サイズ: {width} × {height}
    </>
  )
})

// 要素設定の本体（名前、タイプ、パイプライン選択など）
const ElementConfigContent: React.FC<{
  selectedElement: GridElement
  pipelines: Pipeline[]
  availableLeafNodes: Record<string, LeafNodeData[]>
  onUpdateElementName: (elementId: string, name: string) => void
  onSelectElementType: (elementId: string, type: ElementType) => void
  onSelectPipeline: (elementId: string, pipelineId: string) => void
  onSelectLeafNode: (elementId: string, leafNodeId: string) => void
}> = memo(({
  selectedElement,
  pipelines,
  availableLeafNodes,
  onUpdateElementName,
  onSelectElementType,
  onSelectPipeline,
  onSelectLeafNode
}) => {
  return (
    <>
      {/* Element Name */}
      <div className="space-y-2">
        <Label>要素名</Label>
        <Input
          value={selectedElement.name}
          onChange={(e) => onUpdateElementName(selectedElement.id, e.target.value)}
          placeholder="要素名を入力"
          className="text-sm"
        />
      </div>

      {/* Element Type Selection */}
      <div className="space-y-2">
        <Label>要素タイプ</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={selectedElement.type === 'bar' ? 'default' : 'outline'}
            className="flex flex-col items-center py-3 h-auto"
            onClick={() => onSelectElementType(selectedElement.id, 'bar')}
          >
            <BarChart3 className="h-6 w-6 mb-1" />
            <span className="text-xs">棒グラフ</span>
          </Button>
          <Button
            variant={selectedElement.type === 'line' ? 'default' : 'outline'}
            className="flex flex-col items-center py-3 h-auto"
            onClick={() => onSelectElementType(selectedElement.id, 'line')}
          >
            <LineChart className="h-6 w-6 mb-1" />
            <span className="text-xs">折れ線</span>
          </Button>
          <Button
            variant={selectedElement.type === 'scatter' ? 'default' : 'outline'}
            className="flex flex-col items-center py-3 h-auto"
            onClick={() => onSelectElementType(selectedElement.id, 'scatter')}
          >
            <ScatterChart className="h-6 w-6 mb-1" />
            <span className="text-xs">散布図</span>
          </Button>
          <Button
            variant={selectedElement.type === 'pie' ? 'default' : 'outline'}
            className="flex flex-col items-center py-3 h-auto"
            onClick={() => onSelectElementType(selectedElement.id, 'pie')}
          >
            <PieChart className="h-6 w-6 mb-1" />
            <span className="text-xs">円グラフ</span>
          </Button>
          <Button
            variant={selectedElement.type === 'table' ? 'default' : 'outline'}
            className="flex flex-col items-center py-3 h-auto"
            onClick={() => onSelectElementType(selectedElement.id, 'table')}
          >
            <TableIcon className="h-6 w-6 mb-1" />
            <span className="text-xs">テーブル</span>
          </Button>
        </div>
      </div>

      {/* Pipeline Selection */}
      {selectedElement.type && (
        <>
          <div className="space-y-2">
            <Label>パイプライン</Label>
            <Select value={selectedElement.pipelineId || ''} onValueChange={(pipelineId) => onSelectPipeline(selectedElement.id, pipelineId)}>
              <SelectTrigger>
                <SelectValue placeholder="パイプラインを選択" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Leaf Node Selection */}
          {selectedElement.pipelineId && availableLeafNodes[selectedElement.pipelineId] && (
            <div className="space-y-2">
              <Label>データソース</Label>
              <Select value={selectedElement.leafNodeId || ''} onValueChange={(leafNodeId) => onSelectLeafNode(selectedElement.id, leafNodeId)}>
                <SelectTrigger>
                  <SelectValue placeholder="ノードを選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableLeafNodes[selectedElement.pipelineId].map((leafNode) => (
                    <SelectItem key={leafNode.nodeId} value={leafNode.nodeId}>
                      {leafNode.nodeLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
    </>
  )
}, (prevProps, nextProps) => {
  // 名前、タイプ、パイプライン、リーフノードが変更されていない場合は再レンダリングしない
  // 位置やサイズの変更では再レンダリングされない
  // ハンドラー関数は常に安定しているので比較不要
  return (
    prevProps.selectedElement.id === nextProps.selectedElement.id &&
    prevProps.selectedElement.name === nextProps.selectedElement.name &&
    prevProps.selectedElement.type === nextProps.selectedElement.type &&
    prevProps.selectedElement.pipelineId === nextProps.selectedElement.pipelineId &&
    prevProps.selectedElement.leafNodeId === nextProps.selectedElement.leafNodeId &&
    prevProps.pipelines === nextProps.pipelines &&
    prevProps.availableLeafNodes === nextProps.availableLeafNodes &&
    prevProps.onUpdateElementName === nextProps.onUpdateElementName &&
    prevProps.onSelectElementType === nextProps.onSelectElementType &&
    prevProps.onSelectPipeline === nextProps.onSelectPipeline &&
    prevProps.onSelectLeafNode === nextProps.onSelectLeafNode
  )
})

const ElementConfigPanel: React.FC<ElementConfigPanelProps> = ({
  selectedElement,
  pipelines,
  availableLeafNodes,
  onUpdateElementName,
  onSelectElementType,
  onSelectPipeline,
  onSelectLeafNode
}) => {
  return (
    <div className="w-80 border-r p-4 overflow-y-auto bg-muted/10">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">要素設定</CardTitle>
          <CardDescription>
            {selectedElement ? (
              <ElementPositionDisplay
                x={selectedElement.x}
                y={selectedElement.y}
                width={selectedElement.width}
                height={selectedElement.height}
              />
            ) : (
              '要素を選択または作成してください'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedElement ? (
            <ElementConfigContent
              selectedElement={selectedElement}
              pipelines={pipelines}
              availableLeafNodes={availableLeafNodes}
              onUpdateElementName={onUpdateElementName}
              onSelectElementType={onSelectElementType}
              onSelectPipeline={onSelectPipeline}
              onSelectLeafNode={onSelectLeafNode}
            />
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              ダッシュボード領域でドラッグして
              <br />
              新しい要素を作成できます
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// メモ化により、selectedElement が null のとき、または props が変わらない限り再レンダリングを防止
export default memo(ElementConfigPanel, (prevProps, nextProps) => {
  // selectedElement が両方 null の場合は再レンダリング不要
  if (prevProps.selectedElement === null && nextProps.selectedElement === null) {
    return true
  }

  // どちらか一方だけが null の場合は再レンダリングが必要
  if (prevProps.selectedElement === null || nextProps.selectedElement === null) {
    return false
  }

  // 両方とも null でない場合、selectedElement の ID のみを比較
  // 位置・サイズの変更は ElementPositionDisplay で処理されるため、ここでは比較しない
  return (
    prevProps.selectedElement.id === nextProps.selectedElement.id &&
    prevProps.pipelines === nextProps.pipelines &&
    prevProps.availableLeafNodes === nextProps.availableLeafNodes &&
    prevProps.onUpdateElementName === nextProps.onUpdateElementName &&
    prevProps.onSelectElementType === nextProps.onSelectElementType &&
    prevProps.onSelectPipeline === nextProps.onSelectPipeline &&
    prevProps.onSelectLeafNode === nextProps.onSelectLeafNode
  )
})
