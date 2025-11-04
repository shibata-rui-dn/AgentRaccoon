import { GoogleGenerativeAI } from '@google/generative-ai'
import { ILLMProvider, LLMCompletionRequest, LLMCompletionResponse } from './ILLMProvider'

export class GeminiProvider implements ILLMProvider {
  private client: GoogleGenerativeAI

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey)
  }

  async generateCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const model = this.client.getGenerativeModel({ model: request.model })

    // Combine system and user messages into a single prompt
    // Gemini doesn't have a separate system message concept
    let fullPrompt = ''

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        fullPrompt += `System Instructions: ${msg.content}\n\n`
      } else if (msg.role === 'user') {
        fullPrompt += msg.content
      }
    }

    const generationConfig = {
      maxOutputTokens: request.maxTokens ?? 2000,
      temperature: request.temperature ?? 0.7
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig
    })

    const response = result.response
    const text = response.text()

    return {
      content: text,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount,
        completionTokens: response.usageMetadata?.candidatesTokenCount,
        totalTokens: response.usageMetadata?.totalTokenCount
      }
    }
  }
}
