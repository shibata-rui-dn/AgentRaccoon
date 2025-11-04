import { AnalysisAgent } from '../src/agents/AnalysisAgent'
import { BaseAgent } from '../src/agents/BaseAgent'
import { AnalysisRequest, AnalysisResult } from 'shared'

// Mock OpenAI
const mockCreate = jest.fn()

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  }
})

describe('AI Agents', () => {
  describe('BaseAgent', () => {
    it('should initialize with proper configuration', () => {
      const config = {
        type: 'analysis' as const,
        model: 'gpt-3.5-turbo',
        temperature: 0.7
      }

      // Create a concrete implementation for testing
      class TestAgent extends BaseAgent {
        async execute(input: any): Promise<any> {
          return input
        }
      }

      const agent = new TestAgent(config)
      expect(agent).toBeInstanceOf(BaseAgent)
    })
  })

  describe('AnalysisAgent', () => {
    let agent: AnalysisAgent
    const mockConfig = {
      type: 'analysis' as const,
      model: 'gpt-3.5-turbo',
      temperature: 0.7
    }

    beforeEach(() => {
      jest.clearAllMocks()
      agent = new AnalysisAgent(mockConfig)
    })

    it('should analyze statistical data successfully', async () => {
      const mockOpenAIResponse = JSON.stringify({
        insights: [
          {
            type: 'summary',
            title: 'Data Summary',
            description: 'The dataset contains 3 data points with values ranging from 10 to 20.',
            confidence: 0.9
          },
          {
            type: 'trend',
            title: 'Trend Analysis',
            description: 'Values show moderate variation with B being the highest.',
            confidence: 0.8
          }
        ]
      })

      // Mock the OpenAI completion
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: mockOpenAIResponse
            }
          }
        ]
      })

      const request: AnalysisRequest = {
        id: 'test_req_1',
        type: 'statistical',
        data: [
          { name: 'A', value: 10 },
          { name: 'B', value: 20 },
          { name: 'C', value: 15 }
        ],
        parameters: {},
        createdAt: new Date()
      }

      const result = await agent.execute(request)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('requestId', 'test_req_1')
      expect(result).toHaveProperty('status', 'completed')
      expect(result).toHaveProperty('result')
      expect(result.result).toHaveProperty('insights')

      const insights = result.result.insights
      expect(Array.isArray(insights)).toBe(true)
      expect(insights.length).toBe(2)

      expect(insights[0]).toHaveProperty('type', 'summary')
      expect(insights[0]).toHaveProperty('title', 'Data Summary')
      expect(insights[0]).toHaveProperty('confidence', 0.9)

      expect(result).toHaveProperty('metadata')
      expect(result.metadata).toHaveProperty('agentType', 'analysis')
    })

    it('should handle machine learning data analysis', async () => {
      const mockOpenAIResponse = JSON.stringify({
        insights: [
          {
            type: 'correlation',
            title: 'Feature Correlation',
            description: 'Strong correlation detected between feature1 and target variable.',
            confidence: 0.85
          }
        ]
      })

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: mockOpenAIResponse
            }
          }
        ]
      })

      const request: AnalysisRequest = {
        id: 'test_req_2',
        type: 'ml',
        data: [
          { feature1: 1.2, feature2: 2.3, target: 0 },
          { feature1: 2.1, feature2: 1.8, target: 1 },
          { feature1: 1.5, feature2: 2.1, target: 0 }
        ],
        parameters: { algorithm: 'classification' },
        createdAt: new Date()
      }

      const result = await agent.execute(request)

      expect(result.status).toBe('completed')
      expect(result.result.insights[0].type).toBe('correlation')
    })

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('OpenAI API Error'))

      const request: AnalysisRequest = {
        id: 'test_req_error',
        type: 'statistical',
        data: [{ value: 1 }],
        parameters: {},
        createdAt: new Date()
      }

      const result = await agent.execute(request)

      expect(result.status).toBe('failed')
      expect(result.error).toBe('OpenAI API Error')
      expect(result.requestId).toBe('test_req_error')
    })

    it('should handle invalid JSON response from OpenAI', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This is not valid JSON response from OpenAI'
            }
          }
        ]
      })

      const request: AnalysisRequest = {
        id: 'test_req_invalid_json',
        type: 'statistical',
        data: [{ value: 1 }],
        parameters: {},
        createdAt: new Date()
      }

      const result = await agent.execute(request)

      expect(result.status).toBe('completed')
      expect(result.result.insights).toHaveLength(1)
      expect(result.result.insights[0].type).toBe('summary')
      expect(result.result.insights[0].title).toBe('Analysis Summary')
      expect(result.result.insights[0].description).toContain('This is not valid JSON')
    })

    it('should include proper metadata in results', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                insights: [
                  {
                    type: 'summary',
                    title: 'Test Analysis',
                    description: 'Test description',
                    confidence: 0.9
                  }
                ]
              })
            }
          }
        ]
      })

      const request: AnalysisRequest = {
        id: 'test_metadata',
        type: 'visualization',
        data: [{ category: 'A', value: 100 }],
        parameters: { chartType: 'bar' },
        createdAt: new Date()
      }

      const result = await agent.execute(request)

      expect(result.metadata).toBeDefined()
      expect(result.metadata?.agentType).toBe('analysis')
      expect(result.metadata?.insights).toEqual(['Test Analysis'])
      expect(result.metadata?.processingTime).toBeDefined()
      expect(result.createdAt).toBeDefined()
      expect(result.completedAt).toBeDefined()
    })
  })
})