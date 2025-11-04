import * as fs from 'fs'
import csv from 'csv-parser'

export interface CsvData {
  headers: string[]
  data: Record<string, any>[]
}

export class CsvReader {
  static async readFile(filePath: string, useFirstRowAsHeaders: boolean = true): Promise<CsvData> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    return new Promise((resolve, reject) => {
      const results: Record<string, any>[] = []
      let headers: string[] = []
      let rawRows: any[][] = []
      let isFirstRow = true

      if (useFirstRowAsHeaders) {
        // Use csv-parser which treats first row as headers
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('headers', (headerList: string[]) => {
            headers = this.makeUniqueHeaders(headerList)
          })
          .on('data', (data: Record<string, any>) => {
            results.push(data)
          })
          .on('end', () => {
            resolve({
              headers,
              data: results
            })
          })
          .on('error', (error: Error) => {
            reject(error)
          })
      } else {
        // Don't use first row as headers, generate column names
        fs.createReadStream(filePath)
          .pipe(csv({ headers: false }))
          .on('data', (row: any) => {
            if (isFirstRow) {
              // Determine column count from first row
              const columnCount = Object.keys(row).length
              headers = Array.from({ length: columnCount }, (_, i) => `Column_${i + 1}`)
              isFirstRow = false
            }
            results.push(row)
          })
          .on('end', () => {
            resolve({
              headers,
              data: results
            })
          })
          .on('error', (error: Error) => {
            reject(error)
          })
      }
    })
  }

  private static makeUniqueHeaders(headers: string[]): string[] {
    const counts = new Map<string, number>()
    const uniqueHeaders: string[] = []

    headers.forEach(header => {
      if (!counts.has(header)) {
        counts.set(header, 0)
        uniqueHeaders.push(header)
      } else {
        const count = counts.get(header)! + 1
        counts.set(header, count)
        uniqueHeaders.push(`${header}_${count}`)
      }
    })

    return uniqueHeaders
  }

  static parseDataForAnalysis(csvData: CsvData): any[] {
    return csvData.data.map(row => {
      const cleanRow: Record<string, any> = {}
      Object.keys(row).forEach(key => {
        const value = row[key]
        if (value !== null && value !== undefined && value !== '') {
          // Try to parse numbers
          if (!isNaN(Number(value)) && value.toString().trim() !== '') {
            cleanRow[key] = Number(value)
          } else {
            cleanRow[key] = value
          }
        }
      })
      return cleanRow
    }).filter(row => Object.keys(row).length > 0)
  }
}