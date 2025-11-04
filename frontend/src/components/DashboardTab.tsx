import React, { memo } from 'react'
import { X } from 'lucide-react'
import { Dashboard } from 'shared'

interface DashboardTabProps {
  dashboard: Dashboard
  isActive: boolean
  isEditing: boolean
  editingName: string
  isSaving: boolean
  onLoadDashboard: (dashboardId: string) => void
  onStartEdit: (dashboardId: string, currentName: string, e: React.MouseEvent) => void
  onEditNameChange: (value: string) => void
  onRename: (dashboardId: string) => void
  onCancelEdit: () => void
  onDelete: (dashboardId: string, e: React.MouseEvent) => void
}

const DashboardTab: React.FC<DashboardTabProps> = ({
  dashboard,
  isActive,
  isEditing,
  editingName,
  isSaving,
  onLoadDashboard,
  onStartEdit,
  onEditNameChange,
  onRename,
  onCancelEdit,
  onDelete
}) => {
  return (
    <div
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
          value={editingName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onBlur={() => onRename(dashboard.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onRename(dashboard.id)
            } else if (e.key === 'Escape') {
              onCancelEdit()
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
          onClick={() => onLoadDashboard(dashboard.id)}
          onDoubleClick={(e) => onStartEdit(dashboard.id, dashboard.name, e)}
        >
          {dashboard.name}
        </span>
      )}
      {isActive && isSaving && (
        <span className="text-xs text-muted-foreground">保存中...</span>
      )}
      {!isEditing && (
        <button
          onClick={(e) => onDelete(dashboard.id, e)}
          className="ml-1 p-0.5 rounded hover:bg-muted-foreground/20 transition-colors opacity-0 group-hover:opacity-100"
          title="閉じる"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// メモ化により、propsが変更されない限り再レンダリングを防止
export default memo(DashboardTab, (prevProps, nextProps) => {
  return (
    prevProps.dashboard.id === nextProps.dashboard.id &&
    prevProps.dashboard.name === nextProps.dashboard.name &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.editingName === nextProps.editingName &&
    prevProps.isSaving === nextProps.isSaving
  )
})
