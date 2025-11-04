import React, { useCallback, useState } from 'react'
import { DatabaseInfo } from 'shared'
import { Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectDatabase, deleteDatabase, updateDatabaseName } from '@/store/databaseSlice'

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

interface DatabaseCardProps {
  database: DatabaseInfo
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string, event: React.MouseEvent) => void
  onUpdateName: (id: string, name: string) => void
}

const DatabaseCard = React.memo<DatabaseCardProps>(({ database, isSelected, onSelect, onDelete, onUpdateName }) => {
  const [displayName, setDisplayName] = useState(database.displayName)

  const handleClick = useCallback(() => {
    onSelect(database.id)
  }, [database.id, onSelect])

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(database.id, e)
  }, [database.id, onDelete])

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value)
  }, [])

  const handleNameBlur = useCallback(() => {
    if (!displayName.trim()) {
      setDisplayName(database.displayName)
      return
    }
    if (displayName !== database.displayName) {
      onUpdateName(database.id, displayName.trim())
    }
  }, [database.id, database.displayName, displayName, onUpdateName])

  const handleInputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  return (
    <Card
      onClick={handleClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md flex-shrink-0",
        "w-[250px] h-[140px]",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Input
              value={displayName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onClick={handleInputClick}
              className="text-base font-semibold border-none shadow-none px-0 focus-visible:ring-0 mb-1 h-7"
            />
            <CardDescription>
              {database.rowCount.toLocaleString()} 行 • {database.columns.length} 列
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteClick}
            className="h-8 w-8 flex-shrink-0"
            title="データベースを削除"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-sm text-muted-foreground mb-2">
          作成日: {formatDate(database.createdAt.toString())}
        </p>
        {database.columns.length > 3 && (
          <div className="absolute top-0 right-2 z-10">
            <Badge variant="secondary" className="text-xs">
              +{database.columns.length - 3}
            </Badge>
          </div>
        )}
        <div className="flex flex-wrap gap-1 overflow-hidden" style={{ maxHeight: '52px' }}>
          {database.columns.slice(0, 3).map((column, index) => (
            <Badge key={index} variant="secondary" className="max-w-[70px]">
              <span className="truncate block">{column}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

DatabaseCard.displayName = 'DatabaseCard'

const DatabaseList: React.FC = () => {
  const dispatch = useAppDispatch()
  const databases = useAppSelector((state) => state.database.databases)
  const selectedDatabaseId = useAppSelector((state) => state.database.selectedDatabaseId)

  const handleSelect = useCallback((id: string) => {
    dispatch(selectDatabase(id))
  }, [dispatch])

  const handleUpdateName = useCallback(async (id: string, name: string) => {
    try {
      await dispatch(updateDatabaseName({ id, name })).unwrap()
    } catch (error) {
      console.error('Error updating database name:', error)
      alert('データベース名の更新に失敗しました')
    }
  }, [dispatch])

  const handleDelete = useCallback(async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()

    if (!confirm('本当にこのデータベースを削除しますか？この操作は元に戻せません。')) {
      return
    }

    try {
      await dispatch(deleteDatabase(id)).unwrap()
    } catch (error) {
      console.error('Error deleting database:', error)
      alert('データベースの削除に失敗しました')
    }
  }, [dispatch])

  if (databases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-8v2m0 6h.01"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium">データベースがありません</h3>
        <p className="mt-1 text-sm">
          ExcelまたはCSVファイルをアップロードして、最初のデータベースを作成してください。
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 py-2">
      {databases.map((database) => (
        <DatabaseCard
          key={database.id}
          database={database}
          isSelected={selectedDatabaseId === database.id}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onUpdateName={handleUpdateName}
        />
      ))}
      <div className="w-2 flex-shrink-0" />
    </div>
  )
}

export default DatabaseList
