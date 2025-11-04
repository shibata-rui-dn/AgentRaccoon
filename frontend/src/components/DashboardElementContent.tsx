import React, { memo } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { setTablePage } from '../store/dashboardSlice'
import { selectAvailableLeafNodes, selectTablePageForElement } from '../store/selectors'
import { GridElement, LeafNodeData } from '../store/dashboardSlice'
import { VisualizationData } from 'shared'
import DataVisualization from './DataVisualization'
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

interface DashboardElementContentProps {
  element: GridElement
}

const DashboardElementContent: React.FC<DashboardElementContentProps> = ({ element }) => {
  const availableLeafNodes = useAppSelector(selectAvailableLeafNodes)
  const currentPage = useAppSelector(state => selectTablePageForElement(state, element.id))

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
    return <TableContent element={element} leafNode={leafNode} currentPage={currentPage} />
  }

  const visData = getVisualizationForElement(element, leafNode)
  if (!visData) return null

  return (
    <div className="flex flex-col h-full p-2">
      <DataVisualization visualization={visData} />
    </div>
  )
}

const TableContent: React.FC<{
  element: GridElement
  leafNode: LeafNodeData
  currentPage: number
}> = memo(({ element, leafNode, currentPage }) => {
  const dispatch = useAppDispatch()

  const columns = leafNode.data.length > 0 ? Object.keys(leafNode.data[0]) : []
  const ITEMS_PER_PAGE = 50
  const totalPages = Math.ceil(leafNode.data.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedData = leafNode.data.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    dispatch(setTablePage({ elementId: element.id, page }))
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
})

function getVisualizationForElement(element: GridElement, leafNode: LeafNodeData): VisualizationData | null {
  if (!element.type || element.type === 'table') return null
  if (!leafNode.data || leafNode.data.length === 0) return null

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

// カスタム比較関数により、位置・サイズ変更では再レンダリングしない
export default memo(DashboardElementContent, (prevProps, nextProps) => {
  // x, y, width, height は比較しない
  // これにより、要素の移動やサイズ変更時には再レンダリングされない
  return (
    prevProps.element.id === nextProps.element.id &&
    prevProps.element.type === nextProps.element.type &&
    prevProps.element.pipelineId === nextProps.element.pipelineId &&
    prevProps.element.leafNodeId === nextProps.element.leafNodeId
  )
})
