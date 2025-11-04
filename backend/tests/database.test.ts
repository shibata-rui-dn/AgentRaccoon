import { DatabaseManager, DatabaseInfo } from '../src/database/DatabaseManager'
import * as fs from 'fs'
import * as path from 'path'

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager
  const testDbPath = path.join(process.cwd(), 'data', 'databases')

  beforeAll(() => {
    // Ensure the database directory exists
    if (!fs.existsSync(testDbPath)) {
      fs.mkdirSync(testDbPath, { recursive: true })
    }
  })

  beforeEach(() => {
    dbManager = DatabaseManager.getInstance()
  })

  afterEach(async () => {
    // Clean up test databases
    const databases = await dbManager.getDatabaseList()
    for (const db of databases) {
      if (db.id.startsWith('db_')) {
        await dbManager.deleteDatabase(db.id)
      }
    }
  })

  describe('createDatabase', () => {
    it('should create a database with valid data', async () => {
      const name = 'test_table'
      const headers = ['id', 'name', 'age']
      const data = [
        { id: '1', name: 'Alice', age: '30' },
        { id: '2', name: 'Bob', age: '25' },
        { id: '3', name: 'Charlie', age: '35' }
      ]

      const dbId = await dbManager.createDatabase(name, headers, data)

      expect(dbId).toBeDefined()
      expect(dbId).toMatch(/^db_\d+$/)

      const dbList = await dbManager.getDatabaseList()
      const createdDb = dbList.find(db => db.id === dbId)

      expect(createdDb).toBeDefined()
      expect(createdDb?.name).toBe(name)
      expect(createdDb?.columns).toEqual(headers)
      expect(createdDb?.rowCount).toBe(3)
    })

    it('should create an empty database with no data', async () => {
      const name = 'empty_table'
      const headers = ['column1', 'column2']
      const data: any[] = []

      const dbId = await dbManager.createDatabase(name, headers, data)

      expect(dbId).toBeDefined()

      const dbList = await dbManager.getDatabaseList()
      const createdDb = dbList.find(db => db.id === dbId)

      expect(createdDb).toBeDefined()
      expect(createdDb?.rowCount).toBe(0)
    })

    it('should sanitize table names with special characters', async () => {
      const name = 'test-table@2024!'
      const headers = ['id']
      const data = [{ id: '1' }]

      const dbId = await dbManager.createDatabase(name, headers, data)

      expect(dbId).toBeDefined()

      const dbList = await dbManager.getDatabaseList()
      const createdDb = dbList.find(db => db.id === dbId)

      // Table name should be sanitized (special characters replaced with underscores)
      expect(createdDb?.name).toMatch(/^test_table_2024_$/)
    })

    it('should sanitize column names with special characters', async () => {
      const name = 'test_table'
      const headers = ['user-id', 'user.name', 'user email']
      const data = [{ 'user-id': '1', 'user.name': 'Test', 'user email': 'test@example.com' }]

      const dbId = await dbManager.createDatabase(name, headers, data)

      expect(dbId).toBeDefined()

      const dbList = await dbManager.getDatabaseList()
      const createdDb = dbList.find(db => db.id === dbId)

      expect(createdDb).toBeDefined()
      // Column names should be sanitized
      expect(createdDb?.columns).toEqual(['user_id', 'user_name', 'user_email'])
    })

    it('should handle null values in data', async () => {
      const name = 'test_null'
      const headers = ['id', 'name', 'optional']
      const data = [
        { id: '1', name: 'Alice' }, // 'optional' is missing
        { id: '2', name: 'Bob', optional: 'value' }
      ]

      const dbId = await dbManager.createDatabase(name, headers, data)

      expect(dbId).toBeDefined()

      const result = await dbManager.getDatabaseData(dbId)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].optional).toBeNull()
      expect(result.data[1].optional).toBe('value')
    })
  })

  describe('getDatabaseList', () => {
    it('should return empty array when no databases exist', async () => {
      const dbList = await dbManager.getDatabaseList()
      expect(Array.isArray(dbList)).toBe(true)
    })

    it('should return list of created databases', async () => {
      const dbId1 = await dbManager.createDatabase('table1', ['col1'], [{ col1: 'data1' }])
      const dbId2 = await dbManager.createDatabase('table2', ['col2'], [{ col2: 'data2' }])

      const dbList = await dbManager.getDatabaseList()

      expect(dbList.length).toBeGreaterThanOrEqual(2)

      const db1 = dbList.find(db => db.id === dbId1)
      const db2 = dbList.find(db => db.id === dbId2)

      expect(db1).toBeDefined()
      expect(db2).toBeDefined()
      expect(db1?.name).toBe('table1')
      expect(db2?.name).toBe('table2')
    })
  })

  describe('getDatabaseData', () => {
    it('should retrieve all data from database', async () => {
      const headers = ['id', 'name', 'value']
      const data = [
        { id: '1', name: 'Item1', value: '100' },
        { id: '2', name: 'Item2', value: '200' },
        { id: '3', name: 'Item3', value: '300' }
      ]

      const dbId = await dbManager.createDatabase('test_data', headers, data)
      const result = await dbManager.getDatabaseData(dbId)

      expect(result.data).toHaveLength(3)
      expect(result.total).toBe(3)
      expect(result.pages).toBe(1)
      expect(result.data[0]).toMatchObject({ id: '1', name: 'Item1', value: '100' })
    })

    it('should support pagination', async () => {
      const headers = ['id', 'value']
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        value: `value${i + 1}`
      }))

      const dbId = await dbManager.createDatabase('test_pagination', headers, data)

      // Get first page (50 items)
      const page1 = await dbManager.getDatabaseData(dbId, 1, 50)
      expect(page1.data).toHaveLength(50)
      expect(page1.total).toBe(100)
      expect(page1.pages).toBe(2)
      expect(page1.data[0].id).toBe('1')

      // Get second page (50 items)
      const page2 = await dbManager.getDatabaseData(dbId, 2, 50)
      expect(page2.data).toHaveLength(50)
      expect(page2.total).toBe(100)
      expect(page2.pages).toBe(2)
      expect(page2.data[0].id).toBe('51')
    })

    it('should throw error for non-existent database', async () => {
      await expect(dbManager.getDatabaseData('non_existent_db')).rejects.toThrow('Database not found')
    })
  })

  describe('deleteDatabase', () => {
    it('should delete existing database', async () => {
      const dbId = await dbManager.createDatabase('to_delete', ['col1'], [{ col1: 'data' }])

      const dbListBefore = await dbManager.getDatabaseList()
      const existsBefore = dbListBefore.some(db => db.id === dbId)
      expect(existsBefore).toBe(true)

      const deleted = await dbManager.deleteDatabase(dbId)
      expect(deleted).toBe(true)

      const dbListAfter = await dbManager.getDatabaseList()
      const existsAfter = dbListAfter.some(db => db.id === dbId)
      expect(existsAfter).toBe(false)
    })

    it('should return false for non-existent database', async () => {
      const deleted = await dbManager.deleteDatabase('non_existent_db')
      expect(deleted).toBe(false)
    })

    it('should delete the physical database file', async () => {
      const dbId = await dbManager.createDatabase('file_delete_test', ['col1'], [{ col1: 'data' }])
      const dbFilePath = path.join(testDbPath, `${dbId}.db`)

      expect(fs.existsSync(dbFilePath)).toBe(true)

      await dbManager.deleteDatabase(dbId)

      expect(fs.existsSync(dbFilePath)).toBe(false)
    })
  })

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DatabaseManager.getInstance()
      const instance2 = DatabaseManager.getInstance()

      expect(instance1).toBe(instance2)
    })
  })
})
