import React, { useState, useEffect, useCallback } from 'react'
import CreateDatabaseForm from '../components/CreateDatabaseForm'
import DatabaseHeader from '../components/DatabaseHeader'
import { DatabaseListSection, DatabaseViewerSection } from '../components/DatabaseContent'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppDispatch } from '@/store'
import { loadDatabases } from '@/store/databaseSlice'

const Database: React.FC = () => {
  const dispatch = useAppDispatch()
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    dispatch(loadDatabases())
  }, [dispatch])

  const handleToggleCreateForm = useCallback(() => {
    setShowCreateForm(prev => !prev)
  }, [])

  const handleDatabaseCreated = useCallback(() => {
    dispatch(loadDatabases())
    setShowCreateForm(false)
  }, [dispatch])

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white rounded-lg shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <DatabaseHeader
          showCreateForm={showCreateForm}
          onToggleCreateForm={handleToggleCreateForm}
        />

        <div className="flex flex-col gap-0 flex-1 min-h-0">
          <div className="flex-shrink-0 overflow-x-auto overflow-y-visible">
            <DatabaseListSection />
          </div>

          <div className="flex-1 min-h-0">
            <DatabaseViewerSection />
          </div>
        </div>
      </div>

      {/* Create Database Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新しいデータベースを作成</DialogTitle>
          </DialogHeader>
          <CreateDatabaseForm onDatabaseCreated={handleDatabaseCreated} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Database
