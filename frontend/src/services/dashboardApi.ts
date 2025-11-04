import { Dashboard, DashboardListResponse } from 'shared'

const API_BASE_URL = 'http://localhost:3002/api'

export const dashboardApi = {
  async createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> {
    const response = await fetch(`${API_BASE_URL}/dashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dashboard)
    })

    if (!response.ok) {
      throw new Error('Failed to create dashboard')
    }

    return response.json()
  },

  async listDashboards(): Promise<Dashboard[]> {
    const response = await fetch(`${API_BASE_URL}/dashboard/list`)

    if (!response.ok) {
      throw new Error('Failed to fetch dashboards')
    }

    const data: DashboardListResponse = await response.json()
    return data.dashboards
  },

  async getDashboard(id: string): Promise<Dashboard> {
    const response = await fetch(`${API_BASE_URL}/dashboard/${id}`)

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard')
    }

    return response.json()
  },

  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    const response = await fetch(`${API_BASE_URL}/dashboard/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Failed to update dashboard')
    }

    return response.json()
  },

  async deleteDashboard(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/dashboard/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Failed to delete dashboard')
    }
  }
}
