import React, { useState, useEffect, useCallback } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { shallowEqual } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppDispatch, useAppSelector } from '../store'
import { updatePipeline, fetchPipelines, savePipelineChanges } from '../store/pipelineSlice'
import { selectSelectedPipelineMetadata } from '../store/selectors'
import { store } from '../store'
import { pipelineApi } from '../services/pipelineApi'

const PipelineHeaderComponent: React.FC = () => {
  const dispatch = useAppDispatch()
  // メモ化されたセレクターを使用 + shallowEqualで中身を比較
  // name/descriptionが変わらない限り、再レンダリングされない
  const selectedPipeline = useAppSelector(selectSelectedPipelineMetadata, shallowEqual)

  const [pipelineName, setPipelineName] = useState('')
  const [description, setDescription] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    if (selectedPipeline) {
      setPipelineName(selectedPipeline.name)
      setDescription(selectedPipeline.description || '')
    }
  }, [selectedPipeline])

  const executePipeline = useCallback(async () => {
    const currentPipeline = store.getState().pipeline.selectedPipeline
    if (!currentPipeline) return

    setIsExecuting(true)

    try {
      await dispatch(savePipelineChanges()).unwrap()
      const result = await pipelineApi.executePipeline(currentPipeline.id)

      // カスタムイベントで結果を通知
      window.dispatchEvent(new CustomEvent('pipelineExecutionComplete', {
        detail: result
      }))
    } catch (error) {
      console.error('Failed to execute pipeline:', error)
      window.dispatchEvent(new CustomEvent('pipelineExecutionError', {
        detail: error
      }))
    } finally {
      setIsExecuting(false)
    }
  }, [dispatch])

  const updatePipelineName = async () => {
    if (!selectedPipeline) return
    if (!pipelineName.trim() || pipelineName === selectedPipeline.name) return

    try {
      await dispatch(updatePipeline({
        id: selectedPipeline.id,
        updates: { name: pipelineName }
      })).unwrap()
      dispatch(fetchPipelines())
    } catch (error) {
      console.error('Failed to update pipeline name:', error)
    }
  }

  const updateDescription = async () => {
    if (!selectedPipeline) return
    if (description === (selectedPipeline.description || '')) return

    try {
      await dispatch(updatePipeline({
        id: selectedPipeline.id,
        updates: { description: description }
      })).unwrap()
      dispatch(fetchPipelines())
    } catch (error) {
      console.error('Failed to update description:', error)
    }
  }

  if (!selectedPipeline) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Input
          value={pipelineName}
          onChange={(e) => setPipelineName(e.target.value)}
          onBlur={updatePipelineName}
          className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 w-8/12"
        />
        <div className="flex gap-2">
          <Button onClick={executePipeline} disabled={isExecuting} size="sm">
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                実行中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                実行
              </>
            )}
          </Button>
        </div>
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={updateDescription}
        placeholder="パイプラインの説明を入力..."
        className="min-h-[60px] resize-none text-sm"
      />
    </div>
  )
}

// propsがないため、常に再レンダリングをスキップ
const PipelineHeader = React.memo(PipelineHeaderComponent, () => true)

PipelineHeader.displayName = 'PipelineHeader'

export default PipelineHeader
