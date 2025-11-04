import React from 'react'
import { NodeConfigProps } from './types'

const CustomConfig: React.FC<NodeConfigProps> = ({
  config,
  onConfigChange
}) => {
  const customCode = config.customCode || ''

  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    onConfigChange(newConfig)
  }

  const defaultCode = `function process(data) {
  // 単一入力の場合
  // data: 入力データの配列
  // 例: [{ id: 1, name: "田中", age: 30 }, ...]

  // フィルター例: 年齢が30以上のデータのみ
  // return data.filter(row => row.age >= 30);

  // 変換例: 新しいフィールドを追加
  // return data.map(row => ({
  //   ...row,
  //   ageGroup: row.age >= 30 ? 'senior' : 'junior'
  // }));

  return data; // 配列を返す必要があります
}

// 複数入力の場合（最大5つ）
// function process(input1, input2, input3, input4, input5) {
//   // input1, input2, ...: それぞれの入力データの配列
//
//   // 結合例: 2つの配列を結合
//   // return [...input1, ...input2];
//
//   // マージ例: IDでマッチングして統合
//   // return input1.map(row1 => {
//   //   const row2 = input2.find(r => r.id === row1.id) || {};
//   //   return { ...row1, ...row2 };
//   // });
//
//   // return [...input1]; // 配列を返す必要があります
// }`

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          JavaScriptコード
        </label>
        <textarea
          value={customCode}
          onChange={(e) => handleChange('customCode', e.target.value)}
          placeholder={defaultCode}
          className="w-full h-96 px-3 py-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          spellCheck={false}
        />
        <div className="mt-2 text-xs text-gray-600 space-y-1">
          <p><strong>関数形式:</strong></p>
          <p className="ml-2">• 単一入力: function process(data) {'{ return data; }'}</p>
          <p className="ml-2">• 複数入力: function process(input1, input2, ...) {'{ return data; }'}</p>
          <p><strong>引数:</strong> データの配列（複数入力の場合は最大5つ）</p>
          <p><strong>返り値:</strong> 処理後のデータ配列</p>
          <p><strong>使用可能:</strong> Array, Object, String, Number, Boolean, Math, Date, JSON, console.log</p>
          <p className="text-blue-600"><strong>ヒント:</strong> カスタムノードは最大5つの入力を受け取れます（左側のハンドル）</p>
          <p className="text-amber-600"><strong>注意:</strong> セキュリティのため、一部の機能は制限されています</p>
        </div>
      </div>
    </div>
  )
}

export default CustomConfig
