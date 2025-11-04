import * as fs from 'fs'
import * as path from 'path'
import { Pipeline } from 'shared'
import { CacheManager } from '../cache/CacheManager'

export class PipelineManager {
  private static instance: PipelineManager
  private pipelines: Map<string, Pipeline> = new Map()
  private pipelinePath: string
  private cacheManager: CacheManager

  private constructor() {
    this.pipelinePath = path.join(process.cwd(), 'data', 'pipelines')
    this.cacheManager = CacheManager.getInstance()
    this.ensureDirectoryExists()
    this.loadExistingPipelines()
  }

  static getInstance(): PipelineManager {
    if (!PipelineManager.instance) {
      PipelineManager.instance = new PipelineManager()
    }
    return PipelineManager.instance
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.pipelinePath)) {
      fs.mkdirSync(this.pipelinePath, { recursive: true })
    }
  }

  private loadExistingPipelines(): void {
    try {
      const files = fs.readdirSync(this.pipelinePath)
      files.filter(file => file.endsWith('.json')).forEach(file => {
        const filePath = path.join(this.pipelinePath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const pipeline = JSON.parse(content) as Pipeline
        this.pipelines.set(pipeline.id, pipeline)
      })
    } catch (error) {
      console.log('No existing pipelines found')
    }
  }

  async createPipeline(pipeline: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pipeline> {
    const newPipeline: Pipeline = {
      ...pipeline,
      id: `pipeline_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.pipelines.set(newPipeline.id, newPipeline)
    this.savePipeline(newPipeline)

    return newPipeline
  }

  async updatePipeline(id: string, updates: Partial<Pipeline>): Promise<Pipeline | null> {
    const pipeline = this.pipelines.get(id)
    if (!pipeline) return null

    const updatedPipeline: Pipeline = {
      ...pipeline,
      ...updates,
      id: pipeline.id,
      createdAt: pipeline.createdAt,
      updatedAt: new Date()
    }

    this.pipelines.set(id, updatedPipeline)
    this.savePipeline(updatedPipeline)

    // パイプライン更新時にキャッシュを無効化
    this.cacheManager.invalidatePipelineExecution(id)
    this.cacheManager.invalidateNodeMetadata(id)
    console.log(`[PipelineManager] Invalidated cache for pipeline ${id}`)

    return updatedPipeline
  }

  async getPipeline(id: string): Promise<Pipeline | null> {
    return this.pipelines.get(id) || null
  }

  async listPipelines(): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values())
  }

  async deletePipeline(id: string): Promise<boolean> {
    const pipeline = this.pipelines.get(id)
    if (!pipeline) return false

    try {
      const filePath = path.join(this.pipelinePath, `${id}.json`)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      this.pipelines.delete(id)

      // パイプライン削除時にキャッシュも削除
      this.cacheManager.invalidatePipelineExecution(id)
      this.cacheManager.invalidateNodeMetadata(id)
      console.log(`[PipelineManager] Invalidated cache for deleted pipeline ${id}`)

      return true
    } catch (error) {
      console.error('Error deleting pipeline:', error)
      return false
    }
  }

  private savePipeline(pipeline: Pipeline): void {
    const filePath = path.join(this.pipelinePath, `${pipeline.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(pipeline, null, 2), 'utf-8')
  }
}
