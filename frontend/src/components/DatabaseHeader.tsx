import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DatabaseHeaderProps {
  showCreateForm: boolean
  onToggleCreateForm: () => void
}

const DatabaseHeader: React.FC<DatabaseHeaderProps> = React.memo(({
  showCreateForm,
  onToggleCreateForm
}) => {
  return (
    <div className="flex items-center justify-between mb-2 flex-shrink-0 px-6 pt-4">
      <h3 className="text-2xl font-bold text-gray-900">
        データベース一覧
      </h3>
      <Button onClick={onToggleCreateForm}>
        <Plus className="mr-2 h-4 w-4" />
        {showCreateForm ? 'キャンセル' : 'データベースを作成する'}
      </Button>
    </div>
  )
})

DatabaseHeader.displayName = 'DatabaseHeader'

export default DatabaseHeader
