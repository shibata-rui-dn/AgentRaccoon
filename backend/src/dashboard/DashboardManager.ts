import * as fs from 'fs'
import * as path from 'path'
import { Dashboard } from 'shared'

export class DashboardManager {
  private static instance: DashboardManager
  private dashboards: Map<string, Dashboard> = new Map()
  private dashboardPath: string

  private constructor() {
    this.dashboardPath = path.join(process.cwd(), 'data', 'dashboards')
    this.ensureDirectoryExists()
    this.loadExistingDashboards()
  }

  static getInstance(): DashboardManager {
    if (!DashboardManager.instance) {
      DashboardManager.instance = new DashboardManager()
    }
    return DashboardManager.instance
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.dashboardPath)) {
      fs.mkdirSync(this.dashboardPath, { recursive: true })
    }
  }

  private loadExistingDashboards(): void {
    try {
      const files = fs.readdirSync(this.dashboardPath)
      files.filter(file => file.endsWith('.json')).forEach(file => {
        const filePath = path.join(this.dashboardPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const dashboard = JSON.parse(content) as Dashboard
        this.dashboards.set(dashboard.id, dashboard)
      })
    } catch (error) {
      console.log('No existing dashboards found')
    }
  }

  async createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> {
    const newDashboard: Dashboard = {
      ...dashboard,
      id: `dashboard_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.dashboards.set(newDashboard.id, newDashboard)
    this.saveDashboard(newDashboard)

    return newDashboard
  }

  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(id)
    if (!dashboard) return null

    const updatedDashboard: Dashboard = {
      ...dashboard,
      ...updates,
      id: dashboard.id,
      createdAt: dashboard.createdAt,
      updatedAt: new Date()
    }

    this.dashboards.set(id, updatedDashboard)
    this.saveDashboard(updatedDashboard)

    return updatedDashboard
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    return this.dashboards.get(id) || null
  }

  async listDashboards(): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values())
  }

  async deleteDashboard(id: string): Promise<boolean> {
    const dashboard = this.dashboards.get(id)
    if (!dashboard) return false

    try {
      const filePath = path.join(this.dashboardPath, `${id}.json`)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      this.dashboards.delete(id)
      return true
    } catch (error) {
      console.error('Error deleting dashboard:', error)
      return false
    }
  }

  private saveDashboard(dashboard: Dashboard): void {
    const filePath = path.join(this.dashboardPath, `${dashboard.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(dashboard, null, 2), 'utf-8')
  }
}
