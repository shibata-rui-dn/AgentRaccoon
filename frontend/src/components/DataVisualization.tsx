import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { VisualizationData } from 'shared'

interface DataVisualizationProps {
  visualization: VisualizationData
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

const DataVisualization: React.FC<DataVisualizationProps> = ({ visualization }) => {
  const { type, data, config } = visualization

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        表示するデータがありません
      </div>
    )
  }

  // X軸でデータをソートする関数
  const sortDataByXAxis = (data: any[], xKey?: string) => {
    if (!xKey) return data

    return [...data].sort((a, b) => {
      const aVal = a[xKey]
      const bVal = b[xKey]

      // null/undefinedチェック
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      // 数値の場合
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal
      }

      // 文字列を数値に変換できる場合
      const aNum = Number(aVal)
      const bNum = Number(bVal)
      if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
        return aNum - bNum
      }

      // 日付の場合
      const aDate = new Date(aVal)
      const bDate = new Date(bVal)
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        return aDate.getTime() - bDate.getTime()
      }

      // 文字列の場合
      return String(aVal).localeCompare(String(bVal))
    })
  }

  const renderLineChart = () => {
    const yKeys = config.yKeys || []
    const sortedData = sortDataByXAxis(data, config.xKey)

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={config.xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  const renderBarChart = () => {
    const yKeys = config.yKeys || []
    const sortedData = sortDataByXAxis(data, config.xKey)

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={config.xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const renderScatterChart = () => {
    const yKeys = config.yKeys || []
    const sortedData = sortDataByXAxis(data, config.xKey)

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={config.xKey} />
          <YAxis dataKey={yKeys[0]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Scatter
            name={config.title || 'Data'}
            data={sortedData}
            fill={COLORS[0]}
          />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  const renderPieChart = () => {
    // 円グラフは事前に集計されたデータを使用
    // データ形式: [{ name: 'カテゴリ名', value: 数値 }, ...]
    // または、nameKey/valueKeyで指定されたフィールドを持つオブジェクトの配列

    const nameKey = config.nameKey || config.xKey || 'name'
    const valueKey = config.valueKey || (config.yKeys && config.yKeys[0]) || 'value'

    // データが空の場合
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          表示するデータがありません
        </div>
      )
    }

    // 必要なフィールドが存在するか確認
    const hasRequiredFields = data.every(row =>
      (nameKey in row) && (valueKey in row)
    )

    if (!hasRequiredFields) {
      return (
        <div className="text-center py-8 text-gray-500">
          円グラフには事前に集計されたデータが必要です。<br />
          カテゴリ列（{nameKey}）と値列（{valueKey}）を含むデータを用意してください。
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius="70%"
            label
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      {config.title && (
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex-shrink-0">
          {config.title}
        </h3>
      )}

      <div className="flex-1 min-h-0">
        {type === 'line' && renderLineChart()}
        {type === 'bar' && renderBarChart()}
        {type === 'scatter' && renderScatterChart()}
        {type === 'pie' && renderPieChart()}
        {type === 'heatmap' && (
          <div className="text-center py-8 text-gray-500">
            ヒートマップは近日公開予定
          </div>
        )}
      </div>
    </div>
  )
}

export default DataVisualization
