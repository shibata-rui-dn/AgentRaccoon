import crypto from 'crypto'

/**
 * キャッシュエントリの構造
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time-to-live in milliseconds
}

/**
 * キャッシュ設定
 */
export interface CacheConfig {
  // パイプライン実行結果の最大行数（メモリ節約）
  maxExecutionResultRows: number
  // ノードごとの中間結果の最大行数
  maxNodeResultRows: number
  // ダッシュボード要素の最大行数
  maxDashboardElementRows: number
  // パイプライン実行結果のTTL（ミリ秒）
  pipelineExecutionTTL: number
  // ノードメタデータのTTL（ミリ秒）
  nodeMetadataTTL: number
  // ダッシュボードキャッシュのTTL（ミリ秒）
  dashboardCacheTTL: number
  // キャッシュの最大エントリ数
  maxCacheEntries: number
}

/**
 * デフォルトのキャッシュ設定
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxExecutionResultRows: 1000,
  maxNodeResultRows: 10000,
  maxDashboardElementRows: 500,
  pipelineExecutionTTL: 5 * 60 * 1000, // 5分
  nodeMetadataTTL: 30 * 60 * 1000, // 30分
  dashboardCacheTTL: 10 * 60 * 1000, // 10分
  maxCacheEntries: 100
}

/**
 * ノードメタデータ（列情報）
 */
export interface NodeMetadata {
  nodeId: string
  pipelineId: string
  columns: string[]
  rowCount?: number
  lastUpdated: number
}

/**
 * パイプライン実行結果のキャッシュ
 */
export interface PipelineExecutionCache {
  pipelineId: string
  pipelineHash: string
  nodeResults: Record<string, any[]> // nodeId -> 結果データ（最大行数制限）
  leafResults: Array<{
    nodeId: string
    nodeLabel: string
    nodeType: string
    data: any[]
  }>
  executionTime: number
  cachedAt: number
}

/**
 * キャッシュマネージャー（シングルトン）
 * パイプライン実行結果とノードメタデータをメモリにキャッシュ
 */
export class CacheManager {
  private static instance: CacheManager
  private config: CacheConfig

  // パイプライン実行結果のキャッシュ
  private pipelineExecutionCache: Map<string, CacheEntry<PipelineExecutionCache>> = new Map()

  // ノードメタデータのキャッシュ（列情報）
  private nodeMetadataCache: Map<string, CacheEntry<NodeMetadata>> = new Map()

  // ダッシュボード要素のキャッシュ
  private dashboardElementCache: Map<string, CacheEntry<any[]>> = new Map()

  private constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }

    // 定期的な期限切れキャッシュのクリーンアップ（1分ごと）
    setInterval(() => this.cleanExpiredCache(), 60 * 1000)
  }

  static getInstance(config?: Partial<CacheConfig>): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config)
    }
    return CacheManager.instance
  }

  /**
   * 設定を取得
   */
  getConfig(): CacheConfig {
    return { ...this.config }
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // ========================================
  // パイプライン実行結果のキャッシュ
  // ========================================

  /**
   * パイプラインのハッシュを計算（設定変更検知用）
   */
  calculatePipelineHash(pipeline: any): string {
    const normalized = JSON.stringify({
      nodes: pipeline.nodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        config: n.config
      })),
      edges: pipeline.edges.map((e: any) => ({
        source: e.source,
        target: e.target
      }))
    })
    return crypto.createHash('md5').update(normalized).digest('hex')
  }

  /**
   * パイプライン実行結果をキャッシュ
   */
  cachePipelineExecution(
    pipelineId: string,
    pipelineHash: string,
    nodeResults: Record<string, any[]>,
    leafResults: Array<{ nodeId: string; nodeLabel: string; nodeType: string; data: any[] }>,
    executionTime: number
  ): void {
    // 行数制限を適用
    const limitedNodeResults: Record<string, any[]> = {}
    for (const [nodeId, data] of Object.entries(nodeResults)) {
      limitedNodeResults[nodeId] = data.slice(0, this.config.maxNodeResultRows)
    }

    const limitedLeafResults = leafResults.map(leaf => ({
      ...leaf,
      data: leaf.data.slice(0, this.config.maxExecutionResultRows)
    }))

    const cacheData: PipelineExecutionCache = {
      pipelineId,
      pipelineHash,
      nodeResults: limitedNodeResults,
      leafResults: limitedLeafResults,
      executionTime,
      cachedAt: Date.now()
    }

    this.pipelineExecutionCache.set(pipelineId, {
      data: cacheData,
      timestamp: Date.now(),
      ttl: this.config.pipelineExecutionTTL
    })

    this.enforceMaxEntries(this.pipelineExecutionCache)
  }

  /**
   * パイプライン実行結果を取得
   */
  getPipelineExecution(pipelineId: string, pipelineHash: string): PipelineExecutionCache | null {
    const entry = this.pipelineExecutionCache.get(pipelineId)

    if (!entry) {
      return null
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.pipelineExecutionCache.delete(pipelineId)
      return null
    }

    // ハッシュが一致しない場合はキャッシュ無効
    if (entry.data.pipelineHash !== pipelineHash) {
      this.pipelineExecutionCache.delete(pipelineId)
      return null
    }

    return entry.data
  }

  /**
   * パイプライン実行キャッシュを無効化
   */
  invalidatePipelineExecution(pipelineId: string): void {
    this.pipelineExecutionCache.delete(pipelineId)
  }

  /**
   * データソースが更新された時、関連パイプラインのキャッシュを無効化
   */
  invalidatePipelinesByDatabase(databaseId: string, allPipelines: any[]): void {
    const affectedPipelineIds = allPipelines
      .filter(pipeline =>
        pipeline.nodes.some((node: any) =>
          node.type === 'dataSource' && node.config.databaseId === databaseId
        )
      )
      .map(pipeline => pipeline.id)

    affectedPipelineIds.forEach(pipelineId => {
      this.invalidatePipelineExecution(pipelineId)
    })
  }

  // ========================================
  // ノードメタデータのキャッシュ
  // ========================================

  /**
   * ノードメタデータをキャッシュ
   */
  cacheNodeMetadata(pipelineId: string, nodeId: string, columns: string[], rowCount?: number): void {
    const key = `${pipelineId}:${nodeId}`

    this.nodeMetadataCache.set(key, {
      data: {
        nodeId,
        pipelineId,
        columns,
        rowCount,
        lastUpdated: Date.now()
      },
      timestamp: Date.now(),
      ttl: this.config.nodeMetadataTTL
    })

    this.enforceMaxEntries(this.nodeMetadataCache)
  }

  /**
   * ノードメタデータを取得
   */
  getNodeMetadata(pipelineId: string, nodeId: string): NodeMetadata | null {
    const key = `${pipelineId}:${nodeId}`
    const entry = this.nodeMetadataCache.get(key)

    if (!entry) {
      return null
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.nodeMetadataCache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * パイプライン全体のノードメタデータを無効化
   */
  invalidateNodeMetadata(pipelineId: string, nodeId?: string): void {
    if (nodeId) {
      // 特定ノードのみ無効化
      const key = `${pipelineId}:${nodeId}`
      this.nodeMetadataCache.delete(key)
    } else {
      // パイプライン全体のメタデータを無効化
      const keysToDelete: string[] = []
      this.nodeMetadataCache.forEach((_, key) => {
        if (key.startsWith(`${pipelineId}:`)) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach(key => this.nodeMetadataCache.delete(key))
    }
  }

  // ========================================
  // ダッシュボード要素のキャッシュ
  // ========================================

  /**
   * ダッシュボード要素のデータをキャッシュ
   */
  cacheDashboardElement(dashboardId: string, elementId: string, data: any[]): void {
    const key = `${dashboardId}:${elementId}`

    // 行数制限を適用
    const limitedData = data.slice(0, this.config.maxDashboardElementRows)

    this.dashboardElementCache.set(key, {
      data: limitedData,
      timestamp: Date.now(),
      ttl: this.config.dashboardCacheTTL
    })

    this.enforceMaxEntries(this.dashboardElementCache)
  }

  /**
   * ダッシュボード要素のデータを取得
   */
  getDashboardElement(dashboardId: string, elementId: string): any[] | null {
    const key = `${dashboardId}:${elementId}`
    const entry = this.dashboardElementCache.get(key)

    if (!entry) {
      return null
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.dashboardElementCache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * ダッシュボード全体のキャッシュを無効化
   */
  invalidateDashboard(dashboardId: string): void {
    const keysToDelete: string[] = []
    this.dashboardElementCache.forEach((_, key) => {
      if (key.startsWith(`${dashboardId}:`)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.dashboardElementCache.delete(key))
  }

  // ========================================
  // キャッシュ管理
  // ========================================

  /**
   * 期限切れキャッシュをクリーンアップ
   */
  private cleanExpiredCache(): void {
    const now = Date.now()

    // パイプライン実行キャッシュのクリーンアップ
    const expiredPipelineKeys: string[] = []
    this.pipelineExecutionCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredPipelineKeys.push(key)
      }
    })
    expiredPipelineKeys.forEach(key => this.pipelineExecutionCache.delete(key))

    // ノードメタデータのクリーンアップ
    const expiredMetadataKeys: string[] = []
    this.nodeMetadataCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredMetadataKeys.push(key)
      }
    })
    expiredMetadataKeys.forEach(key => this.nodeMetadataCache.delete(key))

    // ダッシュボードキャッシュのクリーンアップ
    const expiredDashboardKeys: string[] = []
    this.dashboardElementCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredDashboardKeys.push(key)
      }
    })
    expiredDashboardKeys.forEach(key => this.dashboardElementCache.delete(key))

    if (expiredPipelineKeys.length > 0 || expiredMetadataKeys.length > 0 || expiredDashboardKeys.length > 0) {
      console.log(`[CacheManager] Cleaned ${expiredPipelineKeys.length} pipeline, ${expiredMetadataKeys.length} metadata, ${expiredDashboardKeys.length} dashboard cache entries`)
    }
  }

  /**
   * 最大エントリ数を強制（LRU的に古いものを削除）
   */
  private enforceMaxEntries<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size <= this.config.maxCacheEntries) {
      return
    }

    // タイムスタンプでソートして古いものを削除
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toDelete = entries.slice(0, cache.size - this.config.maxCacheEntries)
    toDelete.forEach(([key]) => cache.delete(key))
  }

  /**
   * 全キャッシュをクリア
   */
  clearAll(): void {
    this.pipelineExecutionCache.clear()
    this.nodeMetadataCache.clear()
    this.dashboardElementCache.clear()
    console.log('[CacheManager] All caches cleared')
  }

  /**
   * キャッシュ統計情報を取得
   */
  getStats() {
    return {
      pipelineExecutionCache: {
        size: this.pipelineExecutionCache.size,
        entries: Array.from(this.pipelineExecutionCache.keys())
      },
      nodeMetadataCache: {
        size: this.nodeMetadataCache.size,
        entries: Array.from(this.nodeMetadataCache.keys())
      },
      dashboardElementCache: {
        size: this.dashboardElementCache.size,
        entries: Array.from(this.dashboardElementCache.keys())
      },
      config: this.config
    }
  }
}
