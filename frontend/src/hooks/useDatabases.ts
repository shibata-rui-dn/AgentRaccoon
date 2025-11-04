import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { loadDatabases } from '../store/databaseSlice'

/**
 * Custom hook to fetch and manage database list using Redux
 */
export const useDatabases = () => {
  const dispatch = useAppDispatch()
  const databases = useAppSelector(state => state.database.databases)
  const loading = useAppSelector(state => state.database.isLoading)
  const errorMessage = useAppSelector(state => state.database.error)

  useEffect(() => {
    // Load databases when hook is first used
    dispatch(loadDatabases())
  }, [dispatch])

  return {
    databases,
    loading,
    error: errorMessage ? new Error(errorMessage) : null
  }
}
