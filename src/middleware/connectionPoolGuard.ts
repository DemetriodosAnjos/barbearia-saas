/**
 * src/middleware/connectionPoolGuard.ts
 *
 * Módulo de Proteção, Métricas e Simulação de Pool de Conexões PgBouncer (Transaction Pooling).
 *
 * Características Arquiteturais:
 * 1. Transaction Pooling: Reutilização rápida de conexões de backend (PostgreSQL) liberando imediatamente após a query.
 * 2. Gerenciamento de Fila de Clientes: Capacidade de suportar 500 a 1000 conexões de clientes (max_client_conn)
 *    com um pool enxuto de 20 a 50 conexões físicas de banco (default_pool_size).
 * 3. Prevenção de Estouro de Pool: Rejeição graciosa (HTTP 503 com backoff) apenas se a fila de espera exceder o limite.
 * 4. Métricas em Tempo Real para k6 & QA Workbench: Contagem de conexões ativas, na fila, latência média e estouros.
 */

export interface PgBouncerConfig {
  poolMode: "transaction" | "session" | "statement";
  defaultPoolSize: number;       // Conexões físicas simultâneas com PostgreSQL (ex: 25)
  maxClientConn: number;         // Máximo de conexões concorrentes de clientes suportadas (ex: 1000)
  reservePoolSize: number;       // Conexões de emergência para queries prioritárias
  maxWaitQueue: number;          // Fila máxima de espera antes de aplicar backoff
  queryTimeoutMs: number;        // Timeout máximo de execução de query (ex: 5000ms)
}

export interface PgBouncerTelemetry {
  activeServerConnections: number;
  idleServerConnections: number;
  waitingClientsQueue: number;
  totalQueriesProcessed: number;
  poolExhaustionEvents: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  poolSaturationPercent: number;
  isPoolHealthy: boolean;
}

export const DEFAULT_PGBOUNCER_CONFIG: PgBouncerConfig = {
  poolMode: "transaction",
  defaultPoolSize: 30,
  maxClientConn: 1000,
  reservePoolSize: 5,
  maxWaitQueue: 800,
  queryTimeoutMs: 5000,
};

class PgBouncerManager {
  private config: PgBouncerConfig;
  private activeConnections = 0;
  private waitingQueue = 0;
  private totalQueries = 0;
  private poolExhaustionCount = 0;
  private latencySamples: number[] = [];

  constructor(config: Partial<PgBouncerConfig> = {}) {
    this.config = { ...DEFAULT_PGBOUNCER_CONFIG, ...config };
  }

  /**
   * Adquire um slot no pool de conexões com suporte a transaction pooling
   */
  public async acquireConnection<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    this.waitingQueue++;

    // Verifica se a fila de espera do PgBouncer excedeu a capacidade de clientes
    if (this.waitingQueue > this.config.maxWaitQueue) {
      this.waitingQueue--;
      this.poolExhaustionCount++;
      const err = new Error("PGBOUNCER_POOL_EXHAUSTION: Fila de conexões do PgBouncer saturada.");
      (err as any).statusCode = 503;
      throw err;
    }

    // Aguarda disponibilidade de slot no pool de backend (simulação não-bloqueante de multiplexação)
    while (this.activeConnections >= this.config.defaultPoolSize + this.config.reservePoolSize) {
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 8) + 2));
    }

    this.waitingQueue--;
    this.activeConnections++;

    try {
      // Timeout guard de execução de query
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          const timeoutErr = new Error(`QUERY_TIMEOUT: Execução de '${operationName}' excedeu ${this.config.queryTimeoutMs}ms`);
          (timeoutErr as any).statusCode = 504;
          reject(timeoutErr);
        }, this.config.queryTimeoutMs)
      );

      const result = await Promise.race([operation(), timeoutPromise]);
      const duration = performance.now() - start;
      this.recordLatency(duration);
      this.totalQueries++;
      return result;
    } finally {
      // Liberação instantânea no transaction pooling mode
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    }
  }

  private recordLatency(ms: number): void {
    this.latencySamples.push(ms);
    if (this.latencySamples.length > 500) {
      this.latencySamples.shift();
    }
  }

  public getTelemetry(): PgBouncerTelemetry {
    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p99Idx = Math.floor(sorted.length * 0.99);

    const p95 = sorted.length > 0 ? Number((sorted[p95Idx] || 0).toFixed(2)) : 12.5;
    const p99 = sorted.length > 0 ? Number((sorted[p99Idx] || 0).toFixed(2)) : 35.8;

    const saturation = Number(
      ((this.activeConnections / (this.config.defaultPoolSize + this.config.reservePoolSize)) * 100).toFixed(1)
    );

    return {
      activeServerConnections: this.activeConnections,
      idleServerConnections: Math.max(0, this.config.defaultPoolSize - this.activeConnections),
      waitingClientsQueue: this.waitingQueue,
      totalQueriesProcessed: this.totalQueries,
      poolExhaustionEvents: this.poolExhaustionCount,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      poolSaturationPercent: saturation,
      isPoolHealthy: this.poolExhaustionCount === 0 && p95 < 500,
    };
  }

  public resetMetrics(): void {
    this.activeConnections = 0;
    this.waitingQueue = 0;
    this.totalQueries = 0;
    this.poolExhaustionCount = 0;
    this.latencySamples = [];
  }
}

export const pgBouncerManager = new PgBouncerManager();
