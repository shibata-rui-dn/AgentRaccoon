import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAppSelector } from '../store'
import { Pipeline } from 'shared'

interface PipelineListProps {
  onSelectPipeline: (id: string) => void
  onDeletePipeline: (id: string) => void
  onCreateNew: () => void
}

interface PipelineCardProps {
  pipeline: Pipeline
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

// 個別のカードコンポーネント - 選択状態が変わったときのみ再レンダリング
const PipelineCard: React.FC<PipelineCardProps> = React.memo(({
  pipeline,
  isSelected,
  onSelect,
  onDelete
}) => {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <CardHeader
        className="p-3"
        onClick={() => onSelect(pipeline.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-2 min-w-0">
            <CardTitle className="text-base truncate">{pipeline.name}</CardTitle>
            {pipeline.description && (
              <CardDescription className="text-sm mt-1 line-clamp-2">
                {pipeline.description}
              </CardDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(pipeline.id)
            }}
            className="h-8 w-8 flex-shrink-0"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  )
}, (prevProps, nextProps) => {
  // pipelineの内容とisSelectedが変わらなければ再レンダリングをスキップ
  return prevProps.pipeline.id === nextProps.pipeline.id &&
         prevProps.pipeline.name === nextProps.pipeline.name &&
         prevProps.pipeline.description === nextProps.pipeline.description &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.onSelect === nextProps.onSelect &&
         prevProps.onDelete === nextProps.onDelete
})

PipelineCard.displayName = 'PipelineCard'

// ヘッダー部分を別コンポーネントに分離 - onCreateNewが変わらない限り再レンダリングされない
const PipelineListHeader: React.FC<{ onCreateNew: () => void }> = React.memo(({ onCreateNew }) => {
  return (
    <>
      <div className="p-3">
        <Button onClick={onCreateNew} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          パイプラインを作成する
        </Button>
      </div>
      <div className="px-0.2 pb-0.2">
        <div className="border-b mx-auto w-23/24" />
      </div>
    </>
  )
}, (prevProps, nextProps) => {
  return prevProps.onCreateNew === nextProps.onCreateNew
})

PipelineListHeader.displayName = 'PipelineListHeader'

const PipelineList: React.FC<PipelineListProps> = React.memo(({
  onSelectPipeline,
  onDeletePipeline,
  onCreateNew
}) => {
  const pipelines = useAppSelector(state => state.pipeline.pipelines)
  const selectedPipelineId = useAppSelector(state => state.pipeline.selectedPipeline?.id)

  return (
    <div className="w-64 border-r bg-card flex flex-col">
      <PipelineListHeader onCreateNew={onCreateNew} />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {pipelines.map(pipeline => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              isSelected={selectedPipelineId === pipeline.id}
              onSelect={onSelectPipeline}
              onDelete={onDeletePipeline}
            />
          ))}

          {pipelines.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>パイプラインがありません</p>
              <p className="text-sm">新規作成してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

PipelineList.displayName = 'PipelineList'

export default PipelineList
