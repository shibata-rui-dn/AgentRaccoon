import { createSelector } from '@reduxjs/toolkit'
import { RootState } from './index'

// selectedPipelineの特定のプロパティのみを返すセレクター
// 参照が変わっても、実際の値が同じなら再レンダリングされない
export const selectSelectedPipelineMetadata = createSelector(
  [(state: RootState) => state.pipeline.selectedPipeline],
  (selectedPipeline) => {
    if (!selectedPipeline) return null
    return {
      id: selectedPipeline.id,
      name: selectedPipeline.name,
      description: selectedPipeline.description
    }
  }
)

// Dashboard selectors - メモ化により不要な再レンダリングを防止
export const selectDashboardElements = (state: RootState) => state.dashboard.elements

export const selectSelectedElementId = (state: RootState) => state.dashboard.selectedElementId

export const selectSelectedElement = createSelector(
  [selectDashboardElements, selectSelectedElementId],
  (elements, selectedElementId) => {
    if (!selectedElementId) return null
    return elements.find(el => el.id === selectedElementId) || null
  }
)

export const selectElementById = createSelector(
  [selectDashboardElements, (_state: RootState, elementId: string) => elementId],
  (elements, elementId) => {
    return elements.find(el => el.id === elementId) || null
  }
)

export const selectAvailableLeafNodes = (state: RootState) => state.dashboard.availableLeafNodes

export const selectLeafNodesForPipeline = createSelector(
  [selectAvailableLeafNodes, (_state: RootState, pipelineId: string) => pipelineId],
  (availableLeafNodes, pipelineId) => {
    return availableLeafNodes[pipelineId] || null
  }
)

export const selectTablePagination = (state: RootState) => state.dashboard.tablePagination

export const selectTablePageForElement = createSelector(
  [selectTablePagination, (_state: RootState, elementId: string) => elementId],
  (tablePagination, elementId) => {
    return tablePagination[elementId] || 1
  }
)

export const selectDrawingRect = createSelector(
  [
    (state: RootState) => state.dashboard.isDrawing,
    (state: RootState) => state.dashboard.drawStart,
    (state: RootState) => state.dashboard.drawCurrent
  ],
  (isDrawing, drawStart, drawCurrent) => {
    if (!isDrawing || !drawStart || !drawCurrent) return null

    const x1 = Math.min(drawStart.x, drawCurrent.x)
    const y1 = Math.min(drawStart.y, drawCurrent.y)
    const x2 = Math.max(drawStart.x, drawCurrent.x)
    const y2 = Math.max(drawStart.y, drawCurrent.y)

    return { x: x1, y: y1, width: x2 - x1 + 1, height: y2 - y1 + 1 }
  }
)

export const selectCurrentDashboard = (state: RootState) => state.dashboard.currentDashboard

export const selectDashboards = (state: RootState) => state.dashboard.dashboards

export const selectHasUnsavedChanges = (state: RootState) => state.dashboard.hasUnsavedChanges

export const selectIsSaving = (state: RootState) => state.dashboard.isSaving
