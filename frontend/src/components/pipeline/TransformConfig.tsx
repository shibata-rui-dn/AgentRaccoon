import React, { useState } from 'react'
import { TransformOperation } from 'shared'
import { validateExpression } from '../../utils/fieldUtils'
import { NodeConfigProps } from './types'

const TransformConfig: React.FC<NodeConfigProps> = ({
  config,
  availableFields,
  onConfigChange,
  onConvertToCustom
}) => {
  const transformations: TransformOperation[] = config.transformations || []
  const [expressionErrors, setExpressionErrors] = useState<Record<number, string>>({})

  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    onConfigChange(newConfig)
  }

  const addTransformation = () => {
    const newTransformations = [...transformations, { type: 'rename' as const, targetField: '' }]
    handleChange('transformations', newTransformations)
  }

  const updateTransformation = (index: number, key: string, value: any) => {
    const newTransformations = [...transformations]
    newTransformations[index] = { ...newTransformations[index], [key]: value }
    handleChange('transformations', newTransformations)

    // Clear error if type is changed away from calculate
    if (key === 'type' && value !== 'calculate') {
      setExpressionErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })
    }

    // Validate expression if it's a calculate type
    if (key === 'expression' && newTransformations[index].type === 'calculate') {
      const error = validateExpression(value, availableFields)
      setExpressionErrors(prev => {
        const newErrors = { ...prev }
        if (error) {
          newErrors[index] = error
        } else {
          delete newErrors[index]
        }
        return newErrors
      })
    }
  }

  const removeTransformation = (index: number) => {
    const newTransformations = transformations.filter((_, i) => i !== index)
    handleChange('transformations', newTransformations)

    // Clear error for this index and reindex remaining errors
    setExpressionErrors(prev => {
      const newErrors: Record<number, string> = {}
      Object.keys(prev).forEach(key => {
        const idx = parseInt(key)
        if (idx < index) {
          newErrors[idx] = prev[idx]
        } else if (idx > index) {
          newErrors[idx - 1] = prev[idx]
        }
      })
      return newErrors
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          変換処理
        </label>
        <button
          onClick={addTransformation}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + 追加
        </button>
      </div>

      {transformations.map((transform, index) => (
        <div key={index} className="p-3 border border-gray-200 rounded space-y-2">
          <select
            value={transform.type}
            onChange={(e) => updateTransformation(index, 'type', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          >
            <option value="rename">フィールド名変更</option>
            <option value="calculate">計算</option>
            <option value="cast">型変換</option>
            <option value="extract">抽出</option>
            <option value="drop">列削除</option>
          </select>

          {/* Rename: sourceField + targetField */}
          {transform.type === 'rename' && (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">元のフィールド</label>
                {availableFields.length > 0 ? (
                  <select
                    value={transform.sourceField || ''}
                    onChange={(e) => updateTransformation(index, 'sourceField', e.target.value)}
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
                    placeholder="元のフィールド名"
                    value={transform.sourceField || ''}
                    onChange={(e) => updateTransformation(index, 'sourceField', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">新しいフィールド名</label>
                <input
                  type="text"
                  placeholder="新しいフィールド名"
                  value={transform.targetField}
                  onChange={(e) => updateTransformation(index, 'targetField', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </>
          )}

          {/* Calculate: expression + targetField */}
          {transform.type === 'calculate' && (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">計算式</label>
                <input
                  type="text"
                  placeholder="例: price * quantity"
                  value={transform.expression || ''}
                  onChange={(e) => updateTransformation(index, 'expression', e.target.value)}
                  className={`w-full px-2 py-1 text-sm border rounded ${
                    expressionErrors[index] ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {expressionErrors[index] && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <span>⚠</span>
                    <span>{expressionErrors[index]}</span>
                  </p>
                )}
                {!expressionErrors[index] && transform.expression && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <span>✓</span>
                    <span>計算式は正しい形式です</span>
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  フィールド名を使って計算式を入力（例: price * 1.1, field1 + field2）
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">結果フィールド名</label>
                <input
                  type="text"
                  placeholder="新しいフィールド名"
                  value={transform.targetField}
                  onChange={(e) => updateTransformation(index, 'targetField', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </>
          )}

          {/* Cast: sourceField + dataType + targetField */}
          {transform.type === 'cast' && (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">変換するフィールド</label>
                {availableFields.length > 0 ? (
                  <select
                    value={transform.sourceField || ''}
                    onChange={(e) => updateTransformation(index, 'sourceField', e.target.value)}
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
                    value={transform.sourceField || ''}
                    onChange={(e) => updateTransformation(index, 'sourceField', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">変換先の型</label>
                <select
                  value={transform.dataType || 'string'}
                  onChange={(e) => updateTransformation(index, 'dataType', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="string">文字列</option>
                  <option value="number">数値</option>
                  <option value="boolean">真偽値</option>
                  <option value="date">日付</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">結果フィールド名</label>
                <input
                  type="text"
                  placeholder="新しいフィールド名（省略時は元と同じ）"
                  value={transform.targetField}
                  onChange={(e) => updateTransformation(index, 'targetField', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </>
          )}

          {/* Extract: sourceField + expression + targetField */}
          {transform.type === 'extract' && (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">抽出元フィールド</label>
                {availableFields.length > 0 ? (
                  <select
                    value={transform.sourceField || ''}
                    onChange={(e) => updateTransformation(index, 'sourceField', e.target.value)}
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
                    value={transform.sourceField || ''}
                    onChange={(e) => updateTransformation(index, 'sourceField', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">抽出パターン（正規表現）</label>
                <input
                  type="text"
                  placeholder="例: [0-9]+"
                  value={transform.expression || ''}
                  onChange={(e) => updateTransformation(index, 'expression', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  正規表現で抽出パターンを指定
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">結果フィールド名</label>
                <input
                  type="text"
                  placeholder="新しいフィールド名"
                  value={transform.targetField}
                  onChange={(e) => updateTransformation(index, 'targetField', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </>
          )}

          {/* Drop: dropFields */}
          {transform.type === 'drop' && (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">削除する列を選択</label>
                <div className="space-y-2">
                  {availableFields.map(field => (
                    <label key={field} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(transform.dropFields || []).includes(field)}
                        onChange={(e) => {
                          const currentDropFields = transform.dropFields || []
                          const newDropFields = e.target.checked
                            ? [...currentDropFields, field]
                            : currentDropFields.filter(f => f !== field)
                          updateTransformation(index, 'dropFields', newDropFields)
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{field}</span>
                    </label>
                  ))}
                </div>
                {availableFields.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    利用可能なフィールドがありません
                  </p>
                )}
                {(transform.dropFields || []).length > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    {transform.dropFields!.length} 列が削除されます
                  </p>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => removeTransformation(index)}
            className="text-red-600 hover:text-red-700 text-sm"
          >
            削除
          </button>
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

export default TransformConfig
