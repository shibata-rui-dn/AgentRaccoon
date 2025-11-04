export interface AnalysisRequest {
  id: string
  type: 'statistical' | 'ml' | 'visualization'
  data: any[]
  parameters: Record<string, any>
  createdAt: Date
}

export interface AnalysisResult {
  id: string
  requestId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: any
  error?: string
  metadata?: {
    processingTime?: number
    agentType?: string
    insights?: string[]
  }
  createdAt: Date
  completedAt?: Date
}

export interface AgentConfig {
  type: 'analysis' | 'report' | 'workflow'
  model: string
  temperature?: number
  maxTokens?: number
}

export interface AnalysisInsight {
  type: 'correlation' | 'trend' | 'anomaly' | 'summary'
  title: string
  description: string
  confidence: number
  data?: any
}

export interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'heatmap'
  data: any[]
  config: Record<string, any>
}

export interface DatabaseInfo {
  id: string
  name: string
  displayName: string  // User-facing name (supports Japanese)
  tableName: string
  columns: string[]
  rowCount: number
  createdAt: Date
  filePath: string
}

export interface DatabaseRecord {
  [key: string]: any
}

export interface DatabaseListResponse {
  databases: DatabaseInfo[]
}

export interface DatabaseDataResponse {
  data: DatabaseRecord[]
  total: number
  pages: number
}

// Pipeline types
export type NodeType = 'dataSource' | 'filter' | 'transform' | 'aggregate' | 'join' | 'visualization' | 'custom' | 'dashboard'

export interface PipelineNode {
  id: string
  type: NodeType
  label: string
  config: NodeConfig
  position?: { x: number; y: number }
}

export interface NodeConfig {
  // Data Source config
  databaseId?: string
  tableName?: string
  isInitial?: boolean  // Flag to indicate if this is the initial data source (no input handle)

  // Filter config
  conditions?: FilterCondition[]

  // Transform config
  transformations?: TransformOperation[]

  // Aggregate config
  groupBy?: string[]
  aggregations?: AggregationOperation[]

  // Join config
  joinType?: 'inner' | 'left' | 'right' | 'outer'
  joinCondition?: JoinCondition

  // Visualization config
  chartType?: 'line' | 'bar' | 'scatter' | 'pie' | 'heatmap'
  xAxis?: string  // X-axis field for bar/line/scatter, or category field (name) for pie
  yAxis?: string | string[]  // Y-axis fields for bar/line/scatter, or value field for pie
  nameKey?: string  // For pie chart (deprecated, use xAxis)
  valueKey?: string // For pie chart (deprecated, use yAxis)
  pieColumn?: string // For pie chart auto-aggregation (deprecated - pre-aggregate data instead)
  pieSortBy?: 'frequency' | 'name' // For pie chart sorting (deprecated)
  chartConfig?: Record<string, any>

  // Custom config
  customCode?: string  // JavaScript code for custom processing
}

export interface FilterCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith'
  value: any
}

export interface TransformOperation {
  type: 'rename' | 'calculate' | 'cast' | 'extract' | 'drop'
  sourceField?: string
  targetField?: string
  expression?: string
  dataType?: 'string' | 'number' | 'date' | 'boolean'
  dropFields?: string[]  // For drop operation
}

export interface AggregationOperation {
  field: string
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct'
  alias: string
}

export interface JoinCondition {
  leftField: string
  rightField: string
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface Pipeline {
  id: string
  name: string
  description?: string
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  createdAt: Date
  updatedAt: Date
}

export interface LeafNodeResult {
  nodeId: string
  nodeLabel: string
  nodeType: NodeType
  data: any[]
}

export interface PipelineExecutionResult {
  pipelineId: string
  status: 'success' | 'error'
  data?: any[] // 後方互換性のため残す（非推奨）
  leafResults?: LeafNodeResult[] // 葉ノードの結果配列
  error?: string
  executionTime?: number
  nodeResults?: Record<string, any[]>
}

export interface PipelineListResponse {
  pipelines: Pipeline[]
}

export interface VisualizationData {
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'heatmap'
  data: any[]
  config: {
    xKey?: string
    yKeys?: string[]
    nameKey?: string
    valueKey?: string
    pieColumn?: string
    pieSortBy?: 'frequency' | 'name'
    title?: string
    [key: string]: any
  }
}

// Pipeline Builder Agent types
export interface PipelineBuilderRequest {
  userRequest: string
  availableDatabases?: DatabaseInfo[]
  existingPipelineId?: string
  existingPipelineName?: string
  existingPipelineDescription?: string
  existingNodes?: PipelineNode[]
  existingEdges?: PipelineEdge[]
}

export interface PipelineBuilderResponse {
  success: boolean
  pipeline?: Pipeline
  message?: string
  steps?: PipelineBuilderStep[]
  error?: string
}

export interface PipelineBuilderStep {
  action: 'add_node' | 'connect_nodes' | 'configure_node' | 'complete'
  description: string
  nodeId?: string
  nodeType?: NodeType
  config?: NodeConfig
  sourceId?: string
  targetId?: string
}

// Dashboard types
export type DashboardElementType = 'bar' | 'line' | 'scatter' | 'pie' | 'table'

export interface DashboardElement {
  id: string
  name: string
  type: DashboardElementType | null
  x: number
  y: number
  width: number
  height: number
  pipelineId: string | null
  leafNodeId: string | null
  config?: any
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  elements: DashboardElement[]
  createdAt: Date
  updatedAt: Date
}

export interface DashboardListResponse {
  dashboards: Dashboard[]
}