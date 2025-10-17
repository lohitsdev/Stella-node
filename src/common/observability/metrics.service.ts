/**
 * Metrics service using Prometheus for monitoring
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge, Summary } from 'prom-client';

export interface MetricsConfig {
  enabled: boolean;
  collectDefaultMetrics: boolean;
  prefix: string;
}

export class MetricsService {
  private config: MetricsConfig;

  // HTTP Metrics
  private httpRequestDuration!: Histogram<string>;
  private httpRequestTotal!: Counter<string>;
  private httpRequestErrors!: Counter<string>;

  // Database Metrics
  private dbOperationDuration!: Histogram<string>;
  private dbOperationTotal!: Counter<string>;
  private dbConnectionPool!: Gauge<string>;

  // Business Metrics
  private activeUsers!: Gauge<string>;
  private chatSessionsTotal!: Counter<string>;
  private aiRequestsTotal!: Counter<string>;
  private aiTokensUsed!: Counter<string>;

  // System Metrics
  private memoryUsage!: Gauge<string>;
  private cpuUsage!: Gauge<string>;
  private responseTime!: Summary<string>;

  constructor(config: MetricsConfig) {
    this.config = config;
    this.initializeMetrics();

    if (config.collectDefaultMetrics) {
      collectDefaultMetrics({ register });
    }
  }

  private initializeMetrics(): void {
    const prefix = this.config.prefix;

    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: `${prefix}_http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestTotal = new Counter({
      name: `${prefix}_http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    this.httpRequestErrors = new Counter({
      name: `${prefix}_http_errors_total`,
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'error_type']
    });

    // Database Metrics
    this.dbOperationDuration = new Histogram({
      name: `${prefix}_db_operation_duration_seconds`,
      help: 'Duration of database operations in seconds',
      labelNames: ['operation', 'collection', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5]
    });

    this.dbOperationTotal = new Counter({
      name: `${prefix}_db_operations_total`,
      help: 'Total number of database operations',
      labelNames: ['operation', 'collection', 'status']
    });

    this.dbConnectionPool = new Gauge({
      name: `${prefix}_db_connection_pool_size`,
      help: 'Database connection pool size',
      labelNames: ['state']
    });

    // Business Metrics
    this.activeUsers = new Gauge({
      name: `${prefix}_active_users`,
      help: 'Number of active users'
    });

    this.chatSessionsTotal = new Counter({
      name: `${prefix}_chat_sessions_total`,
      help: 'Total number of chat sessions',
      labelNames: ['status']
    });

    this.aiRequestsTotal = new Counter({
      name: `${prefix}_ai_requests_total`,
      help: 'Total number of AI requests',
      labelNames: ['service', 'model', 'status']
    });

    this.aiTokensUsed = new Counter({
      name: `${prefix}_ai_tokens_used_total`,
      help: 'Total number of AI tokens used',
      labelNames: ['service', 'model', 'token_type']
    });

    // System Metrics
    this.memoryUsage = new Gauge({
      name: `${prefix}_memory_usage_bytes`,
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });

    this.cpuUsage = new Gauge({
      name: `${prefix}_cpu_usage_percent`,
      help: 'CPU usage percentage'
    });

    this.responseTime = new Summary({
      name: `${prefix}_response_time_seconds`,
      help: 'Response time summary',
      labelNames: ['endpoint']
    });

    // Register all metrics
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestTotal);
    register.registerMetric(this.httpRequestErrors);
    register.registerMetric(this.dbOperationDuration);
    register.registerMetric(this.dbOperationTotal);
    register.registerMetric(this.dbConnectionPool);
    register.registerMetric(this.activeUsers);
    register.registerMetric(this.chatSessionsTotal);
    register.registerMetric(this.aiRequestsTotal);
    register.registerMetric(this.aiTokensUsed);
    register.registerMetric(this.memoryUsage);
    register.registerMetric(this.cpuUsage);
    register.registerMetric(this.responseTime);
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    if (!this.config.enabled) return;

    const labels = { method, route, status_code: statusCode.toString() };

    this.httpRequestDuration.observe(labels, duration / 1000);
    this.httpRequestTotal.inc(labels);

    if (statusCode >= 400) {
      this.httpRequestErrors.inc({
        method,
        route,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error'
      });
    }
  }

  /**
   * Record HTTP error
   */
  recordHttpError(method: string, route: string, errorType: string): void {
    if (!this.config.enabled) return;

    this.httpRequestErrors.inc({ method, route, error_type: errorType });
  }

  /**
   * Record database operation metrics
   */
  recordDbOperation(operation: string, collection: string, status: 'success' | 'error', duration: number): void {
    if (!this.config.enabled) return;

    const labels = { operation, collection, status };

    this.dbOperationDuration.observe(labels, duration / 1000);
    this.dbOperationTotal.inc(labels);
  }

  /**
   * Update database connection pool metrics
   */
  updateDbConnectionPool(active: number, idle: number, total: number): void {
    if (!this.config.enabled) return;

    this.dbConnectionPool.set({ state: 'active' }, active);
    this.dbConnectionPool.set({ state: 'idle' }, idle);
    this.dbConnectionPool.set({ state: 'total' }, total);
  }

  /**
   * Update active users count
   */
  updateActiveUsers(count: number): void {
    if (!this.config.enabled) return;

    this.activeUsers.set(count);
  }

  /**
   * Record chat session
   */
  recordChatSession(status: 'started' | 'ended' | 'error'): void {
    if (!this.config.enabled) return;

    this.chatSessionsTotal.inc({ status });
  }

  /**
   * Record AI request
   */
  recordAiRequest(
    service: string,
    model: string,
    status: 'success' | 'error',
    tokensUsed?: number,
    tokenType?: 'input' | 'output' | 'total'
  ): void {
    if (!this.config.enabled) return;

    this.aiRequestsTotal.inc({ service, model, status });

    if (tokensUsed && tokenType) {
      this.aiTokensUsed.inc({ service, model, token_type: tokenType }, tokensUsed);
    }
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(): void {
    if (!this.config.enabled) return;

    const memoryUsage = process.memoryUsage();

    this.memoryUsage.set({ type: 'rss' }, memoryUsage.rss);
    this.memoryUsage.set({ type: 'heapTotal' }, memoryUsage.heapTotal);
    this.memoryUsage.set({ type: 'heapUsed' }, memoryUsage.heapUsed);
    this.memoryUsage.set({ type: 'external' }, memoryUsage.external);
    this.memoryUsage.set({ type: 'arrayBuffers' }, memoryUsage.arrayBuffers);
  }

  /**
   * Record response time
   */
  recordResponseTime(endpoint: string, duration: number): void {
    if (!this.config.enabled) return;

    this.responseTime.observe({ endpoint }, duration / 1000);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    if (!this.config.enabled) {
      return '# Metrics disabled\n';
    }

    return await register.metrics();
  }

  /**
   * Get metrics in JSON format
   */
  async getMetricsJSON(): Promise<any> {
    if (!this.config.enabled) {
      return { metrics: 'disabled' };
    }

    return register.getMetricsAsJSON();
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    register.clear();
  }

  /**
   * Get default metrics
   */
  async getDefaultMetrics(): Promise<string> {
    return await register.metrics();
  }
}

// Default configuration
const defaultConfig: MetricsConfig = {
  enabled: process.env.METRICS_ENABLED !== 'false',
  collectDefaultMetrics: process.env.COLLECT_DEFAULT_METRICS !== 'false',
  prefix: process.env.METRICS_PREFIX || 'stella_api'
};

// Export singleton instance
export const metricsService = new MetricsService(defaultConfig);
