import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BarChart3, LineChart, ScatterChart, PieChart, Table as TableIcon, Trash2, GripVertical, Download, X, Save } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchPipelines } from '../store/pipelineSlice'
import { pipelineApi } from '../services/pipelineApi'
import { dashboardApi } from '../services/dashboardApi'
import { VisualizationData, Dashboard } from 'shared'
import DataVisualization from '../components/DataVisualization'
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

const GRID_CELL_SIZE = 20 // 各グリッドセルのサイズ（px）
const MIN_ELEMENT_WIDTH = 8 // 最小幅（グリッド数）
const MIN_ELEMENT_HEIGHT = 6 // 最小高さ（グリッド数）

type ElementType = 'bar' | 'line' | 'scatter' | 'pie' | 'table'

interface GridElement {
  id: string
  name: string
  type: ElementType | null
  x: number
  y: number
  width: number
  height: number
  pipelineId: string | null
  leafNodeId: string | null
  config?: any
}

interface LeafNodeData {
  nodeId: string
  nodeLabel: string
  nodeType: string
  data: any[]
}

const DashboardView: React.FC = () => {
  const dispatch = useAppDispatch()
  const pipelines = useAppSelector(state => state.pipeline.pipelines)

  const [elements, setElements] = useState<GridElement[]>([])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)
  const [availableLeafNodes, setAvailableLeafNodes] = useState<Record<string, LeafNodeData[]>>({})
  const [gridDimensions, setGridDimensions] = useState({ rows: 30, cols: 50 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizingElementId, setResizingElementId] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; elementX: number; elementY: number } | null>(null)
  const [elementCounter, setElementCounter] = useState(1)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null)
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showNewDashboardDialog, setShowNewDashboardDialog] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(null)
  const [editingDashboardName, setEditingDashboardName] = useState('')
  const [tablePagination, setTablePagination] = useState<Record<string, number>>({})

  useEffect(() => {
    dispatch(fetchPipelines())
  }, [dispatch])

  // グリッドサイズを動的に計算
  useEffect(() => {
    const updateGridSize = () => {
      const container = document.getElementById('grid-container')
      if (container) {
        const width = container.clientWidth
        const height = container.clientHeight
        const cols = Math.floor(width / GRID_CELL_SIZE)
        const rows = Math.floor(height / GRID_CELL_SIZE)
        setGridDimensions({ rows, cols })
      }
    }

    updateGridSize()
    window.addEventListener('resize', updateGridSize)
    return () => window.removeEventListener('resize', updateGridSize)
  }, [])

  const handleMouseDown = (x: number, y: number) => {
    // 既存の要素をクリックした場合はスキップ
    const clickedElement = elements.find(el =>
      x >= el.x && x < el.x + el.width &&
      y >= el.y && y < el.y + el.height
    )

    if (clickedElement) {
      setSelectedElementId(clickedElement.id)
      return
    }

    setIsDrawing(true)
    setDrawStart({ x, y })
    setDrawCurrent({ x, y })
    setSelectedElementId(null)
  }

  const handleMouseMove = (x: number, y: number) => {
    if (isDrawing && drawStart) {
      setDrawCurrent({ x, y })
    }
  }

  const handleMouseUp = () => {
    if (isDrawing && drawStart && drawCurrent) {
      // Check if dashboard exists
      if (!currentDashboard) {
        setIsDrawing(false)
        setDrawStart(null)
        setDrawCurrent(null)
        setShowNewDashboardDialog(true)
        return
      }

      const x1 = Math.min(drawStart.x, drawCurrent.x)
      const y1 = Math.min(drawStart.y, drawCurrent.y)
      const x2 = Math.max(drawStart.x, drawCurrent.x)
      const y2 = Math.max(drawStart.y, drawCurrent.y)

      const width = Math.max(MIN_ELEMENT_WIDTH, x2 - x1 + 1)
      const height = Math.max(MIN_ELEMENT_HEIGHT, y2 - y1 + 1)

      if (width >= MIN_ELEMENT_WIDTH && height >= MIN_ELEMENT_HEIGHT) {
        const newElement: GridElement = {
          id: `element_${Date.now()}`,
          name: `要素名${elementCounter}`,
          type: null,
          x: x1,
          y: y1,
          width,
          height,
          pipelineId: null,
          leafNodeId: null
        }
        setElements([...elements, newElement])
        setSelectedElementId(newElement.id)
        setElementCounter(elementCounter + 1)
      }
    }
    setIsDrawing(false)
    setDrawStart(null)
    setDrawCurrent(null)
  }

  const handleSelectElementType = (type: ElementType) => {
    if (!selectedElementId) return
    setElements(elements.map(el =>
      el.id === selectedElementId ? { ...el, type } : el
    ))
  }

  const handleSelectPipeline = async (pipelineId: string) => {
    if (!selectedElementId) return

    try {
      const result = await pipelineApi.executePipeline(pipelineId)

      if (result.status === 'success' && result.leafResults) {
        setAvailableLeafNodes({
          ...availableLeafNodes,
          [pipelineId]: result.leafResults
        })
      }

      setElements(elements.map(el =>
        el.id === selectedElementId
          ? { ...el, pipelineId, leafNodeId: null }
          : el
      ))
    } catch (err) {
      console.error('Failed to execute pipeline:', err)
    }
  }

  const handleSelectLeafNode = (leafNodeId: string) => {
    if (!selectedElementId) return
    setElements(elements.map(el =>
      el.id === selectedElementId ? { ...el, leafNodeId } : el
    ))
  }

  const handleChangeName = (elementId: string, newName: string) => {
    setElements(elements.map(el =>
      el.id === elementId ? { ...el, name: newName } : el
    ))
  }

  const handleDeleteElement = (elementId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setElements(elements.filter(el => el.id !== elementId))
    if (selectedElementId === elementId) {
      setSelectedElementId(null)
    }
  }

  const handleDownload = (elementId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    const element = elements.find(el => el.id === elementId)
    if (!element) return

    // データが存在するか確認
    if (!element.pipelineId || !element.leafNodeId) {
      alert('ダウンロードするデータがありません')
      return
    }

    const leafNodes = availableLeafNodes[element.pipelineId]
    if (!leafNodes) {
      alert('データを読み込み中です')
      return
    }

    const leafNode = leafNodes.find(ln => ln.nodeId === element.leafNodeId)
    if (!leafNode || !leafNode.data || leafNode.data.length === 0) {
      alert('ダウンロードするデータがありません')
      return
    }

    // データをExcelファイルとしてダウンロード
    try {
      const worksheet = XLSX.utils.json_to_sheet(leafNode.data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

      // ファイル名を要素名から生成
      const fileName = `${element.name}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error('Download error:', error)
      alert('ダウンロード中にエラーが発生しました')
    }
  }

  const saveDashboard = async () => {
    if (!currentDashboard || !hasUnsavedChanges) return

    setIsSaving(true)
    try {
      await dashboardApi.updateDashboard(currentDashboard.id, {
        elements
      })
      setHasUnsavedChanges(false)
      await loadDashboardList()
    } catch (error) {
      console.error('Save error:', error)
      alert('保存中にエラーが発生しました')
    } finally {
      setIsSaving(false)
    }
  }

  // Mark as having unsaved changes when elements change
  useEffect(() => {
    if (currentDashboard && elements.length >= 0) {
      setHasUnsavedChanges(true)
    }
  }, [elements])

  // Periodic save every 15 seconds
  useEffect(() => {
    if (!currentDashboard) return

    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        saveDashboard()
      }
    }, 15000) // Save every 15 seconds

    return () => clearInterval(interval)
  }, [currentDashboard, hasUnsavedChanges, elements])

  const loadDashboardList = async () => {
    try {
      const list = await dashboardApi.listDashboards()
      setDashboards(list)
    } catch (error) {
      console.error('Load list error:', error)
    }
  }

  const handleLoadDashboard = async (dashboardId: string) => {
    // Auto-save current dashboard before switching
    if (currentDashboard && hasUnsavedChanges) {
      await saveDashboard()
    }

    try {
      const dashboard = await dashboardApi.getDashboard(dashboardId)
      setCurrentDashboard(dashboard)
      setElements(dashboard.elements)
      setSelectedElementId(null)
      setHasUnsavedChanges(false)

      // Save to localStorage as last used
      localStorage.setItem('lastUsedDashboardId', dashboardId)

      // Reset element counter based on loaded elements
      const maxCounter = dashboard.elements.reduce((max, el) => {
        const match = el.name.match(/要素名(\d+)/)
        return match ? Math.max(max, parseInt(match[1])) : max
      }, 0)
      setElementCounter(maxCounter + 1)

      // Load pipeline data for all elements that have pipelineId
      const pipelineIds = new Set(
        dashboard.elements
          .filter(el => el.pipelineId)
          .map(el => el.pipelineId as string)
      )

      const newLeafNodes: Record<string, any[]> = {}
      for (const pipelineId of pipelineIds) {
        try {
          const result = await pipelineApi.executePipeline(pipelineId)
          if (result.status === 'success' && result.leafResults) {
            newLeafNodes[pipelineId] = result.leafResults
          }
        } catch (err) {
          console.error(`Failed to execute pipeline ${pipelineId}:`, err)
        }
      }
      setAvailableLeafNodes(newLeafNodes)
    } catch (error) {
      console.error('Load error:', error)
      alert('ダッシュボードの読み込み中にエラーが発生しました')
    }
  }

  const handleNewDashboard = () => {
    setNewDashboardName('')
    setShowNewDashboardDialog(true)
  }

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) {
      alert('ダッシュボード名を入力してください')
      return
    }

    try {
      const newDashboard = await dashboardApi.createDashboard({
        name: newDashboardName.trim(),
        elements: []
      })
      setCurrentDashboard(newDashboard)
      setElements([])
      setElementCounter(1)
      setSelectedElementId(null)
      setHasUnsavedChanges(false)

      // Save to localStorage as last used
      localStorage.setItem('lastUsedDashboardId', newDashboard.id)

      await loadDashboardList()
      setShowNewDashboardDialog(false)
      setNewDashboardName('')
    } catch (error) {
      console.error('Create error:', error)
      alert('ダッシュボードの作成中にエラーが発生しました')
    }
  }

  const handleDeleteDashboard = async (dashboardId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const dashboard = dashboards.find(d => d.id === dashboardId)
    if (!dashboard) return

    if (!confirm(`ダッシュボード「${dashboard.name}」を削除しますか？`)) return

    try {
      await dashboardApi.deleteDashboard(dashboardId)
      await loadDashboardList()

      // If deleted dashboard was current, switch to another or clear
      if (currentDashboard?.id === dashboardId) {
        const remainingDashboards = dashboards.filter(d => d.id !== dashboardId)
        if (remainingDashboards.length > 0) {
          handleLoadDashboard(remainingDashboards[0].id)
        } else {
          setCurrentDashboard(null)
          setElements([])
          setElementCounter(1)
          setSelectedElementId(null)
        }
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('ダッシュボードの削除中にエラーが発生しました')
    }
  }

  const handleStartEditDashboardName = (dashboardId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingDashboardId(dashboardId)
    setEditingDashboardName(currentName)
  }

  const handleRenameDashboard = async (dashboardId: string) => {
    if (!editingDashboardName.trim()) {
      alert('ダッシュボード名を入力してください')
      return
    }

    try {
      await dashboardApi.updateDashboard(dashboardId, {
        name: editingDashboardName.trim()
      })
      await loadDashboardList()

      // Update current dashboard name if it's the one being edited
      if (currentDashboard?.id === dashboardId) {
        setCurrentDashboard({
          ...currentDashboard,
          name: editingDashboardName.trim()
        })
      }

      setEditingDashboardId(null)
      setEditingDashboardName('')
    } catch (error) {
      console.error('Rename error:', error)
      alert('ダッシュボード名の変更中にエラーが発生しました')
    }
  }

  const handleCancelEditDashboardName = () => {
    setEditingDashboardId(null)
    setEditingDashboardName('')
  }

  // Load dashboard list and auto-open last used or first dashboard
  useEffect(() => {
    const loadAndAutoOpen = async () => {
      await loadDashboardList()
    }
    loadAndAutoOpen()
  }, [])

  // Auto-open dashboard after list is loaded
  useEffect(() => {
    if (dashboards.length > 0 && !currentDashboard) {
      // Try to load last used dashboard from localStorage
      const lastUsedId = localStorage.getItem('lastUsedDashboardId')

      if (lastUsedId && dashboards.some(d => d.id === lastUsedId)) {
        // Load last used dashboard if it exists
        handleLoadDashboard(lastUsedId)
      } else {
        // Load first dashboard
        handleLoadDashboard(dashboards[0].id)
      }
    }
  }, [dashboards, currentDashboard])

  // Auto-save on component unmount (when navigating away)
  useEffect(() => {
    return () => {
      // Save before unmounting if there are unsaved changes
      if (currentDashboard && hasUnsavedChanges) {
        // Use synchronous approach for cleanup
        const saveBeforeUnmount = async () => {
          try {
            await dashboardApi.updateDashboard(currentDashboard.id, {
              elements
            })
          } catch (error) {
            console.error('Failed to save on unmount:', error)
          }
        }
        saveBeforeUnmount()
      }
    }
  }, [currentDashboard, hasUnsavedChanges, elements])

  const handleResizeStart = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const element = elements.find(el => el.id === elementId)
    if (!element) return

    setIsResizing(true)
    setResizingElementId(elementId)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height
    })
  }

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizingElementId || !resizeStart) return

    const deltaX = Math.round((e.clientX - resizeStart.x) / GRID_CELL_SIZE)
    const deltaY = Math.round((e.clientY - resizeStart.y) / GRID_CELL_SIZE)

    const newWidth = Math.max(MIN_ELEMENT_WIDTH, resizeStart.width + deltaX)
    const newHeight = Math.max(MIN_ELEMENT_HEIGHT, resizeStart.height + deltaY)

    setElements(elements.map(el =>
      el.id === resizingElementId
        ? { ...el, width: newWidth, height: newHeight }
        : el
    ))
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
    setResizingElementId(null)
    setResizeStart(null)
  }

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)
      return () => {
        window.removeEventListener('mousemove', handleResizeMove)
        window.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, resizingElementId, resizeStart, elements])

  const handleDragStart = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const element = elements.find(el => el.id === elementId)
    if (!element) return

    setIsDragging(true)
    setDraggingElementId(elementId)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.x,
      elementY: element.y
    })
  }

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !draggingElementId || !dragStart) return

    const deltaX = Math.round((e.clientX - dragStart.x) / GRID_CELL_SIZE)
    const deltaY = Math.round((e.clientY - dragStart.y) / GRID_CELL_SIZE)

    const newX = Math.max(0, dragStart.elementX + deltaX)
    const newY = Math.max(0, dragStart.elementY + deltaY)

    setElements(elements.map(el =>
      el.id === draggingElementId
        ? { ...el, x: newX, y: newY }
        : el
    ))
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDraggingElementId(null)
    setDragStart(null)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [isDragging, draggingElementId, dragStart, elements])

  const selectedElement = elements.find(el => el.id === selectedElementId)

  const getDrawingRect = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return null

    const x1 = Math.min(drawStart.x, drawCurrent.x)
    const y1 = Math.min(drawStart.y, drawCurrent.y)
    const x2 = Math.max(drawStart.x, drawCurrent.x)
    const y2 = Math.max(drawStart.y, drawCurrent.y)

    return { x: x1, y: y1, width: x2 - x1 + 1, height: y2 - y1 + 1 }
  }

  const drawingRect = getDrawingRect()

  const getVisualizationForElement = (element: GridElement): VisualizationData | null => {
    if (!element.pipelineId || !element.leafNodeId || !element.type) return null
    if (element.type === 'table') return null // テーブルは別途レンダリング

    const leafNodes = availableLeafNodes[element.pipelineId]
    if (!leafNodes) return null

    const leafNode = leafNodes.find(ln => ln.nodeId === element.leafNodeId)
    if (!leafNode || !leafNode.data || leafNode.data.length === 0) return null

    const columns = Object.keys(leafNode.data[0])

    if (element.type === 'pie') {
      return {
        type: 'pie',
        data: leafNode.data,
        config: {
          pieColumn: columns[0],
          pieSortBy: 'frequency',
          nameKey: 'name',
          valueKey: 'value',
          title: leafNode.nodeLabel
        }
      }
    }

    return {
      type: element.type,
      data: leafNode.data,
      config: {
        xKey: columns[0],
        yKeys: columns.length > 1 ? [columns[1]] : [],
        title: leafNode.nodeLabel
      }
    }
  }

  const getElementTitle = (element: GridElement): string => {
    return element.name
  }

  const renderElementContent = (element: GridElement) => {
    if (!element.type) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p className="text-sm">要素タイプを選択</p>
        </div>
      )
    }

    if (!element.pipelineId || !element.leafNodeId) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p className="text-sm">データソースを選択</p>
        </div>
      )
    }

    const leafNodes = availableLeafNodes[element.pipelineId]
    if (!leafNodes) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p className="text-sm">データを読み込み中...</p>
        </div>
      )
    }

    const leafNode = leafNodes.find(ln => ln.nodeId === element.leafNodeId)
    if (!leafNode) return null

    if (element.type === 'table') {
      const columns = leafNode.data.length > 0 ? Object.keys(leafNode.data[0]) : []
      const ITEMS_PER_PAGE = 50
      const currentPage = tablePagination[element.id] || 1
      const totalPages = Math.ceil(leafNode.data.length / ITEMS_PER_PAGE)
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const paginatedData = leafNode.data.slice(startIndex, endIndex)

      const handlePageChange = (page: number) => {
        setTablePagination(prev => ({
          ...prev,
          [element.id]: page
        }))
      }

      const renderPagination = () => {
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
                  onClick={() => handlePageChange(1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
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
                    onClick={() => handlePageChange(page)}
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
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLast
                  onClick={() => handlePageChange(totalPages)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )
      }

      return (
        <div className="flex flex-col h-full bg-white rounded overflow-hidden">
          {/* Header with data info */}
          <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
            <p className="text-xs text-gray-600">
              {leafNode.data.length.toLocaleString()} 件のレコード • {columns.length} 列
            </p>
          </div>

          {/* Table content */}
          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-10">
                <TableRow>
                  {columns.map(col => (
                    <TableHead key={col} className="font-semibold text-xs">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, idx) => (
                    <TableRow key={startIndex + idx}>
                      {columns.map(col => (
                        <TableCell key={col} className="text-xs whitespace-nowrap">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-gray-500 text-xs">
                      データがありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-2 border-t border-gray-200 flex-shrink-0 flex justify-center">
              {renderPagination()}
            </div>
          )}
        </div>
      )
    }

    const visData = getVisualizationForElement(element)
    if (!visData) return null

    return (
      <div className="flex flex-col h-full p-2">
        <DataVisualization visualization={visData} />
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header - Browser Style Tabs */}
      <div className="bg-muted/30 border-b">
        <div className="flex items-end gap-px overflow-x-auto overflow-y-hidden px-2 pt-2">
          {/* Dashboard Tabs */}
          {dashboards.map((dashboard) => {
            const isActive = currentDashboard?.id === dashboard.id
            const isEditing = editingDashboardId === dashboard.id
            return (
              <div
                key={dashboard.id}
                className={`group relative flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-background border-t border-x border-border text-foreground'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
                style={{
                  marginBottom: isActive ? '-1px' : '0',
                }}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={editingDashboardName}
                    onChange={(e) => setEditingDashboardName(e.target.value)}
                    onBlur={() => handleRenameDashboard(dashboard.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameDashboard(dashboard.id)
                      } else if (e.key === 'Escape') {
                        handleCancelEditDashboardName()
                      }
                      e.stopPropagation()
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="font-medium bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 min-w-[100px]"
                  />
                ) : (
                  <span
                    className="font-medium cursor-text"
                    onClick={() => handleLoadDashboard(dashboard.id)}
                    onDoubleClick={(e) => handleStartEditDashboardName(dashboard.id, dashboard.name, e)}
                  >
                    {dashboard.name}
                  </span>
                )}
                {isActive && isSaving && (
                  <span className="text-xs text-muted-foreground">保存中...</span>
                )}
                {/* Close button */}
                {!isEditing && (
                  <button
                    onClick={(e) => handleDeleteDashboard(dashboard.id, e)}
                    className="ml-1 p-0.5 rounded hover:bg-muted-foreground/20 transition-colors opacity-0 group-hover:opacity-100"
                    title="閉じる"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })}

          {/* New Dashboard Button */}
          <button
            onClick={handleNewDashboard}
            className="flex items-center gap-1 px-3 py-2 rounded-t-lg text-sm bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            title="新規ダッシュボード"
          >
            <span className="text-lg leading-none">+</span>
          </button>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Save Button and Status */}
          {currentDashboard && (
            <div className="flex items-center gap-2 px-3 py-2 bg-background border-t border-x border-border rounded-t-lg" style={{ marginBottom: '-1px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveDashboard()}
                disabled={!hasUnsavedChanges || isSaving}
                className="h-7 px-2"
              >
                <Save className="h-3 w-3 mr-1" />
                保存
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Element Configuration (Always visible) */}
        <div className="w-80 border-r p-4 overflow-y-auto bg-muted/10">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">要素設定</CardTitle>
              <CardDescription>
                {selectedElement ? (
                  <>
                    位置: ({selectedElement.x}, {selectedElement.y})
                    <br />
                    サイズ: {selectedElement.width} × {selectedElement.height}
                  </>
                ) : (
                  '要素を選択または作成してください'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedElement ? (
                <>
                  {/* Element Name */}
                  <div className="space-y-2">
                    <Label>要素名</Label>
                    <Input
                      value={selectedElement.name}
                      onChange={(e) => handleChangeName(selectedElement.id, e.target.value)}
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
                        onClick={() => handleSelectElementType('bar')}
                      >
                        <BarChart3 className="h-6 w-6 mb-1" />
                        <span className="text-xs">棒グラフ</span>
                      </Button>
                      <Button
                        variant={selectedElement.type === 'line' ? 'default' : 'outline'}
                        className="flex flex-col items-center py-3 h-auto"
                        onClick={() => handleSelectElementType('line')}
                      >
                        <LineChart className="h-6 w-6 mb-1" />
                        <span className="text-xs">折れ線</span>
                      </Button>
                      <Button
                        variant={selectedElement.type === 'scatter' ? 'default' : 'outline'}
                        className="flex flex-col items-center py-3 h-auto"
                        onClick={() => handleSelectElementType('scatter')}
                      >
                        <ScatterChart className="h-6 w-6 mb-1" />
                        <span className="text-xs">散布図</span>
                      </Button>
                      <Button
                        variant={selectedElement.type === 'pie' ? 'default' : 'outline'}
                        className="flex flex-col items-center py-3 h-auto"
                        onClick={() => handleSelectElementType('pie')}
                      >
                        <PieChart className="h-6 w-6 mb-1" />
                        <span className="text-xs">円グラフ</span>
                      </Button>
                      <Button
                        variant={selectedElement.type === 'table' ? 'default' : 'outline'}
                        className="flex flex-col items-center py-3 h-auto"
                        onClick={() => handleSelectElementType('table')}
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
                        <Select value={selectedElement.pipelineId || ''} onValueChange={handleSelectPipeline}>
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
                          <Select value={selectedElement.leafNodeId || ''} onValueChange={handleSelectLeafNode}>
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

        {/* Right Panel - Grid Canvas */}
        <div id="grid-container" className="flex-1 bg-gray-50 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-white"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid cells for interaction */}
            {Array.from({ length: gridDimensions.rows }).map((_, row) => (
              <div key={row} className="flex">
                {Array.from({ length: gridDimensions.cols }).map((_, col) => (
                  <div
                    key={col}
                    style={{ width: `${GRID_CELL_SIZE}px`, height: `${GRID_CELL_SIZE}px` }}
                    className="hover:bg-blue-50 cursor-crosshair"
                    onMouseDown={() => handleMouseDown(col, row)}
                    onMouseMove={() => handleMouseMove(col, row)}
                  />
                ))}
              </div>
            ))}

            {/* Existing elements */}
            {elements.map(element => (
              <div
                key={element.id}
                className={`absolute border-2 transition-colors group flex flex-col ${
                  selectedElementId === element.id
                    ? 'border-blue-500 bg-white shadow-lg'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                style={{
                  left: `${element.x * GRID_CELL_SIZE}px`,
                  top: `${element.y * GRID_CELL_SIZE}px`,
                  width: `${element.width * GRID_CELL_SIZE}px`,
                  height: `${element.height * GRID_CELL_SIZE}px`
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedElementId(element.id)
                }}
              >
                {/* Element Header */}
                <div
                  className="flex items-center justify-between px-2 py-1 bg-gray-100 border-b border-gray-300 cursor-move"
                  onMouseDown={(e) => {
                    if (editingNameId !== element.id) {
                      handleDragStart(element.id, e)
                    }
                  }}
                >
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    {editingNameId === element.id ? (
                      <input
                        type="text"
                        value={element.name}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleChangeName(element.id, e.target.value)
                        }}
                        onBlur={() => setEditingNameId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingNameId(null)
                          }
                          e.stopPropagation()
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        autoFocus
                        className="text-xs font-medium text-gray-700 bg-white border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                      />
                    ) : (
                      <span
                        className="text-xs font-medium text-gray-700 truncate hover:bg-gray-200 px-1 rounded cursor-text"
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          setEditingNameId(element.id)
                        }}
                      >
                        {getElementTitle(element)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Download button */}
                    <button
                      onClick={(e) => handleDownload(element.id, e)}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-green-100 transition-colors"
                      title="ダウンロード"
                    >
                      <Download className="w-3 h-3 text-green-600" />
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteElement(element.id, e)}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Element Content */}
                <div className="flex-1 overflow-hidden relative">
                  {renderElementContent(element)}
                  {/* Resize handle */}
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => handleResizeStart(element.id, e)}
                  >
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-gray-400" />
                  </div>
                </div>
              </div>
            ))}

            {/* Drawing rectangle */}
            {drawingRect && (
              <div
                className="absolute border-2 border-dashed border-blue-400 bg-blue-50 bg-opacity-30 pointer-events-none"
                style={{
                  left: `${drawingRect.x * GRID_CELL_SIZE}px`,
                  top: `${drawingRect.y * GRID_CELL_SIZE}px`,
                  width: `${drawingRect.width * GRID_CELL_SIZE}px`,
                  height: `${drawingRect.height * GRID_CELL_SIZE}px`
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* New Dashboard Dialog */}
      {showNewDashboardDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowNewDashboardDialog(false)}
        >
          <Card className="w-96" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>新規ダッシュボード</CardTitle>
              <CardDescription>
                新しいダッシュボード名を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ダッシュボード名</Label>
                <Input
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="例: 売上分析ダッシュボード"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateDashboard()
                    } else if (e.key === 'Escape') {
                      setShowNewDashboardDialog(false)
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewDashboardDialog(false)}
                >
                  キャンセル
                </Button>
                <Button onClick={handleCreateDashboard}>
                  作成
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default DashboardView
