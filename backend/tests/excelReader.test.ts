import { ExcelReader } from '../src/utils/excelReader'
import path from 'path'

describe('ExcelReader', () => {
  const dummyFilePath = path.join(__dirname, '../../test/data/dummy.xlsx')

  describe('readFile', () => {
    it('should read dummy Excel file successfully', () => {
      const result = ExcelReader.readFile(dummyFilePath)

      expect(result).toHaveProperty('headers')
      expect(result).toHaveProperty('rows')
      expect(result).toHaveProperty('data')

      expect(Array.isArray(result.headers)).toBe(true)
      expect(Array.isArray(result.rows)).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)

      expect(result.headers.length).toBeGreaterThan(0)
      expect(result.data.length).toBeGreaterThan(0)

      // Check that data objects have properties matching headers
      if (result.data.length > 0) {
        const firstRow = result.data[0]
        result.headers.forEach(header => {
          expect(firstRow).toHaveProperty(header)
        })
      }
    })

    it('should throw error for non-existent file', () => {
      expect(() => {
        ExcelReader.readFile('non-existent-file.xlsx')
      }).toThrow('File not found')
    })

    it('should handle empty Excel file gracefully', () => {
      // Mock both fs.existsSync and xlsx.readFile to simulate empty file
      const fs = require('fs')
      const XLSX = require('xlsx')

      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true)
      const readFileSpy = jest.spyOn(XLSX, 'readFile').mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      })
      const sheetToJsonSpy = jest.spyOn(XLSX.utils, 'sheet_to_json').mockReturnValue([])

      expect(() => {
        ExcelReader.readFile('mock-empty-file.xlsx')
      }).toThrow('Empty Excel file')

      existsSyncSpy.mockRestore()
      readFileSpy.mockRestore()
      sheetToJsonSpy.mockRestore()
    })
  })

  describe('parseDataForAnalysis', () => {
    it('should parse Excel data for analysis', () => {
      const mockExcelData = {
        headers: ['Name', 'Age', 'City', 'Empty'],
        rows: [
          ['John', 25, 'Tokyo', ''],
          ['Jane', 30, 'Osaka', null],
          ['Bob', '', 'Kyoto', undefined]
        ],
        data: [
          { Name: 'John', Age: 25, City: 'Tokyo', Empty: '' },
          { Name: 'Jane', Age: 30, City: 'Osaka', Empty: null },
          { Name: 'Bob', Age: '', City: 'Kyoto', Empty: undefined }
        ]
      }

      const result = ExcelReader.parseDataForAnalysis(mockExcelData)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(3)

      // Check that empty/null/undefined values are cleaned
      result.forEach(row => {
        Object.values(row).forEach(value => {
          expect(value).not.toBe('')
          expect(value).not.toBe(null)
          expect(value).not.toBe(undefined)
        })
      })

      // First row should have Name, Age, City (not Empty)
      expect(result[0]).toEqual({ Name: 'John', Age: 25, City: 'Tokyo' })

      // Second row should have Name, Age, City (not Empty)
      expect(result[1]).toEqual({ Name: 'Jane', Age: 30, City: 'Osaka' })

      // Third row should have Name, City (not Age or Empty)
      expect(result[2]).toEqual({ Name: 'Bob', City: 'Kyoto' })
    })

    it('should filter out completely empty rows', () => {
      const mockExcelData = {
        headers: ['Name', 'Age'],
        rows: [
          ['John', 25],
          ['', ''],
          [null, undefined],
          ['Jane', 30]
        ],
        data: [
          { Name: 'John', Age: 25 },
          { Name: '', Age: '' },
          { Name: null, Age: undefined },
          { Name: 'Jane', Age: 30 }
        ]
      }

      const result = ExcelReader.parseDataForAnalysis(mockExcelData)

      expect(result.length).toBe(2)
      expect(result[0]).toEqual({ Name: 'John', Age: 25 })
      expect(result[1]).toEqual({ Name: 'Jane', Age: 30 })
    })
  })

  describe('Integration test with dummy data', () => {
    it('should process dummy.xlsx file end-to-end', () => {
      const excelData = ExcelReader.readFile(dummyFilePath)
      const analysisData = ExcelReader.parseDataForAnalysis(excelData)

      expect(analysisData.length).toBeGreaterThan(0)

      // Log the structure for debugging
      console.log('Headers:', excelData.headers)
      console.log('Sample data:', analysisData.slice(0, 2))
      console.log('Total rows:', analysisData.length)

      // Verify that all analysis data has at least one meaningful field
      analysisData.forEach(row => {
        expect(Object.keys(row).length).toBeGreaterThan(0)
      })
    })
  })
})