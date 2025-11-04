import { PipelineBuilderRequest, PipelineBuilderResponse } from 'shared'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3002'

export const pipelineBuilderApi = {
  async buildPipeline(request: PipelineBuilderRequest): Promise<PipelineBuilderResponse> {
    const response = await fetch(`${API_BASE_URL}/api/pipeline/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to build pipeline')
    }

    return response.json()
  }
}
