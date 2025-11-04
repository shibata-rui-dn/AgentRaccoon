import { useState, useEffect } from 'react'
import { Node, Edge } from 'reactflow'
import { DatabaseInfo, TransformOperation, AggregationOperation } from 'shared'

/**
 * Calculate available fields by traversing the pipeline backwards
 */
const calculateAvailableFields = (
  targetNode: Node,
  nodes: Node[],
  edges: Edge[],
  databases: DatabaseInfo[],
  visitedNodes: Set<string> = new Set()
): string[] => {
  // Prevent infinite loops
  if (visitedNodes.has(targetNode.id)) return []
  visitedNodes.add(targetNode.id)

  // Find the incoming edge to this node
  const incomingEdge = edges.find(e => e.target === targetNode.id)
  if (!incomingEdge) return []

  // Get the source node
  const sourceNode = nodes.find(n => n.id === incomingEdge.source)
  if (!sourceNode) return []

  const sourceNodeType = sourceNode.data.nodeType
  const sourceConfig = sourceNode.data.config || {}

  // Base case: data source node
  if (sourceNodeType === 'dataSource') {
    if (sourceConfig.databaseId) {
      const database = databases.find(db => db.id === sourceConfig.databaseId)
      return database ? database.columns : []
    }
    return []
  }

  // Recursive case: get fields from previous node
  const previousFields = calculateAvailableFields(sourceNode, nodes, edges, databases, visitedNodes)

  // Transform fields based on node type
  switch (sourceNodeType) {
    case 'filter':
      // Filter doesn't change field names, just passes them through
      return previousFields

    case 'transform': {
      // Apply transformations
      const transformations: TransformOperation[] = sourceConfig.transformations || []
      let resultFields = [...previousFields]

      for (const transform of transformations) {
        switch (transform.type) {
          case 'rename':
            // Replace sourceField with targetField
            if (transform.sourceField && transform.targetField) {
              resultFields = resultFields.map(f =>
                f === transform.sourceField ? transform.targetField! : f
              )
            }
            break
          case 'calculate':
            // Add new field
            if (transform.targetField && !resultFields.includes(transform.targetField)) {
              resultFields.push(transform.targetField)
            }
            break
          case 'cast':
            // Field name stays the same, just type changes
            // If targetField is different from sourceField, treat as rename
            if (transform.sourceField && transform.targetField && transform.sourceField !== transform.targetField) {
              resultFields = resultFields.map(f =>
                f === transform.sourceField ? transform.targetField! : f
              )
            }
            break
          case 'extract':
            // Add new extracted field
            if (transform.targetField && !resultFields.includes(transform.targetField)) {
              resultFields.push(transform.targetField)
            }
            break
          case 'drop':
            // Remove dropped fields
            if (transform.dropFields) {
              resultFields = resultFields.filter(f => !transform.dropFields!.includes(f))
            }
            break
        }
      }
      return resultFields
    }

    case 'aggregate': {
      // Aggregate produces new fields: groupBy fields + aggregation aliases
      const groupBy: string[] = sourceConfig.groupBy || []
      const aggregations: AggregationOperation[] = sourceConfig.aggregations || []
      const resultFields = [...groupBy]

      for (const agg of aggregations) {
        if (agg.alias && !resultFields.includes(agg.alias)) {
          resultFields.push(agg.alias)
        }
      }
      return resultFields
    }

    case 'join':
      // Join combines fields from both sides
      // This is more complex - for now just return previous fields
      // TODO: implement proper join field resolution
      return previousFields

    case 'custom': {
      // Custom nodes: try to infer output fields by executing with sample data
      const customCode = sourceConfig.customCode
      if (!customCode || !customCode.trim()) {
        return previousFields
      }

      try {
        // Create a sample row from previous fields
        const sampleRow: Record<string, any> = {}
        previousFields.forEach(field => {
          sampleRow[field] = 'sample_value'
        })

        // Execute custom code with sample data
        const safeContext = {
          Array,
          Object,
          String,
          Number,
          Boolean,
          Math,
          Date,
          JSON,
          console: {
            log: () => {},
            error: () => {},
            warn: () => {}
          }
        }

        const wrappedCode = `
          'use strict';
          const { Array, Object, String, Number, Boolean, Math, Date, JSON, console } = context;
          ${customCode}
          return process;
        `

        const createFunction = new Function('context', wrappedCode)
        const userFunction = createFunction(safeContext)
        const result = userFunction([sampleRow])

        // Extract field names from result
        if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object') {
          return Object.keys(result[0])
        }
      } catch (error) {
        // If execution fails, return previous fields as fallback
        console.warn('Failed to infer custom node output fields:', error)
      }

      return previousFields
    }

    default:
      return previousFields
  }
}

/**
 * Custom hook to calculate available fields for a node
 */
export const useAvailableFields = (
  node: Node,
  nodes: Node[],
  edges: Edge[],
  databases: DatabaseInfo[]
) => {
  const [availableFields, setAvailableFields] = useState<string[]>([])

  useEffect(() => {
    // Only calculate for nodes that need field information
    if (['filter', 'transform', 'aggregate', 'visualization', 'custom'].includes(node.data.nodeType)) {
      const fields = calculateAvailableFields(node, nodes, edges, databases)
      setAvailableFields(fields)
    } else {
      setAvailableFields([])
    }
  }, [node.id, node.data.nodeType, nodes, edges, databases])

  return availableFields
}
