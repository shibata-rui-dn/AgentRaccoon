import request from 'supertest'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import { AnalysisAgent } from '../src/agents/AnalysisAgent'
import { ExcelReader } from '../src/utils/excelReader'
import { AnalysisRequest } from 'shared'

// Mock OpenAI for integration tests
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    insights: [
                      {
                        type: 'summary',
                        title: 'Personal Data Analysis',
                        description: 'Analysis of personal information dataset with demographics and preferences.',
                        confidence: 0.9
                      },
                      {
                        type: 'trend',
                        title: 'Age Distribution',
                        description: 'Age ranges from young adults to middle-aged individuals.',
                        confidence: 0.8
                      }
                    ]
                  })
                }
              }
            ]
          })
        }
      }
    }))
  }
})

const app = express()
app.use(cors())
app.use(express.json())

const upload = multer({
  dest: 'test-uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files are allowed'))
    }
  }
})

const analysisAgent = new AnalysisAgent({
  type: 'analysis',
  model: 'gpt-3.5-turbo',
  temperature: 0.7
})

// Mock endpoint for Excel analysis
app.post('/api/analyze-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const excelData = ExcelReader.readFile(req.file.path)
    const data = ExcelReader.parseDataForAnalysis(excelData)

    const request: AnalysisRequest = {
      id: `req_${Date.now()}`,
      type: req.body.type || 'statistical',
      data: data,
      parameters: req.body.parameters || {},
      createdAt: new Date()
    }

    const result = await analysisAgent.execute(request)
    res.json({
      ...result,
      metadata: {
        ...result.metadata,
        originalHeaders: excelData.headers,
        dataCount: data.length
      }
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

describe('Integration Tests', () => {
  const dummyFilePath = path.join(__dirname, '../../test/data/dummy.xlsx')

  beforeAll(() => {
    // Create test-uploads directory
    const fs = require('fs')
    if (!fs.existsSync('test-uploads')) {
      fs.mkdirSync('test-uploads')
    }
  })

  afterAll(() => {
    // Cleanup test-uploads directory
    const fs = require('fs')
    if (fs.existsSync('test-uploads')) {
      const files = fs.readdirSync('test-uploads')
      files.forEach((file: string) => {
        fs.unlinkSync(path.join('test-uploads', file))
      })
      fs.rmdirSync('test-uploads')
    }
  })

  describe('Excel File Analysis Workflow', () => {
    it('should analyze dummy.xlsx file end-to-end', async () => {
      const response = await request(app)
        .post('/api/analyze-excel')
        .attach('file', dummyFilePath)
        .field('type', 'statistical')
        .field('parameters', JSON.stringify({ includeCharts: true }))
        .expect(200)

      // Verify response structure
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('status', 'completed')
      expect(response.body).toHaveProperty('result')
      expect(response.body).toHaveProperty('metadata')

      // Verify analysis results
      const result = response.body.result
      expect(result).toHaveProperty('insights')
      expect(Array.isArray(result.insights)).toBe(true)
      expect(result.insights.length).toBeGreaterThan(0)

      // Verify metadata includes Excel-specific information
      const metadata = response.body.metadata
      expect(metadata).toHaveProperty('originalHeaders')
      expect(metadata).toHaveProperty('dataCount')
      expect(metadata).toHaveProperty('agentType', 'analysis')

      expect(Array.isArray(metadata.originalHeaders)).toBe(true)
      expect(metadata.originalHeaders.length).toBeGreaterThan(0)
      expect(metadata.dataCount).toBeGreaterThan(0)

      // Log results for verification
      console.log('Analysis completed with headers:', metadata.originalHeaders)
      console.log('Data count:', metadata.dataCount)
      console.log('Insights generated:', result.insights.length)
    })

    it('should handle different analysis types with dummy data', async () => {
      const analysisTypes = ['statistical', 'ml', 'visualization']

      for (const type of analysisTypes) {
        const response = await request(app)
          .post('/api/analyze-excel')
          .attach('file', dummyFilePath)
          .field('type', type)
          .expect(200)

        expect(response.body.status).toBe('completed')
        expect(response.body.result.insights).toBeDefined()

        console.log(`${type} analysis completed with ${response.body.result.insights.length} insights`)
      }
    })

    it('should reject non-Excel files', async () => {
      // Create a temporary text file for testing
      const fs = require('fs')
      const tempFile = path.join(__dirname, 'temp.txt')
      fs.writeFileSync(tempFile, 'This is not an Excel file')

      try {
        await request(app)
          .post('/api/analyze-excel')
          .attach('file', tempFile)
          .field('type', 'statistical')
          .expect(500) // Multer will reject the file, causing an error

      } finally {
        // Cleanup
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
        }
      }
    })

    it('should handle missing file upload', async () => {
      const response = await request(app)
        .post('/api/analyze-excel')
        .field('type', 'statistical')
        .expect(400)

      expect(response.body).toHaveProperty('error', 'No file uploaded')
    })
  })

  describe('Data Processing Pipeline', () => {
    it('should process dummy data through complete pipeline', () => {
      // Test the complete data processing pipeline
      const excelData = ExcelReader.readFile(dummyFilePath)
      expect(excelData).toHaveProperty('headers')
      expect(excelData).toHaveProperty('data')

      const analysisData = ExcelReader.parseDataForAnalysis(excelData)
      expect(analysisData.length).toBeGreaterThan(0)

      // Verify data structure is suitable for AI analysis
      analysisData.forEach(row => {
        expect(typeof row).toBe('object')
        expect(Object.keys(row).length).toBeGreaterThan(0)
      })

      console.log('Pipeline test completed:')
      console.log('- Headers:', excelData.headers.length)
      console.log('- Raw rows:', excelData.data.length)
      console.log('- Processed rows:', analysisData.length)
    })
  })
})