import { Pipeline, PipelineNode, PipelineExecutionResult, LeafNodeResult } from 'shared'
import { DatabaseManager } from '../database/DatabaseManager'
import { DataTransform } from '../utils/dataTransform'
import { CacheManager } from '../cache/CacheManager'

export class PipelineEngine {
  private dbManager: DatabaseManager
  private cacheManager: CacheManager

  constructor() {
    this.dbManager = DatabaseManager.getInstance()
    this.cacheManager = CacheManager.getInstance()
  }

  /**
   * Execute a pipeline
   */
  async execute(pipeline: Pipeline, useCache: boolean = true): Promise<PipelineExecutionResult> {
    const startTime = Date.now()

    // キャッシュチェック
    if (useCache) {
      const pipelineHash = this.cacheManager.calculatePipelineHash(pipeline)
      const cachedResult = this.cacheManager.getPipelineExecution(pipeline.id, pipelineHash)

      if (cachedResult) {
        console.log(`[PipelineEngine] Cache hit for pipeline ${pipeline.id}`)
        return {
          pipelineId: pipeline.id,
          status: 'success',
          data: cachedResult.leafResults[0]?.data || [],
          leafResults: cachedResult.leafResults,
          executionTime: cachedResult.executionTime,
          nodeResults: cachedResult.nodeResults,
          cached: true
        } as any
      }
    }

    const nodeResults: Record<string, any[]> = {}

    try {
      // データソースノードを見つける
      const dataSourceNodes = pipeline.nodes.filter(n => n.type === 'dataSource')

      if (dataSourceNodes.length === 0) {
        throw new Error('No data source node found in pipeline')
      }

      // 全てのデータソースから到達可能なノードを見つける
      const reachableNodes = new Set<string>()
      for (const dataSourceNode of dataSourceNodes) {
        const nodesFromThisSource = this.findReachableNodes(pipeline, dataSourceNode.id)
        nodesFromThisSource.forEach(nodeId => reachableNodes.add(nodeId))
      }

      // 到達可能なノードのみでトポロジカルソート
      const executionOrder = this.topologicalSort(pipeline, reachableNodes)

      // ノードを順番に実行
      for (const nodeId of executionOrder) {
        const node = pipeline.nodes.find(n => n.id === nodeId)
        if (!node) continue

        const inputData = this.getNodeInputData(node, pipeline, nodeResults)
        const outputData = await this.executeNode(node, inputData)
        nodeResults[nodeId] = outputData
      }

      // 葉ノード（出力エッジがないノード）を見つける
      const leafNodes = this.findLeafNodes(pipeline, reachableNodes)

      // 葉ノードの結果を収集
      const leafResults: LeafNodeResult[] = leafNodes.map(nodeId => {
        const node = pipeline.nodes.find(n => n.id === nodeId)!
        return {
          nodeId: nodeId,
          nodeLabel: node.label,
          nodeType: node.type,
          data: nodeResults[nodeId] || []
        }
      })

      const executionTime = Date.now() - startTime

      // 後方互換性のため、最初の葉ノードの結果をdataフィールドにも設定
      const firstLeafData = leafResults.length > 0 ? leafResults[0].data : []

      // キャッシュに保存
      if (useCache) {
        const pipelineHash = this.cacheManager.calculatePipelineHash(pipeline)
        this.cacheManager.cachePipelineExecution(
          pipeline.id,
          pipelineHash,
          nodeResults,
          leafResults,
          executionTime
        )
        console.log(`[PipelineEngine] Cached execution result for pipeline ${pipeline.id}`)
      }

      return {
        pipelineId: pipeline.id,
        status: 'success',
        data: firstLeafData,
        leafResults,
        executionTime,
        nodeResults
      }
    } catch (error) {
      return {
        pipelineId: pipeline.id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * データソースから到達可能なノードを見つける
   */
  private findReachableNodes(pipeline: Pipeline, startNodeId: string): Set<string> {
    const reachable = new Set<string>()
    const visited = new Set<string>()

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      reachable.add(nodeId)

      // このノードから出ているエッジを探す
      const outgoingEdges = pipeline.edges.filter(e => e.source === nodeId)
      outgoingEdges.forEach(edge => {
        visit(edge.target)
      })
    }

    visit(startNodeId)
    return reachable
  }

  /**
   * 葉ノード（出力エッジがないノード）を見つける
   */
  private findLeafNodes(pipeline: Pipeline, reachableNodes: Set<string>): string[] {
    const leafNodes: string[] = []

    reachableNodes.forEach(nodeId => {
      // このノードから出ているエッジがあるか確認
      const hasOutgoingEdge = pipeline.edges.some(e => e.source === nodeId)

      if (!hasOutgoingEdge) {
        leafNodes.push(nodeId)
      }
    })

    return leafNodes
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: PipelineNode, inputData: any[]): Promise<any[]> {
    switch (node.type) {
      case 'dataSource':
        return await this.executeDataSource(node)

      case 'filter':
        return this.executeFilter(node, inputData)

      case 'transform':
        return this.executeTransform(node, inputData)

      case 'aggregate':
        return this.executeAggregate(node, inputData)

      case 'join':
        return this.executeJoin(node, inputData)

      case 'visualization':
        return inputData // Pass through for visualization

      case 'dashboard':
        return inputData // Pass through for dashboard reference

      case 'custom':
        return this.executeCustom(node, inputData as any)

      default:
        return inputData
    }
  }

  /**
   * Execute data source node
   */
  private async executeDataSource(node: PipelineNode): Promise<any[]> {
    const { databaseId } = node.config

    if (!databaseId) {
      throw new Error(`データソース「${node.label}」に参照データが設定されていません。ノードをクリックして設定パネルからデータベースを選択してください。`)
    }

    try {
      // Fetch all data from database (in production, implement pagination)
      const result = await this.dbManager.getDatabaseData(databaseId, 1, 10000)
      return result.data
    } catch (error) {
      throw new Error(`データソース「${node.label}」のデータ取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  /**
   * Execute filter node
   */
  private executeFilter(node: PipelineNode, inputData: any[]): any[] {
    const { conditions } = node.config

    if (!conditions || conditions.length === 0) {
      return inputData
    }

    return DataTransform.filter(inputData, conditions)
  }

  /**
   * Execute transform node
   */
  private executeTransform(node: PipelineNode, inputData: any[]): any[] {
    const { transformations } = node.config

    if (!transformations || transformations.length === 0) {
      return inputData
    }

    return DataTransform.transform(inputData, transformations)
  }

  /**
   * Execute aggregate node
   */
  private executeAggregate(node: PipelineNode, inputData: any[]): any[] {
    const { groupBy, aggregations } = node.config

    if (!aggregations || aggregations.length === 0) {
      return inputData
    }

    return DataTransform.aggregate(inputData, groupBy || [], aggregations)
  }

  /**
   * Execute join node
   */
  private executeJoin(node: PipelineNode, inputData: any[]): any[] {
    // For join, we need two inputs
    // This is a simplified version - in production, handle multiple inputs properly
    const { joinType, joinCondition } = node.config

    if (!joinCondition) {
      return inputData
    }

    // In a real implementation, you would get the second input from another source
    // For now, we'll just return the input data
    return inputData
  }

  /**
   * Execute custom node with user-provided JavaScript code
   */
  private executeCustom(node: PipelineNode, inputData: any[] | any[][]): any[] {
    const { customCode } = node.config

    if (!customCode || customCode.trim() === '') {
      // 複数入力の場合は最初の入力を返す
      if (Array.isArray(inputData[0]) && Array.isArray(inputData)) {
        return (inputData as any[][])[0] || []
      }
      return inputData as any[]
    }

    try {
      // Create a sandboxed function
      // 複数入力の場合: function process(input1, input2, ...) { ... return data; }
      // 単一入力の場合: function process(data) { ... return data; }

      // Provide safe built-in objects
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
          log: (...args: any[]) => console.log('[Custom Node]', ...args),
          error: (...args: any[]) => console.error('[Custom Node]', ...args),
          warn: (...args: any[]) => console.warn('[Custom Node]', ...args)
        }
      }

      // Create function from code
      const wrappedCode = `
        'use strict';
        const { Array, Object, String, Number, Boolean, Math, Date, JSON, console } = context;
        ${customCode}
        return process;
      `

      const createFunction = new Function('context', wrappedCode)
      const userFunction = createFunction(safeContext)

      // Execute the function
      let result: any
      if (Array.isArray(inputData[0]) && Array.isArray(inputData)) {
        // 複数入力: 各入力を個別の引数として渡す
        result = userFunction(...(inputData as any[][]))
      } else {
        // 単一入力: データをそのまま渡す
        result = userFunction(inputData)
      }

      // Validate result is an array
      if (!Array.isArray(result)) {
        throw new Error('Custom function must return an array')
      }

      return result
    } catch (error) {
      console.error('Error executing custom code:', error)
      throw new Error(`Custom code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get input data for a node
   */
  private getNodeInputData(
    node: PipelineNode,
    pipeline: Pipeline,
    nodeResults: Record<string, any[]>
  ): any[] | any[][] {
    // Find incoming edges
    const incomingEdges = pipeline.edges.filter(e => e.target === node.id)

    if (incomingEdges.length === 0) {
      // No input (e.g., data source node)
      return []
    }

    if (incomingEdges.length === 1) {
      // Single input
      const sourceNodeId = incomingEdges[0].source
      return nodeResults[sourceNodeId] || []
    }

    // Multiple inputs
    // カスタムノードの場合は配列の配列として返す
    if (node.type === 'custom') {
      // targetHandleでソートして、input-0, input-1, ... の順序を保つ
      const sortedEdges = [...incomingEdges].sort((a, b) => {
        const aHandle = a.targetHandle || 'input-0'
        const bHandle = b.targetHandle || 'input-0'
        return aHandle.localeCompare(bHandle)
      })

      return sortedEdges.map(edge => nodeResults[edge.source] || [])
    }

    // その他のノード（結合など）は最初の入力のみ
    const sourceNodeId = incomingEdges[0].source
    return nodeResults[sourceNodeId] || []
  }

  /**
   * Topological sort to determine execution order
   */
  private topologicalSort(pipeline: Pipeline, reachableNodes: Set<string>): string[] {
    const visited = new Set<string>()
    const result: string[] = []

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return
      if (!reachableNodes.has(nodeId)) return // 到達可能でないノードはスキップ

      visited.add(nodeId)

      // Visit all dependencies first
      const incomingEdges = pipeline.edges.filter(e => e.target === nodeId)
      incomingEdges.forEach(edge => {
        visit(edge.source)
      })

      result.push(nodeId)
    }

    // Start with nodes that have no incoming edges and are reachable
    const noIncomingEdges = pipeline.nodes.filter(
      node => reachableNodes.has(node.id) && !pipeline.edges.some(e => e.target === node.id)
    )

    noIncomingEdges.forEach(node => visit(node.id))

    // Visit remaining reachable nodes
    reachableNodes.forEach(nodeId => visit(nodeId))

    return result
  }
}
