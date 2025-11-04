import OpenAI from 'openai'
import { ILLMProvider, LLMCompletionRequest, LLMCompletionResponse } from './ILLMProvider'

export class AzureOpenAIProvider implements ILLMProvider {
  private client: OpenAI

  constructor(apiKey: string, endpoint: string, apiVersion: string = '2024-02-15-preview') {
    this.client = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/openai/deployments`,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey }
    })
  }

  async generateCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: request.model, // deployment name in Azure
      messages,
      max_tokens: request.maxTokens ?? 2000,
      temperature: request.temperature ?? 0.7
    }

    const completion = await this.client.chat.completions.create(requestParams)

    return {
      content: completion.choices[0]?.message?.content || '',
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens
      }
    }
  }
}
