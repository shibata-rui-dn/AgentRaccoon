import React from 'react'
import { AggregationOperation } from 'shared'
import { NodeConfigProps } from './types'

const AggregateConfig: React.FC<NodeConfigProps> = ({
  config,
  availableFields,
  onConfigChange,
  onConvertToCustom
}) => {
  const groupBy: string[] = config.groupBy || []
  const aggregations: AggregationOperation[] = config.aggregations || []

  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    onConfigChange(newConfig)
  }

  const addGroupBy = () => {
    handleChange('groupBy', [...groupBy, ''])
  }

  const updateGroupBy = (index: number, value: string) => {
    const newGroupBy = [...groupBy]
    newGroupBy[index] = value
    handleChange('groupBy', newGroupBy)
  }

  const removeGroupBy = (index: number) => {
    const newGroupBy = groupBy.filter((_, i) => i !== index)
    handleChange('groupBy', newGroupBy)
  }

  const addAggregation = () => {
    const newAggregations = [...aggregations, { field: '', function: 'sum' as const, alias: '' }]
    handleChange('aggregations', newAggregations)
  }

  const updateAggregation = (index: number, key: keyof AggregationOperation, value: any) => {
    const newAggregations = [...aggregations]
    newAggregations[index] = { ...newAggregations[index], [key]: value }
    handleChange('aggregations', newAggregations)
  }

  const removeAggregation = (index: number) => {
    const newAggregations = aggregations.filter((_, i) => i !== index)
    handleChange('aggregations', newAggregations)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            グループ化
          </label>
          <button
            onClick={addGroupBy}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + 追加
          </button>
        </div>
        {groupBy.map((field, index) => (
          <div key={index} className="flex gap-2 mb-2">
            {availableFields.length > 0 ? (
              <select
                value={field}
                onChange={(e) => updateGroupBy(index, e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="">フィールドを選択...</option>
                {availableFields.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="フィールド名"
                value={field}
                onChange={(e) => updateGroupBy(index, e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              />
            )}
            <button
              onClick={() => removeGroupBy(index)}
              className="text-red-600 hover:text-red-700 text-sm px-2"
            >
              削除
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            集計処理
          </label>
          <button
            onClick={addAggregation}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + 追加
          </button>
        </div>
        {aggregations.map((agg, index) => (
          <div key={index} className="p-3 border border-gray-200 rounded space-y-2 mb-2">
            {availableFields.length > 0 ? (
              <select
                value={agg.field}
                onChange={(e) => updateAggregation(index, 'field', e.target.value)}
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
                value={agg.field}
                onChange={(e) => updateAggregation(index, 'field', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            )}
            <select
              value={agg.function}
              onChange={(e) => updateAggregation(index, 'function', e.target.value as any)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            >
              <option value="sum">合計</option>
              <option value="avg">平均</option>
              <option value="min">最小値</option>
              <option value="max">最大値</option>
              <option value="count">件数</option>
              <option value="distinct">ユニーク件数</option>
            </select>
            <input
              type="text"
              placeholder="エイリアス（新しいフィールド名）"
              value={agg.alias}
              onChange={(e) => updateAggregation(index, 'alias', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <button
              onClick={() => removeAggregation(index)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              削除
            </button>
          </div>
        ))}
      </div>

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

export default AggregateConfig
