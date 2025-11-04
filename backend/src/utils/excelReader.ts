import * as XLSX from 'xlsx'
import * as fs from 'fs'

export interface ExcelData {
  headers: string[]
  rows: any[][]
  data: Record<string, any>[]
}

export class ExcelReader {
  static readFile(filePath: string, useFirstRowAsHeaders: boolean = true): ExcelData {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length === 0) {
      throw new Error('Empty Excel file')
    }

    let headers: string[]
    let rows: any[][]

    if (useFirstRowAsHeaders) {
      headers = this.makeUniqueHeaders(jsonData[0].map((h, i) => h ? String(h) : `Column_${i + 1}`))
      rows = jsonData.slice(1)
    } else {
      // Generate default column names
      const columnCount = jsonData[0]?.length || 0
      headers = Array.from({ length: columnCount }, (_, i) => `Column_${i + 1}`)
      rows = jsonData
    }

    const data = rows.map(row => {
      const obj: Record<string, any> = {}
      headers.forEach((header, index) => {
        obj[header] = row[index] || null
      })
      return obj
    })

    return {
      headers,
      rows,
      data
    }
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

  static parseDataForAnalysis(excelData: ExcelData): any[] {
    return excelData.data.map(row => {
      const cleanRow: Record<string, any> = {}
      Object.keys(row).forEach(key => {
        const value = row[key]
        if (value !== null && value !== undefined && value !== '') {
          cleanRow[key] = value
        }
      })
      return cleanRow
    }).filter(row => Object.keys(row).length > 0)
  }
}