import { AgentConfig } from 'shared'
import { ILLMProvider, LLMProviderFactory, LLMMessage } from '../providers'

export abstract class BaseAgent {
  protected llmProvider: ILLMProvider
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.llmProvider = LLMProviderFactory.createProvider()
    this.config = config
  }

  protected async generateCompletion(
    prompt: string,
    systemMessage?: string
  ): Promise<string> {
    const messages: LLMMessage[] = []

    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage })
    }

    messages.push({ role: 'user', content: prompt })

    const response = await this.llmProvider.generateCompletion({
      messages,
      model: this.config.model,
      maxTokens: this.config.maxTokens ?? 2000,
      temperature: this.config.temperature ?? 0.7
    })

    return response.content
  }

  abstract execute(input: any): Promise<any>
}