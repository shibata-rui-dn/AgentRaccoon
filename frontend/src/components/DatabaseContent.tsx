import React from 'react'
import DatabaseList from './DatabaseList'
import DatabaseViewer from './DatabaseViewer'
import { useAppSelector } from '@/store'

const DatabaseListSection: React.FC = React.memo(() => {
  const isLoading = useAppSelector((state) => state.database.isLoading)

  if (isLoading) {
    return (
      <div className="text-center py-8 px-6">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">データベースを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="pl-6">
      <DatabaseList />
    </div>
  )
})

DatabaseListSection.displayName = 'DatabaseListSection'

const DatabaseViewerSection: React.FC = React.memo(() => {
  const selectedDatabaseId = useAppSelector((state) => state.database.selectedDatabaseId)

  if (selectedDatabaseId) {
    return <DatabaseViewer databaseId={selectedDatabaseId} />
  }

  return (
    <div className="text-center py-12 text-gray-500">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7c0-2.21-1.79-4-4-4H8c-2.21 0-4 1.79-4 4z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">データベースが選択されていません</h3>
      <p className="mt-1 text-sm text-gray-500">
        リストからデータベースを選択して内容を表示します。
      </p>
    </div>
  )
})

DatabaseViewerSection.displayName = 'DatabaseViewerSection'

export { DatabaseListSection, DatabaseViewerSection }
