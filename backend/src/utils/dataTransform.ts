import { FilterCondition, TransformOperation, AggregationOperation } from 'shared'

export class DataTransform {
  /**
   * Filter data based on conditions
   */
  static filter(data: any[], conditions: FilterCondition[]): any[] {
    if (!conditions || conditions.length === 0) {
      return data
    }

    return data.filter(row => {
      return conditions.every(condition => {
        const value = row[condition.field]
        const targetValue = condition.value

        switch (condition.operator) {
          case 'eq':
            return value == targetValue
          case 'ne':
            return value != targetValue
          case 'gt':
            return Number(value) > Number(targetValue)
          case 'gte':
            return Number(value) >= Number(targetValue)
          case 'lt':
            return Number(value) < Number(targetValue)
          case 'lte':
            return Number(value) <= Number(targetValue)
          case 'contains':
            return String(value).includes(String(targetValue))
          case 'startsWith':
            return String(value).startsWith(String(targetValue))
          case 'endsWith':
            return String(value).endsWith(String(targetValue))
          default:
            return false
        }
      })
    })
  }

  /**
   * Transform data based on operations
   */
  static transform(data: any[], operations: TransformOperation[]): any[] {
    if (!operations || operations.length === 0) {
      return data
    }

    return data.map(row => {
      const newRow = { ...row }

      operations.forEach(op => {
        switch (op.type) {
          case 'rename':
            if (op.sourceField && op.targetField && op.sourceField !== op.targetField) {
              newRow[op.targetField] = row[op.sourceField]
              if (op.sourceField !== op.targetField) {
                delete newRow[op.sourceField]
              }
            }
            break

          case 'calculate':
            if (op.expression && op.targetField) {
              try {
                // Simple expression evaluation (secure subset)
                newRow[op.targetField] = this.evaluateExpression(op.expression, row)
              } catch (e) {
                newRow[op.targetField] = null
              }
            }
            break

          case 'cast':
            if (op.sourceField && op.dataType && op.targetField) {
              newRow[op.targetField] = this.castValue(row[op.sourceField], op.dataType)
            }
            break

          case 'extract':
            if (op.sourceField && op.expression && op.targetField) {
              newRow[op.targetField] = this.extractValue(row[op.sourceField], op.expression)
            }
            break

          case 'drop':
            if (op.dropFields && op.dropFields.length > 0) {
              op.dropFields.forEach(field => {
                delete newRow[field]
              })
            }
            break
        }
      })

      return newRow
    })
  }

  /**
   * Aggregate data
   */
  static aggregate(
    data: any[],
    groupBy: string[],
    aggregations: AggregationOperation[]
  ): any[] {
    if (!groupBy || groupBy.length === 0) {
      // No grouping, aggregate all data
      const result: any = {}

      aggregations.forEach(agg => {
        result[agg.alias] = this.performAggregation(data, agg)
      })

      return [result]
    }

    // Group data
    const groups = new Map<string, any[]>()

    data.forEach(row => {
      const key = groupBy.map(field => row[field]).join('|')
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(row)
    })

    // Aggregate each group
    const results: any[] = []

    groups.forEach((groupData, key) => {
      const result: any = {}

      // Add group by fields
      const keyValues = key.split('|')
      groupBy.forEach((field, index) => {
        result[field] = groupData[0][field]
      })

      // Add aggregations
      aggregations.forEach(agg => {
        result[agg.alias] = this.performAggregation(groupData, agg)
      })

      results.push(result)
    })

    return results
  }

  /**
   * Join two datasets
   */
  static join(
    leftData: any[],
    rightData: any[],
    leftField: string,
    rightField: string,
    joinType: 'inner' | 'left' | 'right' | 'outer'
  ): any[] {
    const results: any[] = []

    if (joinType === 'inner' || joinType === 'left') {
      leftData.forEach(leftRow => {
        const matches = rightData.filter(
          rightRow => leftRow[leftField] === rightRow[rightField]
        )

        if (matches.length > 0) {
          matches.forEach(rightRow => {
            results.push({ ...leftRow, ...rightRow })
          })
        } else if (joinType === 'left') {
          results.push({ ...leftRow })
        }
      })
    }

    if (joinType === 'right' || joinType === 'outer') {
      rightData.forEach(rightRow => {
        const matches = leftData.filter(
          leftRow => leftRow[leftField] === rightRow[rightField]
        )

        if (matches.length === 0) {
          if (joinType === 'right') {
            results.push({ ...rightRow })
          } else if (joinType === 'outer') {
            // Check if not already added
            const alreadyAdded = results.some(
              r => r[rightField] === rightRow[rightField]
            )
            if (!alreadyAdded) {
              results.push({ ...rightRow })
            }
          }
        }
      })
    }

    return results
  }

  /**
   * Perform aggregation function
   */
  private static performAggregation(data: any[], agg: AggregationOperation): any {
    const values = data.map(row => row[agg.field]).filter(v => v !== null && v !== undefined)

    switch (agg.function) {
      case 'sum':
        return values.reduce((acc, val) => acc + Number(val), 0)
      case 'avg':
        return values.length > 0
          ? values.reduce((acc, val) => acc + Number(val), 0) / values.length
          : 0
      case 'min':
        return values.length > 0 ? Math.min(...values.map(Number)) : null
      case 'max':
        return values.length > 0 ? Math.max(...values.map(Number)) : null
      case 'count':
        return values.length
      case 'distinct':
        return new Set(values).size
      default:
        return null
    }
  }

  /**
   * Evaluate simple expression
   */
  private static evaluateExpression(expression: string, row: any): any {
    // Replace field names with values
    let evaluable = expression

    // Sort field names by length (longest first) to avoid partial replacements
    // e.g., if we have fields "price" and "price_tax", we want to replace "price_tax" first
    const fields = Object.keys(row).sort((a, b) => b.length - a.length)

    fields.forEach(field => {
      // Escape special regex characters in field name
      const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Use negative lookbehind/lookahead to ensure we're matching the whole field name
      // This supports both ASCII and Unicode (including Japanese) characters
      // Match when field is preceded/followed by non-word characters or string boundaries
      const regex = new RegExp(
        `(?<![\\w\\p{L}])${escapedField}(?![\\w\\p{L}])`,
        'gu'
      )

      evaluable = evaluable.replace(regex, JSON.stringify(row[field]))
    })

    try {
      // Use Function constructor for safer evaluation (still limited)
      const func = new Function(`return ${evaluable}`)
      return func()
    } catch (e) {
      return null
    }
  }

  /**
   * Cast value to specific type
   */
  private static castValue(value: any, dataType: string): any {
    switch (dataType) {
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      case 'boolean':
        return Boolean(value)
      case 'date':
        return new Date(value)
      default:
        return value
    }
  }

  /**
   * Extract value using regex or substring
   */
  private static extractValue(value: any, pattern: string): any {
    if (!value) return null

    try {
      const regex = new RegExp(pattern)
      const match = String(value).match(regex)
      return match ? match[0] : null
    } catch (e) {
      return null
    }
  }
}
