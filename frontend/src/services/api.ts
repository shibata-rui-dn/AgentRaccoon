import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await api.get('/health')
  return response.data
}