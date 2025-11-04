import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import pipelineReducer from './pipelineSlice'
import databaseReducer from './databaseSlice'
import dashboardReducer from './dashboardSlice'

export const store = configureStore({
  reducer: {
    pipeline: pipelineReducer,
    database: databaseReducer,
    dashboard: dashboardReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
