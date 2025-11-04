import React from 'react'
import { DatabaseInfo } from 'shared'
import { NodeConfigProps } from './types'

interface DataSourceConfigProps extends NodeConfigProps {
  databases: DatabaseInfo[]
}

const DataSourceConfig: React.FC<DataSourceConfigProps> = ({
  config,
  databases,
  onConfigChange
}) => {
  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    onConfigChange(newConfig)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          データベースを選択
        </label>
        <select
          value={config.databaseId || ''}
          onChange={(e) => handleChange('databaseId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">データベースを選択...</option>
          {databases.map(db => (
            <option key={db.id} value={db.id}>
              {db.displayName || db.name} ({db.rowCount} 件)
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default DataSourceConfig
