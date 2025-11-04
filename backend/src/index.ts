import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import path from 'path'
import { ExcelReader } from './utils/excelReader'
import { CsvReader } from './utils/csvReader'
import { DatabaseManager } from './database/DatabaseManager'
import { PipelineManager } from './pipeline/PipelineManager'
import { PipelineEngine } from './pipeline/PipelineEngine'
import { PipelineBuilderAgent } from './agents/PipelineBuilderAgent'
import { DashboardManager } from './dashboard/DashboardManager'
import { CacheManager } from './cache/CacheManager'
import { AgentConfig } from 'shared'

dotenv.config({ path: '../.env' })

const app = express()
const port = process.env.BACKEND_PORT || 3002

app.use(cors())
app.use(express.json())

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'))
    }
  }
})

const dbManager = DatabaseManager.getInstance()
const pipelineManager = PipelineManager.getInstance()
const dashboardManager = DashboardManager.getInstance()

// Initialize CacheManager with configuration from environment variables
const cacheManager = CacheManager.getInstance({
  maxExecutionResultRows: parseInt(process.env.CACHE_MAX_EXECUTION_ROWS || '1000'),
  maxNodeResultRows: parseInt(process.env.CACHE_MAX_NODE_ROWS || '10000'),
  maxDashboardElementRows: parseInt(process.env.CACHE_MAX_DASHBOARD_ROWS || '500'),
  pipelineExecutionTTL: parseInt(process.env.CACHE_PIPELINE_TTL || '300000'), // 5 minutes
  nodeMetadataTTL: parseInt(process.env.CACHE_METADATA_TTL || '1800000'), // 30 minutes
  dashboardCacheTTL: parseInt(process.env.CACHE_DASHBOARD_TTL || '600000'), // 10 minutes
  maxCacheEntries: parseInt(process.env.CACHE_MAX_ENTRIES || '100')
})

const pipelineEngine = new PipelineEngine()

// Initialize Pipeline Builder Agent
const agentConfig: AgentConfig = {
  type: 'workflow',
  model: process.env.OPENAI_MODEL || 'gpt-5-mini',
  temperature: 1,  // GPT-5 models only support temperature: 1
  maxTokens: 4096  // GPT-5-mini の max_completion_tokens 上限
}
const pipelineBuilderAgent = new PipelineBuilderAgent(agentConfig)

// Database management endpoints
app.post('/api/database/create', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { name, useFirstRowAsHeaders } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Database name is required' })
    }

    // Default to true if not specified
    const useHeaders = useFirstRowAsHeaders === 'false' ? false : true
    console.log('useFirstRowAsHeaders param:', useFirstRowAsHeaders, 'parsed:', useHeaders)

    const ext = path.extname(req.file.originalname).toLowerCase()
    let headers: string[]
    let data: any[]

    if (ext === '.csv') {
      const csvData = await CsvReader.readFile(req.file.path, useHeaders)
      headers = csvData.headers
      data = csvData.data
    } else {
      const excelData = ExcelReader.readFile(req.file.path, useHeaders)
      headers = excelData.headers
      data = excelData.data
    }

    console.log('Headers received from reader:', headers)
    console.log('First data row:', data[0])
    console.log('Total data rows:', data.length)

    const dbId = await dbManager.createDatabase(name, headers, data)

    res.json({
      success: true,
      databaseId: dbId,
      message: `Database created successfully with ${data.length} records`
    })
  } catch (error) {
    console.error('Error creating database:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.get('/api/database/list', async (req, res) => {
  try {
    const databases = await dbManager.getDatabaseList()
    res.json({ databases })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.get('/api/database/:id/data', async (req, res) => {
  try {
    const { id } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50

    const result = await dbManager.getDatabaseData(id, page, limit)
    res.json(result)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.put('/api/database/:id/name', async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Database name is required' })
    }

    const success = await dbManager.updateDatabaseName(id, name)

    if (success) {
      res.json({ success: true, message: 'Database name updated successfully' })
    } else {
      res.status(404).json({ error: 'Database not found' })
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.delete('/api/database/:id', async (req, res) => {
  try {
    const { id } = req.params
    const success = await dbManager.deleteDatabase(id)

    if (success) {
      // データベース削除時、関連パイプラインのキャッシュを無効化
      const allPipelines = await pipelineManager.listPipelines()
      cacheManager.invalidatePipelinesByDatabase(id, allPipelines)

      res.json({ success: true, message: 'Database deleted successfully' })
    } else {
      res.status(404).json({ error: 'Database not found' })
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

// Pipeline management endpoints
app.post('/api/pipeline', async (req, res) => {
  try {
    const pipeline = await pipelineManager.createPipeline(req.body)
    res.json(pipeline)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.get('/api/pipeline/list', async (req, res) => {
  try {
    const pipelines = await pipelineManager.listPipelines()
    res.json({ pipelines })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.get('/api/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pipeline = await pipelineManager.getPipeline(id)

    if (pipeline) {
      res.json(pipeline)
    } else {
      res.status(404).json({ error: 'Pipeline not found' })
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.put('/api/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pipeline = await pipelineManager.updatePipeline(id, req.body)

    if (pipeline) {
      res.json(pipeline)
    } else {
      res.status(404).json({ error: 'Pipeline not found' })
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.delete('/api/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params
    const success = await pipelineManager.deletePipeline(id)

    if (success) {
      res.json({ success: true, message: 'Pipeline deleted successfully' })
    } else {
      res.status(404).json({ error: 'Pipeline not found' })
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.post('/api/pipeline/:id/execute', async (req, res) => {
  try {
    const { id } = req.params
    const pipeline = await pipelineManager.getPipeline(id)

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }

    const result = await pipelineEngine.execute(pipeline)
    res.json(result)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

// Pipeline Builder Agent endpoint
app.post('/api/pipeline/build', async (req, res) => {
  try {
    const { userRequest, existingPipelineId, existingPipelineName, existingPipelineDescription } = req.body

    if (!userRequest) {
      return res.status(400).json({ error: 'userRequest is required' })
    }

    // Get available databases to provide context
    const databases = await dbManager.getDatabaseList()

    // Get existing pipeline data if updating
    let existingNodes
    let existingEdges
    if (existingPipelineId) {
      const existingPipeline = await pipelineManager.getPipeline(existingPipelineId)
      if (existingPipeline) {
        existingNodes = existingPipeline.nodes
        existingEdges = existingPipeline.edges

        // Check if any dataSource nodes have no databaseId selected
        const dataSourceNodes = existingNodes.filter(node => node.type === 'dataSource')
        const unselectedDataSources = dataSourceNodes.filter(node => !node.config.databaseId)

        if (unselectedDataSources.length > 0) {
          const nodeLabels = unselectedDataSources.map(node => `"${node.label}"`).join(', ')
          return res.status(400).json({
            success: false,
            error: `データソースノード（${nodeLabels}）のデータベースが選択されていません。先にデータベースを選択してください。`
          })
        }
      }
    }

    const response = await pipelineBuilderAgent.execute({
      userRequest,
      availableDatabases: databases,
      existingPipelineId,
      existingPipelineName,
      existingPipelineDescription,
      existingNodes,
      existingEdges
    })

    if (response.success && response.pipeline) {
      // Save the generated pipeline
      const savedPipeline = existingPipelineId
        ? await pipelineManager.updatePipeline(existingPipelineId, response.pipeline)
        : await pipelineManager.createPipeline(response.pipeline)

      res.json({
        ...response,
        pipeline: savedPipeline
      })
    } else {
      res.status(400).json(response)
    }
  } catch (error) {
    console.error('Pipeline build error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

// Dashboard management endpoints
app.post('/api/dashboard', async (req, res) => {
  try {
    const dashboard = await dashboardManager.createDashboard(req.body)
    res.json(dashboard)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.get('/api/dashboard/list', async (req, res) => {
  try {
    const dashboards = await dashboardManager.listDashboards()
    res.json({ dashboards })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.get('/api/dashboard/:id', async (req, res) => {
  try {
    const { id } = req.params
    const dashboard = await dashboardManager.getDashboard(id)

    if (dashboard) {
      res.json(dashboard)
    } else {
      res.status(404).json({ error: 'Dashboard not found' })
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.put('/api/dashboard/:id', async (req, res) => {
  try {
    const { id } = req.params
    const dashboard = await dashboardManager.updateDashboard(id, req.body)

    if (dashboard) {
      res.json(dashboard)
    } else {
      res.status(404).json({ error: 'Dashboard not found' })
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.delete('/api/dashboard/:id', async (req, res) => {
  try {
    const { id } = req.params
    const success = await dashboardManager.deleteDashboard(id)

    if (success) {
      res.json({ success: true, message: 'Dashboard deleted successfully' })
    } else {
      res.status(404).json({ error: 'Dashboard not found' })
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Cache management endpoints
app.get('/api/cache/stats', (req, res) => {
  try {
    const stats = cacheManager.getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.post('/api/cache/clear', (req, res) => {
  try {
    cacheManager.clearAll()
    res.json({ success: true, message: 'All caches cleared' })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.delete('/api/cache/pipeline/:id', (req, res) => {
  try {
    const { id } = req.params
    cacheManager.invalidatePipelineExecution(id)
    cacheManager.invalidateNodeMetadata(id)
    res.json({ success: true, message: `Cache cleared for pipeline ${id}` })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`)
  console.log(`Cache configuration:`, cacheManager.getConfig())
})