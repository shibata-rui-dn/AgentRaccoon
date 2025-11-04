import * as sqlite3 from 'sqlite3'
import * as path from 'path'
import * as fs from 'fs'

export interface DatabaseInfo {
  id: string
  name: string
  displayName: string  // User-facing name (supports Japanese)
  tableName: string
  columns: string[]
  rowCount: number
  createdAt: Date
  filePath: string
}

export interface DatabaseRecord {
  [key: string]: any
}

export class DatabaseManager {
  private static instance: DatabaseManager
  private databases: Map<string, DatabaseInfo> = new Map()
  private dbPath: string
  private metadataPath: string

  private constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'databases')
    this.metadataPath = path.join(this.dbPath, 'metadata.json')
    this.ensureDirectoryExists()
    this.loadExistingDatabases()
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true })
    }
  }

  private loadExistingDatabases(): void {
    try {
      // Load metadata if exists
      const metadata = this.loadMetadata()

      const files = fs.readdirSync(this.dbPath)
      files.filter(file => file.endsWith('.db')).forEach(file => {
        const dbId = file.replace('.db', '')
        const displayName = metadata[dbId] || null
        this.loadDatabaseInfo(dbId, displayName)
      })
    } catch (error) {
      console.log('No existing databases found')
    }
  }

  private loadMetadata(): Record<string, string> {
    try {
      if (fs.existsSync(this.metadataPath)) {
        const data = fs.readFileSync(this.metadataPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.log('Could not load metadata, using defaults')
    }
    return {}
  }

  private saveMetadata(metadata: Record<string, string>): void {
    try {
      fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
    } catch (error) {
      console.error('Error saving metadata:', error)
    }
  }

  private loadDatabaseInfo(dbId: string, displayName: string | null = null): void {
    const dbFilePath = path.join(this.dbPath, `${dbId}.db`)
    if (!fs.existsSync(dbFilePath)) return

    const db = new sqlite3.Database(dbFilePath)

    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'", (err, row: any) => {
      if (err || !row) {
        db.close()
        return
      }

      const tableName = row.name

      db.all(`PRAGMA table_info(${tableName})`, (err, columns: any[]) => {
        if (err) {
          db.close()
          return
        }

        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, countRow: any) => {
          if (err) {
            db.close()
            return
          }

          const stats = fs.statSync(dbFilePath)

          this.databases.set(dbId, {
            id: dbId,
            name: tableName,
            displayName: displayName || tableName,
            tableName: tableName,
            columns: columns.map(col => col.name),
            rowCount: countRow.count,
            createdAt: stats.birthtime,
            filePath: dbFilePath
          })

          db.close()
        })
      })
    })
  }

  async createDatabase(name: string, headers: string[], data: any[]): Promise<string> {
    const dbId = `db_${Date.now()}`
    const dbFilePath = path.join(this.dbPath, `${dbId}.db`)
    const tableName = this.sanitizeTableName(name)
    const displayName = name  // Keep original name with Japanese characters

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbFilePath)

      // Create table with unique column names
      const sanitizedHeaders = this.makeUniqueColumnNames(headers.map(h => this.sanitizeColumnName(h)))
      const createTableQuery = `CREATE TABLE ${tableName} (${sanitizedHeaders.map(h => `"${h}" TEXT`).join(', ')})`

      db.run(createTableQuery, (err) => {
        if (err) {
          db.close()
          reject(err)
          return
        }

        // Insert data
        if (data.length === 0) {
          this.finalizeDatabaseCreation(db, dbId, tableName, displayName, sanitizedHeaders, 0)
          resolve(dbId)
          return
        }

        const placeholders = sanitizedHeaders.map(() => '?').join(', ')
        const insertQuery = `INSERT INTO ${tableName} (${sanitizedHeaders.map(h => `"${h}"`).join(', ')}) VALUES (${placeholders})`

        const stmt = db.prepare(insertQuery)
        let insertedCount = 0

        data.forEach((row, index) => {
          const values = sanitizedHeaders.map(header => {
            const originalHeader = headers[sanitizedHeaders.indexOf(header)]
            return row[originalHeader] || null
          })

          stmt.run(values, (err) => {
            if (err) {
              console.error(`Error inserting row ${index}:`, err)
            } else {
              insertedCount++
            }

            if (index === data.length - 1) {
              stmt.finalize((err) => {
                if (err) {
                  db.close()
                  reject(err)
                  return
                }

                this.finalizeDatabaseCreation(db, dbId, tableName, displayName, sanitizedHeaders, insertedCount)
                resolve(dbId)
              })
            }
          })
        })
      })
    })
  }

  private finalizeDatabaseCreation(db: sqlite3.Database, dbId: string, tableName: string, displayName: string, columns: string[], rowCount: number): void {
    const dbInfo: DatabaseInfo = {
      id: dbId,
      name: tableName,
      displayName: displayName,
      tableName: tableName,
      columns: columns,
      rowCount: rowCount,
      createdAt: new Date(),
      filePath: path.join(this.dbPath, `${dbId}.db`)
    }

    this.databases.set(dbId, dbInfo)

    // Save display name to metadata
    const metadata = this.loadMetadata()
    metadata[dbId] = displayName
    this.saveMetadata(metadata)

    db.close()
  }

  async getDatabaseList(): Promise<DatabaseInfo[]> {
    return Array.from(this.databases.values())
  }

  async getDatabaseData(dbId: string, page: number = 1, limit: number = 50): Promise<{ data: DatabaseRecord[], total: number, pages: number }> {
    const dbInfo = this.databases.get(dbId)
    if (!dbInfo) {
      throw new Error('Database not found')
    }

    const offset = (page - 1) * limit

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbInfo.filePath)

      db.get(`SELECT COUNT(*) as count FROM ${dbInfo.tableName}`, (err, countRow: any) => {
        if (err) {
          db.close()
          reject(err)
          return
        }

        const total = countRow.count
        const pages = Math.ceil(total / limit)

        db.all(`SELECT * FROM ${dbInfo.tableName} LIMIT ${limit} OFFSET ${offset}`, (err, rows: any[]) => {
          db.close()

          if (err) {
            reject(err)
            return
          }

          resolve({
            data: rows,
            total,
            pages
          })
        })
      })
    })
  }

  async previewData(dbId: string, limit: number = 5): Promise<DatabaseRecord[]> {
    const dbInfo = this.databases.get(dbId)
    if (!dbInfo) {
      throw new Error('Database not found')
    }

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbInfo.filePath)

      db.all(`SELECT * FROM ${dbInfo.tableName} LIMIT ${limit}`, (err, rows: any[]) => {
        db.close()

        if (err) {
          reject(err)
          return
        }

        resolve(rows)
      })
    })
  }

  async getColumnInfo(dbId: string, columnName?: string): Promise<any> {
    const dbInfo = this.databases.get(dbId)
    if (!dbInfo) {
      throw new Error('Database not found')
    }

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbInfo.filePath)

      const columns = columnName ? [columnName] : dbInfo.columns
      const columnStats: any = {}

      let processedColumns = 0

      columns.forEach(col => {
        const queries = [
          `SELECT COUNT("${col}") as count FROM ${dbInfo.tableName}`,
          `SELECT COUNT(DISTINCT "${col}") as unique_count FROM ${dbInfo.tableName}`,
          `SELECT COUNT(*) as null_count FROM ${dbInfo.tableName} WHERE "${col}" IS NULL OR "${col}" = ''`,
          `SELECT "${col}" as min_value FROM ${dbInfo.tableName} WHERE "${col}" IS NOT NULL AND "${col}" != '' ORDER BY "${col}" ASC LIMIT 1`,
          `SELECT "${col}" as max_value FROM ${dbInfo.tableName} WHERE "${col}" IS NOT NULL AND "${col}" != '' ORDER BY "${col}" DESC LIMIT 1`
        ]

        const stats: any = { column: col }

        let completedQueries = 0

        queries.forEach((query, index) => {
          db.get(query, (err, row: any) => {
            if (!err && row) {
              if (index === 0) stats.count = row.count
              if (index === 1) stats.uniqueCount = row.unique_count
              if (index === 2) stats.nullCount = row.null_count
              if (index === 3) stats.minValue = row.min_value
              if (index === 4) stats.maxValue = row.max_value
            }

            completedQueries++

            if (completedQueries === queries.length) {
              // Determine data type
              if (stats.minValue !== null && stats.minValue !== undefined) {
                if (!isNaN(Number(stats.minValue))) {
                  stats.dataType = 'number'
                } else if (!isNaN(Date.parse(stats.minValue))) {
                  stats.dataType = 'date'
                } else {
                  stats.dataType = 'string'
                }
              } else {
                stats.dataType = 'unknown'
              }

              columnStats[col] = stats
              processedColumns++

              if (processedColumns === columns.length) {
                db.close()
                resolve(columnName ? columnStats[columnName] : columnStats)
              }
            }
          })
        })
      })
    })
  }

  async getUniqueValues(dbId: string, columnName: string, limit: number = 10): Promise<any[]> {
    const dbInfo = this.databases.get(dbId)
    if (!dbInfo) {
      throw new Error('Database not found')
    }

    if (!dbInfo.columns.includes(columnName)) {
      throw new Error(`Column '${columnName}' not found in database`)
    }

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbInfo.filePath)

      const query = `
        SELECT "${columnName}" as value, COUNT(*) as count
        FROM ${dbInfo.tableName}
        WHERE "${columnName}" IS NOT NULL AND "${columnName}" != ''
        GROUP BY "${columnName}"
        ORDER BY count DESC
        LIMIT ${limit}
      `

      db.all(query, (err, rows: any[]) => {
        db.close()

        if (err) {
          reject(err)
          return
        }

        resolve(rows)
      })
    })
  }

  async updateDatabaseName(dbId: string, newName: string): Promise<boolean> {
    const dbInfo = this.databases.get(dbId)
    if (!dbInfo) {
      return false
    }

    try {
      // Update display name in metadata
      const metadata = this.loadMetadata()
      metadata[dbId] = newName
      this.saveMetadata(metadata)

      // Update in-memory database info
      dbInfo.displayName = newName
      this.databases.set(dbId, dbInfo)

      return true
    } catch (error) {
      console.error('Error updating database name:', error)
      return false
    }
  }

  async deleteDatabase(dbId: string): Promise<boolean> {
    const dbInfo = this.databases.get(dbId)
    if (!dbInfo) {
      return false
    }

    try {
      fs.unlinkSync(dbInfo.filePath)
      this.databases.delete(dbId)

      // Remove from metadata
      const metadata = this.loadMetadata()
      delete metadata[dbId]
      this.saveMetadata(metadata)

      return true
    } catch (error) {
      console.error('Error deleting database:', error)
      return false
    }
  }

  private sanitizeTableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50)
  }

  private sanitizeColumnName(name: string): string {
    // Convert to string and trim
    let sanitized = String(name || '').trim()

    // If empty, use default name
    if (!sanitized) {
      return 'col'
    }

    // SQLite supports UTF-8, so we keep Unicode characters
    // Only replace characters that could cause SQL issues
    // Replace whitespace and quotes with underscores
    sanitized = sanitized
      .replace(/\s+/g, '_')           // Replace whitespace with underscore
      .replace(/["'`]/g, '')          // Remove quotes
      .replace(/[;()]/g, '_')         // Replace SQL special chars
      .substring(0, 100)              // Increased limit for multi-byte chars

    // If the name is empty or only underscores after sanitization, use a default name
    if (!sanitized || sanitized.match(/^_+$/)) {
      sanitized = 'col'
    }

    return sanitized
  }

  private makeUniqueColumnNames(columnNames: string[]): string[] {
    const counts = new Map<string, number>()
    const uniqueNames: string[] = []

    columnNames.forEach(name => {
      if (!counts.has(name)) {
        counts.set(name, 0)
        uniqueNames.push(name)
      } else {
        const count = counts.get(name)! + 1
        counts.set(name, count)
        uniqueNames.push(`${name}_${count}`)
      }
    })

    return uniqueNames
  }
}