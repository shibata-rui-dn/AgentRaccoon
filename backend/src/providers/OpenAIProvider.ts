import OpenAI from 'openai'
import { ILLMProvider, LLMCompletionRequest, LLMCompletionResponse } from './ILLMProvider'

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async generateCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

    // GPT-5 models only support temperature: 1 (default)
    const requestParams: any = {
      model: request.model,
      messages,
      max_completion_tokens: request.maxTokens ?? 2000
    }

    // Only add temperature if not using GPT-5
    if (!request.model.includes('gpt-5')) {
      requestParams.temperature = request.temperature ?? 0.7
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
