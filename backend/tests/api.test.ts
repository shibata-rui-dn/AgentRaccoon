import request from 'supertest'
import express from 'express'
import cors from 'cors'
import { AnalysisAgent } from '../src/agents/AnalysisAgent'
import { AnalysisRequest } from 'shared'

jest.mock('../src/agents/AnalysisAgent')

const app = express()
app.use(cors())
app.use(express.json())

const mockAnalysisAgent = new AnalysisAgent({
  type: 'analysis',
  model: 'gpt-3.5-turbo',
  temperature: 0.7
}) as jest.Mocked<AnalysisAgent>

app.post('/api/analyze', async (req, res) => {
  try {
    const request: AnalysisRequest = {
      id: `req_${Date.now()}`,
      type: req.body.type || 'statistical',
      data: req.body.data || [],
      parameters: req.body.parameters || {},
      createdAt: new Date()
    }

    const result = await mockAnalysisAgent.execute(request)
    res.json(result)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
    })
  })

  describe('POST /api/analyze', () => {
    it('should analyze data successfully', async () => {
      const mockResult = {
        id: 'result_123',
        requestId: 'req_123',
        status: 'completed' as const,
        result: {
          insights: [
            {
              type: 'summary' as const,
              title: 'Test Analysis',
              description: 'Mock analysis result',
              confidence: 0.9
            }
          ]
        },
        metadata: {
          processingTime: 1000,
          agentType: 'analysis',
          insights: ['Test Analysis']
        },
        createdAt: new Date(),
        completedAt: new Date()
      }

      mockAnalysisAgent.execute.mockResolvedValue(mockResult)

      const testData = [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 },
        { name: 'C', value: 15 }
      ]

      const response = await request(app)
        .post('/api/analyze')
        .send({
          type: 'statistical',
          data: testData,
          parameters: {}
        })
        .expect(200)

      // Check structure without date comparison since JSON serialization converts dates to strings
      expect(response.body).toMatchObject({
        id: mockResult.id,
        requestId: mockResult.requestId,
        status: mockResult.status,
        result: mockResult.result,
        metadata: mockResult.metadata
      })
      expect(response.body).toHaveProperty('createdAt')
      expect(response.body).toHaveProperty('completedAt')
      expect(mockAnalysisAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'statistical',
          data: testData,
          parameters: {}
        })
      )
    })

    it('should handle analysis errors', async () => {
      mockAnalysisAgent.execute.mockRejectedValue(new Error('Analysis failed'))

      const response = await request(app)
        .post('/api/analyze')
        .send({
          type: 'statistical',
          data: [],
          parameters: {}
        })
        .expect(500)

      expect(response.body).toHaveProperty('error', 'Analysis failed')
    })

    it('should use default values for missing parameters', async () => {
      const mockResult = {
        id: 'result_123',
        requestId: 'req_123',
        status: 'completed' as const,
        result: { insights: [] },
        createdAt: new Date()
      }

      mockAnalysisAgent.execute.mockResolvedValue(mockResult)

      const response = await request(app)
        .post('/api/analyze')
        .send({})
        .expect(200)

      expect(mockAnalysisAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'statistical',
          data: [],
          parameters: {}
        })
      )
    })
  })
})