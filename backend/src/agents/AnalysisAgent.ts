import { BaseAgent } from './BaseAgent'
import { AnalysisRequest, AnalysisResult, AnalysisInsight } from 'shared'

export class AnalysisAgent extends BaseAgent {
  async execute(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      const systemMessage = `You are an expert data analyst. Analyze the provided data and generate insights.
      Always respond with valid JSON containing insights array with type, title, description, and confidence fields.`

      const prompt = `Analyze this data:
      Type: ${request.type}
      Data: ${JSON.stringify(request.data)}
      Parameters: ${JSON.stringify(request.parameters)}

      Provide statistical insights, trends, and recommendations.`

      const response = await this.generateCompletion(prompt, systemMessage)

      let insights: AnalysisInsight[] = []
      try {
        const parsed = JSON.parse(response)
        insights = parsed.insights || []
      } catch {
        insights = [{
          type: 'summary',
          title: 'Analysis Summary',
          description: response.substring(0, 500),
          confidence: 0.8
        }]
      }

      return {
        id: `result_${Date.now()}`,
        requestId: request.id,
        status: 'completed',
        result: { insights },
        metadata: {
          processingTime: Date.now(),
          agentType: 'analysis',
          insights: insights.map(i => i.title)
        },
        createdAt: new Date(),
        completedAt: new Date()
      }
    } catch (error) {
      return {
        id: `result_${Date.now()}`,
        requestId: request.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date()
      }
    }
  }
}