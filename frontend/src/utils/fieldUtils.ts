/**
 * Check if a field name is a valid JavaScript identifier
 */
export const isValidIdentifier = (fieldName: string): boolean => {
  // JavaScript identifier rules: start with letter, $, or _, followed by letters, digits, $, or _
  const invalidChars = /[^\w$]/g
  return !invalidChars.test(fieldName)
}

/**
 * Safely access field (use bracket notation if needed)
 */
export const safeFieldAccess = (objName: string, fieldName: string): string => {
  if (isValidIdentifier(fieldName)) {
    return `${objName}.${fieldName}`
  } else {
    return `${objName}[${JSON.stringify(fieldName)}]`
  }
}

/**
 * Convert field names in expression to row.fieldName or row['fieldName']
 */
export const convertExpressionFieldNames = (expression: string, availableFields: string[]): string => {
  if (!expression) return expression

  let result = expression

  // Sort fields by length (longest first) to avoid partial replacements
  const fields = [...availableFields].sort((a, b) => b.length - a.length)

  fields.forEach(field => {
    // Escape special regex characters in field name
    const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Use Unicode-aware regex for Japanese field names
    // Match field names that are not already prefixed with 'row.'
    const regex = new RegExp(
      `(?<!row\\.)(?<!row\\[['"])(?<![\\w\\p{L}])${escapedField}(?![\\w\\p{L}])`,
      'gu'
    )

    const replacement = isValidIdentifier(field) ? `row.${field}` : `row[${JSON.stringify(field)}]`
    result = result.replace(regex, replacement)
  })

  return result
}

/**
 * Validate calculation expression
 */
export const validateExpression = (expression: string, availableFields: string[]): string | null => {
  if (!expression || expression.trim() === '') {
    return '計算式を入力してください'
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /require\s*\(/i,
    /import\s+/i,
    /eval\s*\(/i,
    /function\s*\(/i,
    /=>/,
    /\bwindow\b/i,
    /\bdocument\b/i,
    /\bprocess\b/i,
    /\b__proto__\b/i,
    /\bconstructor\b/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(expression)) {
      return '不正な文字列が含まれています'
    }
  }

  // Check parentheses balance
  let openCount = 0
  for (const char of expression) {
    if (char === '(') openCount++
    if (char === ')') openCount--
    if (openCount < 0) {
      return '括弧の対応が正しくありません'
    }
  }
  if (openCount !== 0) {
    return '括弧の対応が正しくありません'
  }

  // Extract field names used in the expression
  const fieldNamePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g
  const usedFields = expression.match(fieldNamePattern) || []

  // Filter out JavaScript keywords and numbers
  const jsKeywords = ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']
  const validOperators = ['Math', 'abs', 'ceil', 'floor', 'round', 'min', 'max', 'sqrt', 'pow']
  const unknownFields = usedFields.filter(field =>
    !jsKeywords.includes(field) &&
    !validOperators.includes(field) &&
    availableFields.length > 0 &&
    !availableFields.includes(field)
  )

  if (unknownFields.length > 0) {
    return `不明なフィールド: ${unknownFields.join(', ')}`
  }

  // Try to validate basic syntax (replace fields with dummy values)
  try {
    let testExpression = expression
    availableFields.forEach(field => {
      const regex = new RegExp(`\\b${field}\\b`, 'g')
      testExpression = testExpression.replace(regex, '1')
    })

    // Also replace any remaining valid identifiers with dummy values
    testExpression = testExpression.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (match) => {
      if (jsKeywords.includes(match) || validOperators.includes(match)) {
        return match
      }
      return '1'
    })

    // Test evaluation (very basic)
    new Function(`return ${testExpression}`)
  } catch (e) {
    return '計算式の構文が正しくありません'
  }

  return null
}
