import { FilterCondition, TransformOperation, AggregationOperation } from 'shared'
import { safeFieldAccess, convertExpressionFieldNames } from './fieldUtils'

/**
 * Generate filter code from conditions
 */
export const generateFilterCode = (conditions: FilterCondition[]): string => {
  if (conditions.length === 0) {
    return 'function process(data) {\n  return data;\n}'
  }

  const conditionCode = conditions.map((cond) => {
    const fieldAccess = safeFieldAccess('row', cond.field)
    let operation = ''

    switch (cond.operator) {
      case 'eq': operation = `${fieldAccess} == ${JSON.stringify(cond.value)}`; break
      case 'ne': operation = `${fieldAccess} != ${JSON.stringify(cond.value)}`; break
      case 'gt': operation = `${fieldAccess} > ${JSON.stringify(cond.value)}`; break
      case 'gte': operation = `${fieldAccess} >= ${JSON.stringify(cond.value)}`; break
      case 'lt': operation = `${fieldAccess} < ${JSON.stringify(cond.value)}`; break
      case 'lte': operation = `${fieldAccess} <= ${JSON.stringify(cond.value)}`; break
      case 'contains': operation = `String(${fieldAccess}).includes(${JSON.stringify(cond.value)})`; break
      case 'startsWith': operation = `String(${fieldAccess}).startsWith(${JSON.stringify(cond.value)})`; break
      case 'endsWith': operation = `String(${fieldAccess}).endsWith(${JSON.stringify(cond.value)})`; break
      default: operation = 'true'
    }

    return operation
  }).join(' && ')

  return `function process(data) {
  return data.filter(row => ${conditionCode});
}`
}

/**
 * Generate transform code from transformations
 */
export const generateTransformCode = (transformations: TransformOperation[], availableFields: string[]): string => {
  if (transformations.length === 0) {
    return 'function process(data) {\n  return data;\n}'
  }

  let code = 'function process(data) {\n  return data.map(row => {\n    const newRow = { ...row };\n'

  transformations.forEach((transform) => {
    switch (transform.type) {
      case 'rename':
        if (transform.sourceField && transform.targetField) {
          code += `    ${safeFieldAccess('newRow', transform.targetField)} = ${safeFieldAccess('row', transform.sourceField)};\n`
          code += `    delete ${safeFieldAccess('newRow', transform.sourceField)};\n`
        }
        break
      case 'calculate':
        if (transform.expression && transform.targetField) {
          const convertedExpression = convertExpressionFieldNames(transform.expression, availableFields)
          code += `    ${safeFieldAccess('newRow', transform.targetField)} = ${convertedExpression};\n`
        }
        break
      case 'cast':
        if (transform.sourceField && transform.dataType && transform.targetField) {
          const castFunc = transform.dataType === 'string' ? 'String' :
                         transform.dataType === 'number' ? 'Number' :
                         transform.dataType === 'boolean' ? 'Boolean' :
                         transform.dataType === 'date' ? 'new Date' : ''
          code += `    ${safeFieldAccess('newRow', transform.targetField)} = ${castFunc}(${safeFieldAccess('row', transform.sourceField)});\n`
        }
        break
      case 'drop':
        if (transform.dropFields) {
          transform.dropFields.forEach(field => {
            code += `    delete ${safeFieldAccess('newRow', field)};\n`
          })
        }
        break
    }
  })

  code += '    return newRow;\n  });\n}'
  return code
}

/**
 * Generate aggregate code from groupBy and aggregations
 */
export const generateAggregateCode = (groupBy: string[], aggregations: AggregationOperation[]): string => {
  if (aggregations.length === 0) {
    return 'function process(data) {\n  return data;\n}'
  }

  if (groupBy.length === 0) {
    // No grouping - aggregate all data
    let code = 'function process(data) {\n  const result = {};\n'

    aggregations.forEach(agg => {
      const resultAccess = safeFieldAccess('result', agg.alias)
      const fieldAccess = safeFieldAccess('row', agg.field)

      switch (agg.function) {
        case 'sum':
          code += `  ${resultAccess} = data.reduce((sum, row) => sum + Number(${fieldAccess} || 0), 0);\n`
          break
        case 'avg':
          code += `  ${resultAccess} = data.reduce((sum, row) => sum + Number(${fieldAccess} || 0), 0) / data.length;\n`
          break
        case 'min':
          code += `  ${resultAccess} = Math.min(...data.map(row => Number(${fieldAccess} || 0)));\n`
          break
        case 'max':
          code += `  ${resultAccess} = Math.max(...data.map(row => Number(${fieldAccess} || 0)));\n`
          break
        case 'count':
          code += `  ${resultAccess} = data.filter(row => ${fieldAccess} != null).length;\n`
          break
        case 'distinct':
          code += `  ${resultAccess} = new Set(data.map(row => ${fieldAccess})).size;\n`
          break
      }
    })

    code += '  return [result];\n}'
    return code
  } else {
    // With grouping
    const groupKeyExpr = groupBy.map(field => safeFieldAccess('row', field)).join(' + "|" + ')

    let code = 'function process(data) {\n'
    code += '  const groups = {};\n\n'
    code += '  data.forEach(row => {\n'
    code += `    const key = ${groupKeyExpr};\n`
    code += '    if (!groups[key]) {\n'
    code += '      groups[key] = {\n'

    // Add groupBy fields
    groupBy.forEach(field => {
      const quotedField = JSON.stringify(field)
      const fieldAccess = safeFieldAccess('row', field)
      code += `        ${quotedField}: ${fieldAccess},\n`
    })

    code += '        _items: []\n'
    code += '      };\n'
    code += '    }\n'
    code += '    groups[key]._items.push(row);\n'
    code += '  });\n\n'

    code += '  return Object.values(groups).map(group => {\n'
    code += '    const result = { ...group };\n'
    code += '    delete result._items;\n\n'

    // Add aggregations
    aggregations.forEach(agg => {
      const resultAccess = safeFieldAccess('result', agg.alias)
      const fieldAccess = safeFieldAccess('row', agg.field)

      switch (agg.function) {
        case 'sum':
          code += `    ${resultAccess} = group._items.reduce((sum, row) => sum + Number(${fieldAccess} || 0), 0);\n`
          break
        case 'avg':
          code += `    ${resultAccess} = group._items.reduce((sum, row) => sum + Number(${fieldAccess} || 0), 0) / group._items.length;\n`
          break
        case 'min':
          code += `    ${resultAccess} = Math.min(...group._items.map(row => Number(${fieldAccess} || 0)));\n`
          break
        case 'max':
          code += `    ${resultAccess} = Math.max(...group._items.map(row => Number(${fieldAccess} || 0)));\n`
          break
        case 'count':
          code += `    ${resultAccess} = group._items.filter(row => ${fieldAccess} != null).length;\n`
          break
        case 'distinct':
          code += `    ${resultAccess} = new Set(group._items.map(row => ${fieldAccess})).size;\n`
          break
      }
    })

    code += '    return result;\n'
    code += '  });\n}'
    return code
  }
}
