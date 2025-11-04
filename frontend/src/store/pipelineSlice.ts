import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Pipeline, PipelineNode, PipelineEdge } from 'shared'
import { pipelineApi } from '../services/pipelineApi'

interface PipelineState {
  pipelines: Pipeline[]
  selectedPipeline: Pipeline | null
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  isLoading: boolean
  error: string | null
  autoSaveEnabled: boolean
}

const initialState: PipelineState = {
  pipelines: [],
  selectedPipeline: null,
  nodes: [],
  edges: [],
  isLoading: false,
  error: null,
  autoSaveEnabled: false
}

// Async thunks
export const fetchPipelines = createAsyncThunk(
  'pipeline/fetchPipelines',
  async () => {
    const pipelines = await pipelineApi.listPipelines()
    return pipelines
  }
)

export const fetchPipeline = createAsyncThunk(
  'pipeline/fetchPipeline',
  async (id: string) => {
    const pipeline = await pipelineApi.getPipeline(id)
    return pipeline
  }
)

export const createPipeline = createAsyncThunk(
  'pipeline/createPipeline',
  async (data: { name: string; description: string }) => {
    const defaultDataSourceNode: PipelineNode = {
      id: 'datasource_default',
      type: 'dataSource',
      label: 'データソース',
      config: { isInitial: true },
      position: { x: 100, y: 200 }
    }

    const pipeline = await pipelineApi.createPipeline({
      name: data.name,
      description: data.description,
      nodes: [defaultDataSourceNode],
      edges: []
    })
    return pipeline
  }
)

export const updatePipeline = createAsyncThunk(
  'pipeline/updatePipeline',
  async ({ id, updates }: { id: string; updates: Partial<Pipeline> }) => {
    const pipeline = await pipelineApi.updatePipeline(id, updates)
    return pipeline
  }
)

export const deletePipeline = createAsyncThunk(
  'pipeline/deletePipeline',
  async (id: string) => {
    await pipelineApi.deletePipeline(id)
    return id
  }
)

export const savePipelineChanges = createAsyncThunk(
  'pipeline/savePipelineChanges',
  async (_, { getState }) => {
    const state = getState() as { pipeline: PipelineState }
    const { selectedPipeline, nodes, edges } = state.pipeline

    if (!selectedPipeline) {
      throw new Error('No pipeline selected')
    }

    await pipelineApi.updatePipeline(selectedPipeline.id, { nodes, edges })

    // 更新されたnodes/edgesを返す（selectedPipeline全体ではなく）
    return { id: selectedPipeline.id, nodes, edges }
  }
)

const pipelineSlice = createSlice({
  name: 'pipeline',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<PipelineNode[]>) => {
      state.nodes = action.payload
    },
    addNode: (state, action: PayloadAction<PipelineNode>) => {
      state.nodes.push(action.payload)
    },
    updateNode: (state, action: PayloadAction<{ id: string; updates: Partial<PipelineNode> }>) => {
      const index = state.nodes.findIndex(n => n.id === action.payload.id)
      if (index !== -1) {
        state.nodes[index] = { ...state.nodes[index], ...action.payload.updates }
      }
    },
    deleteNode: (state, action: PayloadAction<string>) => {
      state.nodes = state.nodes.filter(n => n.id !== action.payload)
      state.edges = state.edges.filter(e => e.source !== action.payload && e.target !== action.payload)
    },
    setEdges: (state, action: PayloadAction<PipelineEdge[]>) => {
      state.edges = action.payload
    },
    addEdge: (state, action: PayloadAction<PipelineEdge>) => {
      state.edges.push(action.payload)
    },
    setAutoSaveEnabled: (state, action: PayloadAction<boolean>) => {
      state.autoSaveEnabled = action.payload
    },
    clearSelection: (state) => {
      state.selectedPipeline = null
      state.nodes = []
      state.edges = []
      state.autoSaveEnabled = false
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchPipelines
      .addCase(fetchPipelines.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPipelines.fulfilled, (state, action) => {
        state.isLoading = false
        state.pipelines = action.payload
      })
      .addCase(fetchPipelines.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch pipelines'
      })
      // fetchPipeline
      .addCase(fetchPipeline.pending, (state) => {
        state.autoSaveEnabled = false
        state.isLoading = true
      })
      .addCase(fetchPipeline.fulfilled, (state, action) => {
        state.isLoading = false
        state.selectedPipeline = action.payload
        state.nodes = action.payload.nodes
        state.edges = action.payload.edges
      })
      .addCase(fetchPipeline.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch pipeline'
      })
      // createPipeline
      .addCase(createPipeline.fulfilled, (state, action) => {
        state.pipelines.push(action.payload)
        state.selectedPipeline = action.payload
        state.nodes = action.payload.nodes
        state.edges = action.payload.edges
      })
      // updatePipeline
      .addCase(updatePipeline.fulfilled, (state, action) => {
        const index = state.pipelines.findIndex(p => p.id === action.payload.id)
        if (index !== -1) {
          state.pipelines[index] = action.payload
        }
        if (state.selectedPipeline?.id === action.payload.id) {
          state.selectedPipeline = action.payload
        }
      })
      // deletePipeline
      .addCase(deletePipeline.fulfilled, (state, action) => {
        state.pipelines = state.pipelines.filter(p => p.id !== action.payload)
        if (state.selectedPipeline?.id === action.payload) {
          state.selectedPipeline = null
          state.nodes = []
          state.edges = []
          state.autoSaveEnabled = false
        }
      })
      // savePipelineChanges - nodes/edgesのみを更新（selectedPipelineは更新しない）
      .addCase(savePipelineChanges.fulfilled, () => {
        // すでにstate.nodesとstate.edgesは最新なので、何もしない
        // selectedPipelineを更新しないことで、PipelineHeaderの再レンダリングを防ぐ
      })
  }
})

export const {
  setNodes,
  addNode,
  updateNode,
  deleteNode,
  setEdges,
  addEdge,
  setAutoSaveEnabled,
  clearSelection
} = pipelineSlice.actions

export default pipelineSlice.reducer
