import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { DatabaseInfo } from 'shared'

interface DatabaseState {
  databases: DatabaseInfo[]
  selectedDatabaseId: string | null
  isLoading: boolean
  error: string | null
}

const initialState: DatabaseState = {
  databases: [],
  selectedDatabaseId: null,
  isLoading: false,
  error: null
}

// Async thunk for loading databases
export const loadDatabases = createAsyncThunk(
  'database/loadDatabases',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/database/list')
      if (!response.ok) {
        throw new Error('Failed to load databases')
      }
      const data = await response.json()
      return data.databases as DatabaseInfo[]
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Async thunk for updating database name
export const updateDatabaseName = createAsyncThunk(
  'database/updateDatabaseName',
  async ({ id, name }: { id: string; name: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/database/${id}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      })
      if (!response.ok) {
        throw new Error('Failed to update database name')
      }
      return { id, name }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Async thunk for deleting database
export const deleteDatabase = createAsyncThunk(
  'database/deleteDatabase',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/database/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error('Failed to delete database')
      }
      return id
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

const databaseSlice = createSlice({
  name: 'database',
  initialState,
  reducers: {
    selectDatabase: (state, action: PayloadAction<string | null>) => {
      state.selectedDatabaseId = action.payload
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Load databases
      .addCase(loadDatabases.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loadDatabases.fulfilled, (state, action) => {
        state.isLoading = false
        state.databases = action.payload
      })
      .addCase(loadDatabases.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update database name
      .addCase(updateDatabaseName.pending, (state) => {
        state.error = null
      })
      .addCase(updateDatabaseName.fulfilled, (state, action) => {
        const database = state.databases.find(db => db.id === action.payload.id)
        if (database) {
          database.displayName = action.payload.name
        }
      })
      .addCase(updateDatabaseName.rejected, (state, action) => {
        state.error = action.payload as string
      })
      // Delete database
      .addCase(deleteDatabase.pending, (state) => {
        state.error = null
      })
      .addCase(deleteDatabase.fulfilled, (state, action) => {
        state.databases = state.databases.filter(db => db.id !== action.payload)
        if (state.selectedDatabaseId === action.payload) {
          state.selectedDatabaseId = null
        }
      })
      .addCase(deleteDatabase.rejected, (state, action) => {
        state.error = action.payload as string
      })
  }
})

export const { selectDatabase, clearError } = databaseSlice.actions
export default databaseSlice.reducer
