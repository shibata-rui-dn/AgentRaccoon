import { Node } from 'reactflow'

/**
 * Common props for node config components
 */
export interface NodeConfigProps {
  node: Node
  config: any
  availableFields: string[]
  onConfigChange: (config: any) => void
  onConvertToCustom?: () => void
}
