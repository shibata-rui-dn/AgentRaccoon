import React, { useState } from 'react'

interface CreateDatabaseFormProps {
  onDatabaseCreated: () => void
}

const CreateDatabaseForm: React.FC<CreateDatabaseFormProps> = ({ onDatabaseCreated }) => {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [useFirstRowAsHeaders, setUseFirstRowAsHeaders] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      const validTypes = ['.xlsx', '.xls', '.csv']
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))

      if (validTypes.includes(fileExtension)) {
        setFile(selectedFile)
        setError(null)

        // Auto-fill name based on filename if name is empty
        if (!name) {
          const fileName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'))
          setName(fileName)
        }
      } else {
        setError('Please select a valid Excel (.xlsx, .xls) or CSV file')
        setFile(null)
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!name.trim()) {
      setError('Database name is required')
      return
    }

    if (!file) {
      setError('Please select a file')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', name.trim())
      formData.append('useFirstRowAsHeaders', String(useFirstRowAsHeaders))

      const response = await fetch('/api/database/create', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setName('')
        setFile(null)
        onDatabaseCreated()

        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
      } else {
        setError(result.error || 'Failed to create database')
      }
    } catch (error) {
      console.error('Error creating database:', error)
      setError('Failed to create database. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="database-name" className="block text-sm font-medium text-gray-700 mb-2">
          Database Name
        </label>
        <input
          id="database-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter database name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
          Upload File
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
          <div className="space-y-1 text-center">
            {file ? (
              <div className="text-sm text-gray-600">
                <div className="flex items-center justify-center mb-2">
                  <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            ) : (
              <>
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  Excel (.xlsx, .xls) or CSV files up to 10MB
                </p>
              </>
            )}
          </div>
        </div>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="sr-only"
        />
      </div>

      <div className="flex items-center">
        <input
          id="use-first-row-headers"
          type="checkbox"
          checked={useFirstRowAsHeaders}
          onChange={(e) => setUseFirstRowAsHeaders(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="use-first-row-headers" className="ml-2 block text-sm text-gray-700">
          Use first row as column headers
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end space-x-3">
        <button
          type="submit"
          disabled={isLoading || !name.trim() || !file}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isLoading ? 'Creating Database...' : 'Create Database'}
        </button>
      </div>
    </form>
  )
}

export default CreateDatabaseForm