import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { PipelineExecutionResult, VisualizationData, LeafNodeResult } from 'shared'
import { CheckCircle2, XCircle } from 'lucide-react'
import { ReactFlowProvider } from 'reactflow'
import PipelineEditor from '../components/PipelineEditor'
import PipelineList from '../components/PipelineList'
import PipelineHeader from '../components/PipelineHeader'
import NodeAddButtons from '../components/NodeAddButtons'
import ChatPanel from '../components/ChatPanel'
import AutoSaveManager from '../components/AutoSaveManager'
import DataVisualization from '../components/DataVisualization'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationFirst,
  PaginationLast,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { useAppDispatch, useAppSelector } from '../store'
import { store } from '../store'
import {
  fetchPipelines,
  fetchPipeline,
  createPipeline,
  deletePipeline,
  setAutoSaveEnabled
} from '../store/pipelineSlice'

const Pipeline: React.FC = () => {
  const { id: urlPipelineId } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  // selectedPipeline全体ではなく、idのみを購読
  const selectedPipelineId = useAppSelector(state => state.pipeline.selectedPipeline?.id)

  const [isCreating, setIsCreating] = useState(false)
  const [newPipelineName, setNewPipelineName] = useState('')
  const [executionResult, setExecutionResult] = useState<PipelineExecutionResult | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    dispatch(fetchPipelines())
  }, [dispatch])

  // URLパラメータからパイプラインIDを取得して自動ロード
  useEffect(() => {
    if (urlPipelineId) {
      dispatch(fetchPipeline(urlPipelineId))
    }
  }, [urlPipelineId, dispatch])

  // カスタムイベントリスナーで実行結果を受け取る
  useEffect(() => {
    const handleExecutionComplete = (event: Event) => {
      const customEvent = event as CustomEvent<PipelineExecutionResult>
      const result = customEvent.detail
      setExecutionResult(result)
      // デフォルトで最初のタブを選択
      if (result.leafResults && result.leafResults.length > 0) {
        setSelectedTabId(result.leafResults[0].nodeId)
      }
      setCurrentPage(1) // ページをリセット
      setShowResultDialog(true)
    }

    const handleExecutionError = (event: Event) => {
      const customEvent = event as CustomEvent<Error>
      console.error('Pipeline execution error:', customEvent.detail)
    }

    window.addEventListener('pipelineExecutionComplete', handleExecutionComplete)
    window.addEventListener('pipelineExecutionError', handleExecutionError)

    return () => {
      window.removeEventListener('pipelineExecutionComplete', handleExecutionComplete)
      window.removeEventListener('pipelineExecutionError', handleExecutionError)
    }
  }, [])

  // タブ変更時にページをリセット
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTabId])

  const createNewPipeline = useCallback(async () => {
    if (!newPipelineName.trim()) {
      return
    }

    try {
      await dispatch(createPipeline({
        name: newPipelineName,
        description: ''
      })).unwrap()

      setIsCreating(false)
      setNewPipelineName('')

      // 次のフレームで自動保存を有効化
      setTimeout(() => {
        dispatch(setAutoSaveEnabled(true))
      }, 100)
    } catch (error) {
      console.error('Failed to create pipeline:', error)
    }
  }, [newPipelineName, dispatch])

  const selectPipeline = useCallback(async (pipelineId: string) => {
    dispatch(setAutoSaveEnabled(false))

    try {
      await dispatch(fetchPipeline(pipelineId)).unwrap()

      // 次のフレームで自動保存を有効化
      setTimeout(() => {
        dispatch(setAutoSaveEnabled(true))
      }, 100)
    } catch (error) {
      console.error('Failed to load pipeline:', error)
    }
  }, [dispatch])

  const handleDeletePipeline = useCallback(async (id: string) => {
    if (!confirm('本当にこのパイプラインを削除しますか？')) return

    try {
      await dispatch(deletePipeline(id)).unwrap()
      setExecutionResult(null)
    } catch (error) {
      console.error('Failed to delete pipeline:', error)
    }
  }, [dispatch])

  const handleCreateNew = useCallback(() => {
    setIsCreating(true)
  }, [])

  const getVisualizationData = (leafResult: LeafNodeResult): VisualizationData | null => {
    if (!executionResult || executionResult.status !== 'success') return null

    // 可視化ノードの場合のみ可視化データを返す
    if (leafResult.nodeType !== 'visualization') return null

    // storeから直接取得することで、Pipeline.tsxがnodesを購読しないようにする
    const state = store.getState().pipeline
    const nodes = state.nodes
    const visNode = nodes.find(n => n.id === leafResult.nodeId)
    if (!visNode) return null

    const chartType = visNode.config.chartType || 'bar'
    const xAxis = visNode.config.xAxis
    const yAxis = visNode.config.yAxis
    const nameKey = visNode.config.nameKey
    const valueKey = visNode.config.valueKey
    const pieColumn = visNode.config.pieColumn
    const pieSortBy = visNode.config.pieSortBy || 'frequency'

    return {
      type: chartType,
      data: leafResult.data,
      config: {
        xKey: xAxis,
        yKeys: Array.isArray(yAxis) ? yAxis : yAxis ? [yAxis] : [],
        nameKey: nameKey,
        valueKey: valueKey,
        pieColumn: pieColumn,
        pieSortBy: pieSortBy,
        title: leafResult.nodeLabel
      }
    }
  }

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    if (totalPages <= 1) return null

    const maxPages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2))
    let endPage = Math.min(totalPages, startPage + maxPages - 1)

    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1)
    }

    const pageNumbers = []
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationFirst
              onClick={() => setCurrentPage(1)}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage(currentPage - 1)}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>

          {startPage > 1 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {pageNumbers.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => setCurrentPage(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {endPage < totalPages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(currentPage + 1)}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLast
              onClick={() => setCurrentPage(totalPages)}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  return (
    <div className="w-full h-full flex">
      {/* 自動保存マネージャー */}
      <AutoSaveManager />

      {/* Left Panel - Pipeline List */}
      <PipelineList
        onSelectPipeline={selectPipeline}
        onDeletePipeline={handleDeletePipeline}
        onCreateNew={handleCreateNew}
      />

      {/* Right Panel - Pipeline Editor */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedPipelineId ? (
          <ReactFlowProvider>
            <div className="p-3 border-b bg-card">
              <div className="flex gap-4">
                {/* Left Section - Pipeline Info & Node Add */}
                <div className="w-80 flex flex-col gap-5">
                  <PipelineHeader />
                  <NodeAddButtons />
                </div>

                {/* Right Section - Chat */}
                <div className="flex-1">
                  <ChatPanel />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <PipelineEditor />
            </div>
          </ReactFlowProvider>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">パイプラインを選択するか、</p>
              <p className="text-lg">新規作成してください</p>
            </div>
          </div>
        )}
      </div>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader className="flex-shrink-0 hidden">
            <DialogTitle className="text-xl">実行結果</DialogTitle>
          </DialogHeader>
          {executionResult && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {executionResult.status === 'success' ? (
                <>
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border rounded-md bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-800">
                      実行成功 · {executionResult.executionTime}ms
                      {executionResult.leafResults && executionResult.leafResults.length > 0
                        ? ` · ${executionResult.leafResults.length} 個の出力ノード`
                        : ` · ${executionResult.data?.length || 0} 件のデータ`}
                    </p>
                  </div>

                  {executionResult.leafResults && executionResult.leafResults.length > 0 && selectedTabId ? (
                    <Tabs value={selectedTabId} onValueChange={setSelectedTabId} className="flex-1 flex flex-col min-h-0">
                      <TabsList className="flex-shrink-0 grid w-full" style={{ gridTemplateColumns: `repeat(${executionResult.leafResults.length}, 1fr)` }}>
                        {executionResult.leafResults.map((leaf) => (
                          <TabsTrigger key={leaf.nodeId} value={leaf.nodeId} className="text-sm">
                            {leaf.nodeLabel}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {(() => {
                        const selectedLeaf = executionResult.leafResults.find(leaf => leaf.nodeId === selectedTabId)
                        if (!selectedLeaf) return null

                        const visData = getVisualizationData(selectedLeaf)
                        const columns = selectedLeaf.data.length > 0 ? Object.keys(selectedLeaf.data[0]) : []

                        return (
                          <div className="flex-1 flex flex-col min-h-0 mt-4">
                            {visData ? (
                              <div className="border rounded-lg p-4 bg-card">
                                <DataVisualization visualization={visData} />
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
                                  <div>
                                    <h3 className="text-lg font-medium text-gray-900">詳細</h3>
                                    <p className="text-sm text-gray-600">
                                      {selectedLeaf.data.length.toLocaleString()} 件のレコード • {columns.length} 列
                                    </p>
                                  </div>
                                  <div className="flex-shrink-0">
                                    {renderPagination(selectedLeaf.data.length)}
                                  </div>
                                </div>
                                <div className="flex-1 overflow-x-auto min-h-0">
                                  <div className="overflow-y-auto h-full">
                                    <Table>
                                      <TableHeader className="sticky top-0 bg-muted z-10">
                                        <TableRow>
                                          {columns.map((column) => (
                                            <TableHead key={column} className="font-semibold">
                                              {column}
                                            </TableHead>
                                          ))}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedLeaf.data.length > 0 ? (
                                          selectedLeaf.data
                                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                            .map((row, index) => (
                                              <TableRow key={index}>
                                                {columns.map((column) => (
                                                  <TableCell key={column} className="whitespace-nowrap">
                                                    {row[column] !== null && row[column] !== undefined ? String(row[column]) : '-'}
                                                  </TableCell>
                                                ))}
                                              </TableRow>
                                            ))
                                        ) : (
                                          <TableRow>
                                            <TableCell colSpan={columns.length} className="h-32 text-center text-gray-500">
                                              データがありません
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </Tabs>
                  ) : null}
                </>
              ) : (
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-destructive/5 border-destructive">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-destructive">実行エラー</p>
                    <p className="text-sm text-destructive/80">
                      {executionResult.error}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいパイプラインを作成</DialogTitle>
            <DialogDescription>
              パイプライン名を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="パイプライン名"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createNewPipeline()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreating(false)
              setNewPipelineName('')
            }}>
              キャンセル
            </Button>
            <Button onClick={createNewPipeline} disabled={!newPipelineName.trim()}>
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Pipeline
