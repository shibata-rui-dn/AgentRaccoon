import React, { useState, useEffect } from 'react'
import { DatabaseRecord } from 'shared'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DatabaseViewerProps {
  databaseId: string
}

interface DatabaseData {
  data: DatabaseRecord[]
  total: number
  pages: number
}

const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ databaseId }) => {
  const [data, setData] = useState<DatabaseData | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (page: number = 1) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/database/${databaseId}/data?page=${page}&limit=50`)

      if (!response.ok) {
        throw new Error('Failed to load database data')
      }

      const result = await response.json()
      setData(result)
      setCurrentPage(page)

      // データベースが変更されたか、初回ロード時は列名を更新
      if (result.data.length > 0) {
        setColumns(Object.keys(result.data[0]))
      }
      setIsInitialLoad(false)
    } catch (error) {
      console.error('Error loading database data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (databaseId) {
      // データベースが変更されたらリセットして最初から読み込む
      setIsInitialLoad(true)
      setColumns([])
      setData(null)
      loadData(1)
    }
  }, [databaseId])

  const handlePageChange = (page: number) => {
    loadData(page)
  }

  const renderPagination = () => {
    if (!data || data.pages <= 1) return null

    const maxPages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2))
    let endPage = Math.min(data.pages, startPage + maxPages - 1)

    // 後半のページで5ページ分表示されるように調整
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

          {endPage < data.pages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(currentPage + 1)}
              className={currentPage === data.pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLast
              onClick={() => handlePageChange(data.pages)}
              className={currentPage === data.pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  if (isInitialLoad && isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">データベースを読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">データの読み込みエラー</h3>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => loadData(currentPage)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!data || (data.data.length === 0 && columns.length === 0)) {
    return (
      <div className="text-center py-12 text-gray-500">
        <h3 className="text-lg font-medium text-gray-900 mb-2">データが見つかりません</h3>
        <p className="text-gray-600">このデータベースは空のようです。</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">詳細</h3>
          <p className="text-sm text-gray-600">
            {data.total.toLocaleString()} 件のレコード • {columns.length} 列
          </p>
        </div>
        <div className="flex-shrink-0">
          {renderPagination()}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto min-h-0 flex flex-col relative">
        <div className="overflow-y-auto flex-1">
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-64">
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-600 text-sm">読み込み中...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data && data.data.length > 0 ? (
                data.data.map((row, index) => (
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
  )
}

export default DatabaseViewer