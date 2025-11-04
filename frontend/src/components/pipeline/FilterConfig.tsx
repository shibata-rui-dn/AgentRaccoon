import React from 'react'
import { FilterCondition } from 'shared'
import { NodeConfigProps } from './types'

const FilterConfig: React.FC<NodeConfigProps> = ({
  config,
  availableFields,
  onConfigChange,
  onConvertToCustom
}) => {
  const conditions: FilterCondition[] = config.conditions || []

  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    onConfigChange(newConfig)
  }

  const addCondition = () => {
    const newConditions = [...conditions, { field: '', operator: 'eq' as const, value: '' }]
    handleChange('conditions', newConditions)
  }

  const updateCondition = (index: number, key: keyof FilterCondition, value: any) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], [key]: value }
    handleChange('conditions', newConditions)
  }

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index)
    handleChange('conditions', newConditions)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          フィルター条件
        </label>
        <button
          onClick={addCondition}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + 追加
        </button>
      </div>

      {conditions.map((condition, index) => (
        <div key={index} className="p-3 border border-gray-200 rounded space-y-2">
          {availableFields.length > 0 ? (
            <select
              value={condition.field}
              onChange={(e) => updateCondition(index, 'field', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            >
              <option value="">フィールドを選択...</option>
              {availableFields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="フィールド名"
              value={condition.field}
              onChange={(e) => updateCondition(index, 'field', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          )}
          <select
            value={condition.operator}
            onChange={(e) => updateCondition(index, 'operator', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          >
            <option value="eq">等しい</option>
            <option value="ne">等しくない</option>
            <option value="gt">より大きい</option>
            <option value="gte">以上</option>
            <option value="lt">より小さい</option>
            <option value="lte">以下</option>
            <option value="contains">含む</option>
            <option value="startsWith">で始まる</option>
            <option value="endsWith">で終わる</option>
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="値"
              value={condition.value}
              onChange={(e) => updateCondition(index, 'value', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <button
              onClick={() => removeCondition(index)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              削除
            </button>
          </div>
        </div>
      ))}

      {onConvertToCustom && (
        <button
          onClick={onConvertToCustom}
          className="mt-3 w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
        >
          カスタムノードに変換
        </button>
      )}
    </div>
  )
}

export default FilterConfig
