import { BaseAgent } from './BaseAgent'
import {
  PipelineBuilderRequest,
  PipelineBuilderResponse,
  PipelineBuilderStep,
  Pipeline,
  PipelineNode,
  PipelineEdge,
  NodeType,
  NodeConfig
} from 'shared'
import OpenAI from 'openai'
import { DatabaseManager } from '../database/DatabaseManager'
import { OpenAIProvider } from '../providers/OpenAIProvider'

interface ToolCall {
  name: string
  arguments: any
}

export class PipelineBuilderAgent extends BaseAgent {
  private dbManager: DatabaseManager
  private openai: OpenAI

  constructor(config: any) {
    super(config)
    this.dbManager = DatabaseManager.getInstance()

    // PipelineBuilderAgent requires OpenAI for Function Calling
    // Currently only OpenAI and Azure OpenAI support function calling
    const provider = process.env.LLM_PROVIDER || 'openai'
    if (provider === 'openai') {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    } else if (provider === 'azure') {
      this.openai = new OpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments`,
        defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
        defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
      })
    } else {
      throw new Error(`PipelineBuilderAgent requires OpenAI or Azure OpenAI provider. Current provider: ${provider}`)
    }
  }

  private availableTools = [
    {
      type: 'function' as const,
      function: {
        name: 'add_node',
        description: 'Add a new node to the pipeline',
        parameters: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'Unique identifier for the node'
            },
            nodeType: {
              type: 'string',
              enum: ['dataSource', 'filter', 'transform', 'aggregate', 'visualization', 'custom', 'dashboard'],
              description: 'Type of the node'
            },
            label: {
              type: 'string',
              description: 'Display label for the node'
            },
            config: {
              type: 'object',
              description: 'Configuration for the node. Must include appropriate settings based on nodeType.',
              properties: {
                databaseId: {
                  type: 'string',
                  description: 'Database ID (required for dataSource nodes)'
                },
                tableName: { type: 'string' },
                conditions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string', description: 'Field name to filter' },
                      operator: {
                        type: 'string',
                        enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith'],
                        description: 'Comparison operator'
                      },
                      value: { description: 'Value to compare against (string, number, etc)' }
                    },
                    required: ['field', 'operator', 'value']
                  },
                  description: 'Filter conditions array (required for filter nodes). Example: [{"field": "age", "operator": "lte", "value": 30}]'
                },
                transformations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['rename', 'calculate', 'cast', 'extract', 'drop']
                      },
                      sourceField: { type: 'string' },
                      targetField: { type: 'string' },
                      expression: { type: 'string' },
                      dataType: { type: 'string', enum: ['string', 'number', 'date', 'boolean'] }
                    }
                  },
                  description: 'Transformation operations (required for transform nodes)'
                },
                groupBy: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Fields to group by (required for aggregate nodes)'
                },
                aggregations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      function: {
                        type: 'string',
                        enum: ['sum', 'avg', 'min', 'max', 'count', 'distinct']
                      },
                      alias: { type: 'string' }
                    },
                    required: ['field', 'function', 'alias']
                  },
                  description: 'Aggregation operations (required for aggregate nodes)'
                },
                chartType: {
                  type: 'string',
                  enum: ['line', 'bar', 'scatter', 'pie', 'heatmap'],
                  description: 'Chart type (required for visualization nodes)'
                },
                xAxis: {
                  type: 'string',
                  description: 'X-axis field or category field for pie chart (required for visualization nodes)'
                },
                yAxis: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Y-axis fields for bar/line/scatter charts, or value field for pie chart'
                },
                customCode: {
                  type: 'string',
                  description: 'JavaScript code for custom processing (required for custom nodes). The code should define a function that takes input data and returns processed data.'
                }
              }
            }
          },
          required: ['nodeId', 'nodeType', 'label']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'connect_nodes',
        description: 'Connect two nodes with an edge. For custom nodes with multiple inputs, specify which input handle to connect to.',
        parameters: {
          type: 'object',
          properties: {
            sourceId: {
              type: 'string',
              description: 'ID of the source node'
            },
            targetId: {
              type: 'string',
              description: 'ID of the target node'
            },
            targetHandle: {
              type: 'string',
              description: 'Target input handle ID for custom nodes (e.g., "input-0", "input-1", etc.). Custom nodes have 5 input handles (input-0 to input-4). Use this to specify which input the data should connect to. For non-custom nodes, omit this parameter.',
              enum: ['input-0', 'input-1', 'input-2', 'input-3', 'input-4']
            }
          },
          required: ['sourceId', 'targetId']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'complete_pipeline',
        description: 'Complete the pipeline building process',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Summary message about the pipeline'
            }
          },
          required: ['message']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'preview_data',
        description: 'Preview the first N rows of data from a database to understand data structure and values',
        parameters: {
          type: 'object',
          properties: {
            databaseId: {
              type: 'string',
              description: 'ID of the database to preview'
            },
            limit: {
              type: 'number',
              description: 'Number of rows to preview (default: 5, max: 10)'
            }
          },
          required: ['databaseId']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_column_info',
        description: 'Get statistical information about columns (data type, unique values count, min/max values, null count)',
        parameters: {
          type: 'object',
          properties: {
            databaseId: {
              type: 'string',
              description: 'ID of the database'
            },
            columnName: {
              type: 'string',
              description: 'Specific column name to get info for (optional, if not provided returns info for all columns)'
            }
          },
          required: ['databaseId']
        }
      }
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_unique_values',
        description: 'Get unique values and their frequency for a specific column (useful for categorical data)',
        parameters: {
          type: 'object',
          properties: {
            databaseId: {
              type: 'string',
              description: 'ID of the database'
            },
            columnName: {
              type: 'string',
              description: 'Column name to get unique values for'
            },
            limit: {
              type: 'number',
              description: 'Number of unique values to return (default: 10)'
            }
          },
          required: ['databaseId', 'columnName']
        }
      }
    }
  ]

  async execute(request: PipelineBuilderRequest): Promise<PipelineBuilderResponse> {
    try {
      // Preserve all existing nodes and edges
      const existingNodes = request.existingNodes || []
      const existingEdges = request.existingEdges || []

      const nodes: PipelineNode[] = [...existingNodes]
      const edges: PipelineEdge[] = [...existingEdges]
      const steps: PipelineBuilderStep[] = []

      const systemMessage = `You are a pipeline builder assistant. Your role is to help users create data processing pipelines by analyzing their requirements and building the appropriate nodes.

CRITICAL RULES:
1. ONLY create nodes that are explicitly requested by the user
2. If user asks for filtering ONLY, create ONLY filter nodes (no visualization)
3. If user asks for aggregation ONLY, create ONLY aggregate nodes
4. If user asks for visualization, create visualization nodes
5. ALWAYS provide complete configuration for each node type
6. PREFER custom nodes for complex or unique processing logic that doesn't fit standard node types
7. IMPORTANT: Use data inspection tools when needed to understand the data before creating nodes
   - Use preview_data to see actual data values and understand the data structure
   - Use get_column_info to understand data types and value ranges
   - Use get_unique_values to see categorical values and exact strings for filtering

Data Inspection Tools:
- **preview_data**: Preview first N rows of data to understand structure and values
- **get_column_info**: Get statistics about columns (data type, unique count, min/max, null count)
- **get_unique_values**: Get unique values and frequency for categorical columns

Available Node Types:
- **dataSource**: Load data from a database
- **filter**: Filter data based on conditions
- **transform**: Transform data (rename, calculate, cast, extract, drop fields)
- **aggregate**: Aggregate data with grouping and aggregation functions
- **visualization**: Visualize data with charts
- **custom**: Custom processing with JavaScript code (RECOMMENDED for unique requirements)
- **dashboard**: Display multiple visualizations

Node Configuration Requirements:
- **dataSource**: MUST include "databaseId" (get from available databases list)

- **filter**: MUST include "conditions" array with {field, operator, value}
  * Operators: eq (equal), ne (not equal), gt (>), gte (>=), lt (<), lte (<=), contains, startsWith, endsWith
  * Example: conditions: [{"field": "age", "operator": "lte", "value": 30}]

- **transform**: MUST include "transformations" array
  * Types: rename, calculate, cast, extract, drop

- **aggregate**: MUST include "groupBy" array and "aggregations" array
  * Functions: sum, avg, min, max, count, distinct
  * Example: groupBy: ["month"], aggregations: [{"field": "sales", "function": "avg", "alias": "avg_sales"}]

- **visualization**: MUST include "chartType", "xAxis", and "yAxis"
  * Chart types: line, bar, scatter, pie, heatmap
  * For bar/line/scatter: xAxis = category field, yAxis = value fields (array)
  * For pie chart: xAxis = category field (name), yAxis = value field (array with single item)
  * **IMPORTANT for pie chart**: Data MUST be pre-aggregated before visualization
    - Use aggregate node BEFORE pie chart to group and sum/count values
    - Example workflow: dataSource → aggregate (groupBy category, sum values) → visualization (pie)
    - DO NOT use raw unaggregated data for pie charts

- **custom**: MUST include "customCode" with JavaScript function
  * **CRITICAL**: Custom nodes support MULTIPLE INPUTS (up to 5 inputs via input-0 to input-4)
  * **Function signature depends on number of inputs:**
    - Single input: function process(data) { ... }
    - Multiple inputs: function process(input1, input2, input3, ...) { ... }
  * **When connecting multiple data sources to a custom node:**
    1. Use connect_nodes with targetHandle parameter (input-0, input-1, etc.)
    2. Connect first data source to input-0, second to input-1, etc.
    3. Write custom code with multiple parameters: function process(data1, data2, ...) { ... }
  * Example workflow with 2 data sources:
    - connect_nodes: sourceId=dataSource1, targetId=customNode, targetHandle=input-0
    - connect_nodes: sourceId=dataSource2, targetId=customNode, targetHandle=input-1
    - customCode: function process(purchases, prices) { /* merge logic */ return merged; }
  * Use this for complex logic, calculations, or data transformations not covered by standard nodes
  * **IMPORTANT**: ALWAYS preserve original data fields unless user explicitly requests to exclude them
  * Use spread operator {...row} to preserve original fields when adding new ones
  * Example (GOOD): customCode: "function process(data) { return data.map(row => ({ ...row, calculated: row.a + row.b })); }"
  * Example (BAD): customCode: "function process(data) { return data.map(row => ({ calculated: row.a + row.b })); }" // Lost original fields!
  * When expanding arrays/lists, consider if original row data should be preserved:
    - If expanding purchase list: Include customer info with each item
    - Example: return items.map(item => ({ ...row, item: item, original_list: undefined }))

Workflow:
1. Analyze user request carefully
2. Identify what operations are needed
3. Choose appropriate node types (prefer custom nodes for unique processing)
4. **IMPORTANT: When user mentions multiple data sources or data merging:**
   - Create a custom node to handle the merge/join logic
   - Connect EACH data source to the custom node using DIFFERENT targetHandle values
   - Example: connect_nodes(sourceId=ds1, targetId=custom, targetHandle=input-0)
   - Example: connect_nodes(sourceId=ds2, targetId=custom, targetHandle=input-1)
   - Write custom code with multiple parameters: function process(data1, data2) { ... }
5. Create ONLY the requested nodes with COMPLETE configurations
6. Connect nodes in logical order
7. Call complete_pipeline when done

Do NOT add extra nodes that weren't requested!`

      let dbInfo = ''
      if (request.availableDatabases && request.availableDatabases.length > 0) {
        dbInfo = '\n\nAvailable databases:\n' + request.availableDatabases.map(db =>
          `- ID: ${db.id}, Name: ${db.displayName || db.name}, Columns: ${db.columns.join(', ')}`
        ).join('\n')
      }

      let existingNodesInfo = ''
      if (existingNodes.length > 0) {
        existingNodesInfo = '\n\nIMPORTANT: The pipeline already has existing nodes that MUST be preserved:\n' +
          existingNodes.map(node => `- Node ID: ${node.id}, Type: ${node.type}, Label: ${node.label}`).join('\n') +
          '\n\nYou should create NEW nodes and connect them appropriately. DO NOT recreate or delete existing nodes.'
      }

      let existingEdgesInfo = ''
      if (existingEdges.length > 0) {
        existingEdgesInfo = '\n\nExisting connections:\n' +
          existingEdges.map(edge => `- ${edge.source} → ${edge.target}`).join('\n')
      }

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: `User request: "${request.userRequest}"${dbInfo}${existingNodesInfo}${existingEdgesInfo}

Analyze this request carefully:
- What specific operations does the user want? (filter? aggregate? visualize?)
- What fields/columns are mentioned?
- What are the exact filter conditions, if any?
- Should the new nodes be connected to existing nodes?

Build ONLY the NEW nodes that are explicitly requested, with COMPLETE configurations. Preserve all existing nodes and edges.` }
      ]

      let continueBuilding = true
      let iterationCount = 0
      const maxIterations = 20

      while (continueBuilding && iterationCount < maxIterations) {
        iterationCount++

        // GPT-5 models only support temperature: 1 (default)
        const requestParams: any = {
          model: this.config.model,
          messages,
          tools: this.availableTools,
          tool_choice: 'auto',
          max_completion_tokens: this.config.maxTokens ?? 4000
        }

        // Only add temperature if not using GPT-5
        if (!this.config.model.includes('gpt-5')) {
          requestParams.temperature = this.config.temperature ?? 0.7
        }

        const completion = await this.openai.chat.completions.create(requestParams)

        const choice = completion.choices[0]
        if (!choice || !choice.message) {
          break
        }

        messages.push(choice.message)

        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
          for (const toolCall of choice.message.tool_calls) {
            const functionName = toolCall.function.name
            const args = JSON.parse(toolCall.function.arguments)

            let result: any = { success: true }

            if (functionName === 'add_node') {
              // Position nodes vertically below existing nodes
              // Calculate position based on existing nodes
              const newNodeIndex = nodes.length - existingNodes.length
              const position = {
                x: 250,
                y: existingNodes.length > 0
                  ? Math.max(...existingNodes.map(n => n.position?.y || 0)) + 150 + newNodeIndex * 150
                  : 100 + nodes.length * 150
              }

              const newNode: PipelineNode = {
                id: args.nodeId,
                type: args.nodeType as NodeType,
                label: args.label,
                config: args.config || {},
                position
              }

              nodes.push(newNode)
              steps.push({
                action: 'add_node',
                description: `Added ${args.nodeType} node: ${args.label}`,
                nodeId: args.nodeId,
                nodeType: args.nodeType,
                config: args.config
              })

              result = { success: true, nodeId: args.nodeId }
            } else if (functionName === 'connect_nodes') {
              const edgeId = `e_${args.sourceId}_${args.targetId}${args.targetHandle ? `_${args.targetHandle}` : ''}`
              const newEdge: PipelineEdge = {
                id: edgeId,
                source: args.sourceId,
                target: args.targetId,
                ...(args.targetHandle && { targetHandle: args.targetHandle })
              }

              edges.push(newEdge)
              steps.push({
                action: 'connect_nodes',
                description: `Connected ${args.sourceId} to ${args.targetId}${args.targetHandle ? ` (${args.targetHandle})` : ''}`,
                sourceId: args.sourceId,
                targetId: args.targetId
              })

              result = { success: true, edgeId }
            } else if (functionName === 'complete_pipeline') {
              continueBuilding = false
              steps.push({
                action: 'complete',
                description: args.message || 'Pipeline completed'
              })

              result = { success: true, message: args.message }
            } else if (functionName === 'preview_data') {
              try {
                const limit = Math.min(args.limit || 5, 10)
                const previewData = await this.dbManager.previewData(args.databaseId, limit)
                result = {
                  success: true,
                  data: previewData,
                  count: previewData.length
                }
              } catch (error) {
                result = {
                  success: false,
                  error: error instanceof Error ? error.message : 'Failed to preview data'
                }
              }
            } else if (functionName === 'get_column_info') {
              try {
                const columnInfo = await this.dbManager.getColumnInfo(args.databaseId, args.columnName)
                result = {
                  success: true,
                  columnInfo
                }
              } catch (error) {
                result = {
                  success: false,
                  error: error instanceof Error ? error.message : 'Failed to get column info'
                }
              }
            } else if (functionName === 'get_unique_values') {
              try {
                const limit = args.limit || 10
                const uniqueValues = await this.dbManager.getUniqueValues(args.databaseId, args.columnName, limit)
                result = {
                  success: true,
                  uniqueValues
                }
              } catch (error) {
                result = {
                  success: false,
                  error: error instanceof Error ? error.message : 'Failed to get unique values'
                }
              }
            }

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            })
          }
        } else {
          // No more tool calls, agent is done
          continueBuilding = false
        }
      }

      // Check if any NEW nodes were created (excluding existing nodes)
      const newNodesCount = nodes.length - existingNodes.length
      if (newNodesCount === 0 && existingNodes.length === 0) {
        return {
          success: false,
          error: 'No nodes were created. Please provide more specific requirements.'
        }
      }

      const pipeline: Pipeline = {
        id: request.existingPipelineId || `pipeline_${Date.now()}`,
        name: request.existingPipelineName || `Generated Pipeline`,
        description: request.existingPipelineDescription || `Auto-generated for: ${request.userRequest}`,
        nodes,
        edges,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return {
        success: true,
        pipeline,
        steps,
        message: `Successfully created pipeline with ${nodes.length} nodes and ${edges.length} connections.`
      }
    } catch (error) {
      console.error('Pipeline builder error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}
