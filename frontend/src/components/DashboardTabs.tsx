import React, { memo } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dashboard } from 'shared'
import DashboardTab from './DashboardTab'

interface DashboardTabsProps {
  dashboards: Dashboard[]
  currentDashboard: Dashboard | null
  editingDashboardId: string | null
  editingDashboardName: string
  isSaving: boolean
  hasUnsavedChanges: boolean
  onLoadDashboard: (dashboardId: string) => void
  onNewDashboard: () => void
  onStartEditDashboardName: (dashboardId: string, currentName: string, e: React.MouseEvent) => void
  onSetEditingDashboardName: (value: string) => void
  onRenameDashboard: (dashboardId: string) => void
  onCancelEditDashboardName: () => void
  onDeleteDashboard: (dashboardId: string, e: React.MouseEvent) => void
  onSaveDashboard: () => void
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({
  dashboards,
  currentDashboard,
  editingDashboardId,
  editingDashboardName,
  isSaving,
  hasUnsavedChanges,
  onLoadDashboard,
  onNewDashboard,
  onStartEditDashboardName,
  onSetEditingDashboardName,
  onRenameDashboard,
  onCancelEditDashboardName,
  onDeleteDashboard,
  onSaveDashboard
}) => {
  return (
    <div className="bg-muted/30 border-b">
      <div className="flex items-end gap-px overflow-x-auto overflow-y-hidden px-2 pt-2">
        {/* Dashboard Tabs */}
        {dashboards.map((dashboard) => {
          const isActive = currentDashboard?.id === dashboard.id
          const isEditing = editingDashboardId === dashboard.id
          return (
            <DashboardTab
              key={dashboard.id}
              dashboard={dashboard}
              isActive={isActive}
              isEditing={isEditing}
              editingName={editingDashboardName}
              isSaving={isSaving}
              onLoadDashboard={onLoadDashboard}
              onStartEdit={onStartEditDashboardName}
              onEditNameChange={onSetEditingDashboardName}
              onRename={onRenameDashboard}
              onCancelEdit={onCancelEditDashboardName}
              onDelete={onDeleteDashboard}
            />
          )
        })}

        {/* New Dashboard Button */}
        <button
          onClick={onNewDashboard}
          className="flex items-center gap-1 px-3 py-2 rounded-t-lg text-sm bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          title="新規ダッシュボード"
        >
          <span className="text-lg leading-none">+</span>
        </button>

        <div className="flex-1"></div>

        {/* Save Button */}
        {currentDashboard && (
          <div className="flex items-center gap-2 px-3 py-2 bg-background border-t border-x border-border rounded-t-lg" style={{ marginBottom: '-1px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveDashboard}
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
  )
}

// メモ化により、propsが変更されない限り再レンダリングを防止
export default memo(DashboardTabs, (prevProps, nextProps) => {
  // dashboardsの配列を比較（IDと名前のみ）
  const dashboardsEqual =
    prevProps.dashboards.length === nextProps.dashboards.length &&
    prevProps.dashboards.every((d, i) =>
      d.id === nextProps.dashboards[i]?.id &&
      d.name === nextProps.dashboards[i]?.name
    )

  return (
    dashboardsEqual &&
    prevProps.currentDashboard?.id === nextProps.currentDashboard?.id &&
    prevProps.editingDashboardId === nextProps.editingDashboardId &&
    prevProps.editingDashboardName === nextProps.editingDashboardName &&
    prevProps.isSaving === nextProps.isSaving &&
    prevProps.hasUnsavedChanges === nextProps.hasUnsavedChanges
  )
})
