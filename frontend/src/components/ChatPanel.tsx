import React, { useState, useEffect } from 'react'
import { Send, Loader2, CheckCircle, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppSelector, useAppDispatch } from '../store'
import { fetchPipeline } from '../store/pipelineSlice'
import { pipelineBuilderApi } from '../services/pipelineBuilderApi'
import { PipelineBuilderStep } from 'shared'

interface Message {
  role: 'user' | 'assistant'
  content: string
  steps?: PipelineBuilderStep[]
  isSuccess?: boolean
}

const initialMessage: Message = {
  role: 'assistant',
  content: 'パイプラインの自動生成をサポートします。「売上データを月別に集計して棒グラフで表示」のようにリクエストしてください。'
}

const ChatPanelComponent: React.FC = () => {
  const dispatch = useAppDispatch()
  const [chatMessages, setChatMessages] = useState<Message[]>([initialMessage])
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const selectedPipeline = useAppSelector(state => state.pipeline.selectedPipeline)
  const nodes = useAppSelector(state => state.pipeline.nodes)
  const edges = useAppSelector(state => state.pipeline.edges)

  // パイプラインが変更されたらチャット履歴をリセット
  useEffect(() => {
    setChatMessages([initialMessage])
    setChatInput('')
    setIsLoading(false)
  }, [selectedPipeline?.id])

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isLoading) return

    if (!selectedPipeline) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'パイプラインを選択してください。'
      }])
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: chatInput
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsLoading(true)

    try {
      const response = await pipelineBuilderApi.buildPipeline({
        userRequest: chatInput,
        existingPipelineId: selectedPipeline.id,
        existingPipelineName: selectedPipeline.name,
        existingPipelineDescription: selectedPipeline.description,
        existingNodes: nodes,
        existingEdges: edges
      })

      if (response.success) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: response.message || 'パイプラインを更新しました。',
          steps: response.steps,
          isSuccess: true
        }])

        // 現在のパイプラインを再取得して表示を更新
        if (selectedPipeline) {
          await dispatch(fetchPipeline(selectedPipeline.id)).unwrap()
        }
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `エラー: ${response.error || '不明なエラー'}`,
          isSuccess: false
        }])
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        isSuccess: false
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 min-w-96 border-l pl-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <h4 className="text-sm font-semibold">AI パイプライン生成</h4>
      </div>
      <div className="flex-1 border rounded-md p-2 mb-2 overflow-y-auto max-h-[180px] min-h-[180px] bg-muted/10">
        <div className="space-y-2">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "text-xs p-2 rounded",
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-8'
                  : 'bg-muted mr-8'
              )}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Steps display */}
              {msg.steps && msg.steps.length > 0 && (
                <div className="mt-2 space-y-1 text-xs border-t pt-2 border-border/50">
                  {msg.steps.map((step, stepIdx) => (
                    <div key={stepIdx} className="flex items-start gap-1.5">
                      {step.action === 'complete' ? (
                        <CheckCircle size={12} className="text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                          {stepIdx + 1}
                        </div>
                      )}
                      <span className="flex-1 leading-tight">{step.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs bg-muted p-2 rounded mr-8">
              <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
              <span>パイプラインを生成中...</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendChatMessage()
            }
          }}
          placeholder="例: 月別の売上を棒グラフで表示"
          className="text-sm"
          disabled={isLoading || !selectedPipeline}
        />
        <Button onClick={sendChatMessage} size="sm" disabled={isLoading || !selectedPipeline}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {!selectedPipeline && (
        <p className="text-xs text-muted-foreground mt-1">
          パイプラインを選択してください
        </p>
      )}
    </div>
  )
}

// propsがないため、常に再レンダリングをスキップ
const ChatPanel = React.memo(ChatPanelComponent, () => true)

ChatPanel.displayName = 'ChatPanel'

export default ChatPanel
