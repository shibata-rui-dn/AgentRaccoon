import { Pipeline, PipelineListResponse, PipelineExecutionResult } from 'shared'

const API_BASE_URL = 'http://localhost:3002/api'

export const pipelineApi = {
  async createPipeline(pipeline: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pipeline> {
    const response = await fetch(`${API_BASE_URL}/pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pipeline)
    })

    if (!response.ok) {
      throw new Error('Failed to create pipeline')
    }

    return response.json()
  },

  async listPipelines(): Promise<Pipeline[]> {
    const response = await fetch(`${API_BASE_URL}/pipeline/list`)

    if (!response.ok) {
      throw new Error('Failed to fetch pipelines')
    }

    const data: PipelineListResponse = await response.json()
    return data.pipelines
  },

  async getPipeline(id: string): Promise<Pipeline> {
    const response = await fetch(`${API_BASE_URL}/pipeline/${id}`)

    if (!response.ok) {
      throw new Error('Failed to fetch pipeline')
    }

    return response.json()
  },

  async updatePipeline(id: string, updates: Partial<Pipeline>): Promise<Pipeline> {
    const response = await fetch(`${API_BASE_URL}/pipeline/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Failed to update pipeline')
    }

    return response.json()
  },

  async deletePipeline(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/pipeline/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Failed to delete pipeline')
    }
  },

  async executePipeline(id: string): Promise<PipelineExecutionResult> {
    const response = await fetch(`${API_BASE_URL}/pipeline/${id}/execute`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error('Failed to execute pipeline')
    }

    return response.json()
  }
}
