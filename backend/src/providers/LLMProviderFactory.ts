import { ILLMProvider } from './ILLMProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { AzureOpenAIProvider } from './AzureOpenAIProvider'
import { GeminiProvider } from './GeminiProvider'

export type ProviderType = 'openai' | 'azure' | 'gemini'

export class LLMProviderFactory {
  static createProvider(type?: string): ILLMProvider {
    const providerType = (type || process.env.LLM_PROVIDER || 'openai').toLowerCase() as ProviderType

    switch (providerType) {
      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY is required for OpenAI provider')
        }
        return new OpenAIProvider(apiKey)
      }

      case 'azure': {
        const apiKey = process.env.AZURE_OPENAI_API_KEY
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION

        if (!apiKey || !endpoint) {
          throw new Error('AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT are required for Azure OpenAI provider')
        }

        return new AzureOpenAIProvider(apiKey, endpoint, apiVersion)
      }

      case 'gemini': {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY is required for Gemini provider')
        }
        return new GeminiProvider(apiKey)
      }

      default:
        throw new Error(`Unsupported LLM provider: ${providerType}`)
    }
  }

  static getDefaultModel(): string {
    const providerType = (process.env.LLM_PROVIDER || 'openai').toLowerCase() as ProviderType

    switch (providerType) {
      case 'openai':
        return process.env.OPENAI_MODEL || 'gpt-4'
      case 'azure':
        return process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4'
      case 'gemini':
        return process.env.GEMINI_MODEL || 'gemini-1.5-pro'
      default:
        return 'gpt-4'
    }
  }
}
