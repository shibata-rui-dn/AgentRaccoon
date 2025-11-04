import React from 'react'
import { NodeConfigProps } from './types'
import ChartConfigPanel, { ChartConfig } from '../ChartConfigPanel'

const VisualizationConfig: React.FC<NodeConfigProps> = ({
  config,
  availableFields,
  onConfigChange
}) => {
  // NodeConfigからChartConfigへの変換
  const chartConfig: ChartConfig = {
    chartType: (config.chartType as 'bar' | 'line' | 'pie' | 'scatter') || 'bar',
    xAxis: config.xAxis,
    yAxis: config.yAxis,
    pieColumn: config.pieColumn,
    pieSortBy: (config.pieSortBy as 'frequency' | 'name') || 'frequency'
  }

  const handleChartConfigChange = (newChartConfig: ChartConfig) => {
    // ChartConfigからNodeConfigへの変換
    const newConfig = {
      ...config,
      chartType: newChartConfig.chartType,
      xAxis: newChartConfig.xAxis,
      yAxis: newChartConfig.yAxis,
      pieColumn: newChartConfig.pieColumn,
      pieSortBy: newChartConfig.pieSortBy
    }
    onConfigChange(newConfig)
  }

  return (
    <ChartConfigPanel
      config={chartConfig}
      availableColumns={availableFields}
      onChange={handleChartConfigChange}
      showTitle={false}
    />
  )
}

export default VisualizationConfig
