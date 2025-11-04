import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { savePipelineChanges } from '../store/pipelineSlice'

export const useAutoSave = () => {
  const dispatch = useAppDispatch()
  const nodes = useAppSelector(state => state.pipeline.nodes)
  const edges = useAppSelector(state => state.pipeline.edges)
  const selectedPipelineId = useAppSelector(state => state.pipeline.selectedPipeline?.id)
  const autoSaveEnabled = useAppSelector(state => state.pipeline.autoSaveEnabled)

  useEffect(() => {
    if (autoSaveEnabled && selectedPipelineId) {
      const timer = setTimeout(() => {
        dispatch(savePipelineChanges()).catch(error => {
          console.error('Auto-save failed:', error)
        })
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [nodes, edges, selectedPipelineId, autoSaveEnabled, dispatch])
}
