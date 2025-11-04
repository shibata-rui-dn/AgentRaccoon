export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMCompletionRequest {
  messages: LLMMessage[]
  model: string
  maxTokens?: number
  temperature?: number
}

export interface LLMCompletionResponse {
  content: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export interface ILLMProvider {
  generateCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse>
}
