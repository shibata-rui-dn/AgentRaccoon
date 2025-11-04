import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

process.env.NODE_ENV = 'test'
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-api-key'