import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Dashboard } from 'shared'
import { dashboardApi } from '../services/dashboardApi'
import { pipelineApi } from '../services/pipelineApi'

export interface GridElement {
  id: string
  name: string
  type: 'bar' | 'line' | 'scatter' | 'pie' | 'table' | null
  x: number
  y: number
  width: number
  height: number
  pipelineId: string | null
  leafNodeId: string | null
  config?: any
}

export interface LeafNodeData {
  nodeId: string
  nodeLabel: string
  nodeType: string
  data: any[]
}

interface DashboardState {
  dashboards: Dashboard[]
  currentDashboard: Dashboard | null
  elements: GridElement[]
  selectedElementId: string | null
  availableLeafNodes: Record<string, LeafNodeData[]>
  tablePagination: Record<string, number>
  elementCounter: number
  hasUnsavedChanges: boolean
  isSaving: boolean
  isLoading: boolean
  error: string | null
  // UI state
  isDrawing: boolean
  drawStart: { x: number; y: number } | null
  drawCurrent: { x: number; y: number } | null
  isResizing: boolean
  resizingElementId: string | null
  resizeStart: { x: number; y: number; width: number; height: number } | null
  isDragging: boolean
  draggingElementId: string | null
  dragStart: { x: number; y: number; elementX: number; elementY: number } | null
  editingNameId: string | null
  editingDashboardId: string | null
  editingDashboardName: string
  showNewDashboardDialog: boolean
  newDashboardName: string
}

const initialState: DashboardState = {
  dashboards: [],
  currentDashboard: null,
  elements: [],
  selectedElementId: null,
  availableLeafNodes: {},
  tablePagination: {},
  elementCounter: 1,
  hasUnsavedChanges: false,
  isSaving: false,
  isLoading: false,
  error: null,
  isDrawing: false,
  drawStart: null,
  drawCurrent: null,
  isResizing: false,
  resizingElementId: null,
  resizeStart: null,
  isDragging: false,
  draggingElementId: null,
  dragStart: null,
  editingNameId: null,
  editingDashboardId: null,
  editingDashboardName: '',
  showNewDashboardDialog: false,
  newDashboardName: '',
}

// Async thunks
export const fetchDashboards = createAsyncThunk(
  'dashboard/fetchDashboards',
  async () => {
    const dashboards = await dashboardApi.listDashboards()
    return dashboards
  }
)

export const loadDashboard = createAsyncThunk(
  'dashboard/loadDashboard',
  async (dashboardId: string, { rejectWithValue }) => {
    try {
      const dashboard = await dashboardApi.getDashboard(dashboardId)

      // Load pipeline data for all elements that have pipelineId
      const pipelineIds = new Set(
        dashboard.elements
          .filter(el => el.pipelineId)
          .map(el => el.pipelineId as string)
      )

      const leafNodes: Record<string, any[]> = {}
      for (const pipelineId of pipelineIds) {
        try {
          const result = await pipelineApi.executePipeline(pipelineId)
          if (result.status === 'success' && result.leafResults) {
            leafNodes[pipelineId] = result.leafResults
          }
        } catch (err) {
          console.error(`Failed to execute pipeline ${pipelineId}:`, err)
        }
      }

      return { dashboard, leafNodes }
    } catch (error) {
      return rejectWithValue('Failed to load dashboard')
    }
  }
)

export const createDashboard = createAsyncThunk(
  'dashboard/createDashboard',
  async (name: string) => {
    const dashboard = await dashboardApi.createDashboard({
      name,
      elements: []
    })
    return dashboard
  }
)

export const saveDashboard = createAsyncThunk(
  'dashboard/saveDashboard',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { dashboard: DashboardState }
    const { currentDashboard, elements } = state.dashboard

    if (!currentDashboard) {
      return rejectWithValue('No current dashboard')
    }

    try {
      await dashboardApi.updateDashboard(currentDashboard.id, { elements })
      return true
    } catch (error) {
      return rejectWithValue('Failed to save dashboard')
    }
  }
)

export const deleteDashboard = createAsyncThunk(
  'dashboard/deleteDashboard',
  async (dashboardId: string) => {
    await dashboardApi.deleteDashboard(dashboardId)
    return dashboardId
  }
)

export const renameDashboard = createAsyncThunk(
  'dashboard/renameDashboard',
  async ({ dashboardId, name }: { dashboardId: string; name: string }) => {
    await dashboardApi.updateDashboard(dashboardId, { name })
    return { dashboardId, name }
  }
)

export const executePipeline = createAsyncThunk(
  'dashboard/executePipeline',
  async (pipelineId: string) => {
    const result = await pipelineApi.executePipeline(pipelineId)
    return { pipelineId, leafResults: result.leafResults || [] }
  }
)

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    // Element management
    addElement: (state, action: PayloadAction<Omit<GridElement, 'id'>>) => {
      const newElement: GridElement = {
        ...action.payload,
        id: `element_${Date.now()}`
      }
      state.elements.push(newElement)
      state.selectedElementId = newElement.id
      state.elementCounter += 1
      state.hasUnsavedChanges = true
    },

    updateElement: (state, action: PayloadAction<{ id: string; updates: Partial<GridElement> }>) => {
      const index = state.elements.findIndex(el => el.id === action.payload.id)
      if (index !== -1) {
        state.elements[index] = { ...state.elements[index], ...action.payload.updates }
        state.hasUnsavedChanges = true
      }
    },

    deleteElement: (state, action: PayloadAction<string>) => {
      state.elements = state.elements.filter(el => el.id !== action.payload)
      if (state.selectedElementId === action.payload) {
        state.selectedElementId = null
      }
      state.hasUnsavedChanges = true
    },

    setSelectedElement: (state, action: PayloadAction<string | null>) => {
      state.selectedElementId = action.payload
    },

    // Drawing state
    startDrawing: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.isDrawing = true
      state.drawStart = action.payload
      state.drawCurrent = action.payload
      state.selectedElementId = null
    },

    updateDrawing: (state, action: PayloadAction<{ x: number; y: number }>) => {
      if (state.isDrawing) {
        state.drawCurrent = action.payload
      }
    },

    endDrawing: (state) => {
      state.isDrawing = false
      state.drawStart = null
      state.drawCurrent = null
    },

    // Resizing state
    startResizing: (state, action: PayloadAction<{ elementId: string; x: number; y: number; width: number; height: number }>) => {
      state.isResizing = true
      state.resizingElementId = action.payload.elementId
      state.resizeStart = {
        x: action.payload.x,
        y: action.payload.y,
        width: action.payload.width,
        height: action.payload.height
      }
    },

    updateResize: (state, action: PayloadAction<{ deltaX: number; deltaY: number; gridCellSize: number }>) => {
      if (!state.isResizing || !state.resizingElementId || !state.resizeStart) return

      const MIN_WIDTH = 8
      const MIN_HEIGHT = 6
      const deltaX = Math.round(action.payload.deltaX / action.payload.gridCellSize)
      const deltaY = Math.round(action.payload.deltaY / action.payload.gridCellSize)

      const newWidth = Math.max(MIN_WIDTH, state.resizeStart.width + deltaX)
      const newHeight = Math.max(MIN_HEIGHT, state.resizeStart.height + deltaY)

      const index = state.elements.findIndex(el => el.id === state.resizingElementId)
      if (index !== -1) {
        state.elements[index].width = newWidth
        state.elements[index].height = newHeight
      }
    },

    endResizing: (state) => {
      if (state.isResizing) {
        state.hasUnsavedChanges = true
      }
      state.isResizing = false
      state.resizingElementId = null
      state.resizeStart = null
    },

    // Dragging state
    startDragging: (state, action: PayloadAction<{ elementId: string; x: number; y: number; elementX: number; elementY: number }>) => {
      state.isDragging = true
      state.draggingElementId = action.payload.elementId
      state.dragStart = {
        x: action.payload.x,
        y: action.payload.y,
        elementX: action.payload.elementX,
        elementY: action.payload.elementY
      }
    },

    updateDrag: (state, action: PayloadAction<{ deltaX: number; deltaY: number; gridCellSize: number }>) => {
      if (!state.isDragging || !state.draggingElementId || !state.dragStart) return

      const deltaX = Math.round(action.payload.deltaX / action.payload.gridCellSize)
      const deltaY = Math.round(action.payload.deltaY / action.payload.gridCellSize)

      const newX = Math.max(0, state.dragStart.elementX + deltaX)
      const newY = Math.max(0, state.dragStart.elementY + deltaY)

      const index = state.elements.findIndex(el => el.id === state.draggingElementId)
      if (index !== -1) {
        state.elements[index].x = newX
        state.elements[index].y = newY
      }
    },

    endDragging: (state) => {
      if (state.isDragging) {
        state.hasUnsavedChanges = true
      }
      state.isDragging = false
      state.draggingElementId = null
      state.dragStart = null
    },

    // Table pagination
    setTablePage: (state, action: PayloadAction<{ elementId: string; page: number }>) => {
      state.tablePagination[action.payload.elementId] = action.payload.page
    },

    // Element name editing
    setEditingNameId: (state, action: PayloadAction<string | null>) => {
      state.editingNameId = action.payload
    },

    // Dashboard name editing
    startEditingDashboardName: (state, action: PayloadAction<{ dashboardId: string; name: string }>) => {
      state.editingDashboardId = action.payload.dashboardId
      state.editingDashboardName = action.payload.name
    },

    setEditingDashboardName: (state, action: PayloadAction<string>) => {
      state.editingDashboardName = action.payload
    },

    cancelEditingDashboardName: (state) => {
      state.editingDashboardId = null
      state.editingDashboardName = ''
    },

    // New dashboard dialog
    showNewDashboardDialog: (state) => {
      state.showNewDashboardDialog = true
      state.newDashboardName = ''
    },

    hideNewDashboardDialog: (state) => {
      state.showNewDashboardDialog = false
      state.newDashboardName = ''
    },

    setNewDashboardName: (state, action: PayloadAction<string>) => {
      state.newDashboardName = action.payload
    },

    // Unsaved changes tracking
    markSaved: (state) => {
      state.hasUnsavedChanges = false
    },

    clearCurrentDashboard: (state) => {
      state.currentDashboard = null
      state.elements = []
      state.selectedElementId = null
      state.elementCounter = 1
      state.hasUnsavedChanges = false
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboards
      .addCase(fetchDashboards.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchDashboards.fulfilled, (state, action) => {
        state.isLoading = false
        state.dashboards = action.payload
      })
      .addCase(fetchDashboards.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch dashboards'
      })

      // Load dashboard
      .addCase(loadDashboard.pending, (state) => {
        state.isLoading = true
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentDashboard = action.payload.dashboard
        state.elements = action.payload.dashboard.elements
        state.availableLeafNodes = action.payload.leafNodes
        state.selectedElementId = null
        state.hasUnsavedChanges = false

        // Reset element counter
        const maxCounter = action.payload.dashboard.elements.reduce((max, el) => {
          const match = el.name.match(/要素名(\d+)/)
          return match ? Math.max(max, parseInt(match[1])) : max
        }, 0)
        state.elementCounter = maxCounter + 1

        // Save to localStorage
        localStorage.setItem('lastUsedDashboardId', action.payload.dashboard.id)
      })
      .addCase(loadDashboard.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Create dashboard
      .addCase(createDashboard.fulfilled, (state, action) => {
        state.currentDashboard = action.payload
        state.elements = []
        state.elementCounter = 1
        state.selectedElementId = null
        state.hasUnsavedChanges = false
        state.showNewDashboardDialog = false
        state.newDashboardName = ''

        // Save to localStorage
        localStorage.setItem('lastUsedDashboardId', action.payload.id)
      })

      // Save dashboard
      .addCase(saveDashboard.pending, (state) => {
        state.isSaving = true
      })
      .addCase(saveDashboard.fulfilled, (state) => {
        state.isSaving = false
        state.hasUnsavedChanges = false
      })
      .addCase(saveDashboard.rejected, (state) => {
        state.isSaving = false
      })

      // Delete dashboard
      .addCase(deleteDashboard.fulfilled, (state, action) => {
        state.dashboards = state.dashboards.filter(d => d.id !== action.payload)
        if (state.currentDashboard?.id === action.payload) {
          state.currentDashboard = null
          state.elements = []
          state.elementCounter = 1
          state.selectedElementId = null
        }
      })

      // Rename dashboard
      .addCase(renameDashboard.fulfilled, (state, action) => {
        const index = state.dashboards.findIndex(d => d.id === action.payload.dashboardId)
        if (index !== -1) {
          state.dashboards[index].name = action.payload.name
        }
        if (state.currentDashboard?.id === action.payload.dashboardId) {
          state.currentDashboard.name = action.payload.name
        }
        state.editingDashboardId = null
        state.editingDashboardName = ''
      })

      // Execute pipeline
      .addCase(executePipeline.fulfilled, (state, action) => {
        state.availableLeafNodes[action.payload.pipelineId] = action.payload.leafResults
      })
  }
})

export const {
  addElement,
  updateElement,
  deleteElement,
  setSelectedElement,
  startDrawing,
  updateDrawing,
  endDrawing,
  startResizing,
  updateResize,
  endResizing,
  startDragging,
  updateDrag,
  endDragging,
  setTablePage,
  setEditingNameId,
  startEditingDashboardName,
  setEditingDashboardName,
  cancelEditingDashboardName,
  showNewDashboardDialog,
  hideNewDashboardDialog,
  setNewDashboardName,
  markSaved,
  clearCurrentDashboard
} = dashboardSlice.actions

export default dashboardSlice.reducer
