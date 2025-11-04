import React from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity } from 'lucide-react'

export interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'scatter'
  xAxis?: string
  yAxis?: string | string[]
  pieColumn?: string  // 後方互換性のため残す（非推奨）
  pieSortBy?: 'frequency' | 'name'  // 後方互換性のため残す（非推奨）
}

interface ChartConfigPanelProps {
  config: ChartConfig
  availableColumns: string[]
  onChange: (config: ChartConfig) => void
  showTitle?: boolean
}

const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
  config,
  availableColumns,
  onChange,
  showTitle = true
}) => {
  const chartType = config.chartType || 'bar'
  const xAxis = config.xAxis || ''
  const yAxis = Array.isArray(config.yAxis) ? config.yAxis : config.yAxis ? [config.yAxis] : []

  const handleChartTypeChange = (type: 'bar' | 'line' | 'pie' | 'scatter') => {
    onChange({ ...config, chartType: type })
  }

  const handleXAxisChange = (value: string) => {
    onChange({ ...config, xAxis: value })
  }

  const toggleYAxis = (column: string) => {
    const currentYAxis = Array.isArray(config.yAxis) ? config.yAxis : config.yAxis ? [config.yAxis] : []
    const newYAxis = currentYAxis.includes(column)
      ? currentYAxis.filter(c => c !== column)
      : [...currentYAxis, column]
    onChange({ ...config, yAxis: newYAxis })
  }

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return <BarChart3 className="h-4 w-4" />
      case 'line': return <LineChartIcon className="h-4 w-4" />
      case 'pie': return <PieChartIcon className="h-4 w-4" />
      case 'scatter': return <Activity className="h-4 w-4" />
      default: return <BarChart3 className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <>
          <div>
            <h3 className="text-sm font-medium text-gray-900">グラフ設定</h3>
          </div>
          <Separator />
        </>
      )}

      {/* チャートタイプ選択 */}
      <div className="space-y-2">
        <Label>グラフの種類</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { type: 'bar' as const, label: '棒グラフ' },
            { type: 'line' as const, label: '折れ線' },
            { type: 'pie' as const, label: '円グラフ' },
            { type: 'scatter' as const, label: '散布図' }
          ].map(({ type, label }) => (
            <Button
              key={type}
              variant={chartType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleChartTypeChange(type)}
              className="justify-start gap-2"
            >
              {getChartIcon(type)}
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* 円グラフ用の設定 */}
      {chartType === 'pie' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
            <p className="text-xs text-blue-800">
              円グラフには事前に集計されたデータが必要です。<br />
              集計ノードでカテゴリごとにグループ化・集計してから、円グラフノードに接続してください。
            </p>
          </div>

          <div className="space-y-2">
            <Label>カテゴリ列（名前）</Label>
            <Select value={xAxis} onValueChange={handleXAxisChange}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリ列を選択" />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              各セクションのラベルとなる列（例: 商品名、地域名）
            </p>
          </div>

          <div className="space-y-2">
            <Label>値列（サイズ）</Label>
            <Select
              value={Array.isArray(yAxis) && yAxis.length > 0 ? yAxis[0] : ''}
              onValueChange={(value) => onChange({ ...config, yAxis: [value] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="値列を選択" />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              各セクションの大きさを決める数値列（例: 売上合計、個数）
            </p>
          </div>
        </>
      )}

      {/* X軸選択 */}
      {chartType !== 'pie' && (
        <div className="space-y-2">
          <Label>X軸</Label>
          <Select value={xAxis} onValueChange={handleXAxisChange}>
            <SelectTrigger>
              <SelectValue placeholder="列を選択" />
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Y軸選択 */}
      {chartType !== 'pie' && (
        <div className="space-y-2">
          <Label>Y軸 (複数選択可)</Label>
          <div className="flex flex-wrap gap-2">
            {availableColumns.map((column) => (
              <Badge
                key={column}
                variant={yAxis.includes(column) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleYAxis(column)}
              >
                {column}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ChartConfigPanel
