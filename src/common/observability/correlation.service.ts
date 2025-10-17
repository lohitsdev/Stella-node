/**
 * Request correlation service for tracking requests across services
 */

import { randomUUID } from 'crypto';

export interface CorrelationContext {
  requestId: string;
  userId?: string | undefined;
  sessionId?: string | undefined;
  traceId?: string | undefined;
  spanId?: string | undefined;
  parentSpanId?: string | undefined;
  startTime: number;
  metadata: Record<string, any>;
}

export interface LogContext {
  requestId: string;
  userId?: string | undefined;
  sessionId?: string | undefined;
  traceId?: string | undefined;
  spanId?: string | undefined;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

export class CorrelationService {
  private static context = new Map<string, CorrelationContext>();
  private static readonly REQUEST_ID_HEADER = 'x-request-id';
  private static readonly TRACE_ID_HEADER = 'x-trace-id';
  private static readonly SPAN_ID_HEADER = 'x-span-id';

  /**
   * Generate a new request ID
   */
  static generateRequestId(): string {
    return randomUUID();
  }

  /**
   * Generate a new trace ID
   */
  static generateTraceId(): string {
    return randomUUID();
  }

  /**
   * Generate a new span ID
   */
  static generateSpanId(): string {
    return randomUUID().substring(0, 16);
  }

  /**
   * Extract correlation context from request headers
   */
  static extractFromHeaders(headers: Record<string, string | string[] | undefined>): Partial<CorrelationContext> {
    const getHeader = (name: string): string | undefined => {
      const value = headers[name];
      return Array.isArray(value) ? value[0] : value;
    };

    return {
      requestId: getHeader(this.REQUEST_ID_HEADER) || this.generateRequestId(),
      traceId: getHeader(this.TRACE_ID_HEADER) || this.generateTraceId(),
      spanId: getHeader(this.SPAN_ID_HEADER) || this.generateSpanId()
    };
  }

  /**
   * Create correlation context
   */
  static createContext(
    requestId?: string,
    userId?: string,
    sessionId?: string,
    traceId?: string,
    spanId?: string,
    parentSpanId?: string
  ): CorrelationContext {
    const context: CorrelationContext = {
      requestId: requestId || this.generateRequestId(),
      userId,
      sessionId,
      traceId: traceId || this.generateTraceId(),
      spanId: spanId || this.generateSpanId(),
      parentSpanId,
      startTime: Date.now(),
      metadata: {}
    };

    return context;
  }

  /**
   * Set correlation context for current request
   */
  static setContext(context: CorrelationContext): void {
    this.context.set(context.requestId, context);
  }

  /**
   * Get correlation context by request ID
   */
  static getContext(requestId: string): CorrelationContext | undefined {
    return this.context.get(requestId);
  }

  /**
   * Update correlation context
   */
  static updateContext(requestId: string, updates: Partial<CorrelationContext>): void {
    const context = this.context.get(requestId);
    if (context) {
      Object.assign(context, updates);
      this.context.set(requestId, context);
    }
  }

  /**
   * Add metadata to correlation context
   */
  static addMetadata(requestId: string, key: string, value: any): void {
    const context = this.context.get(requestId);
    if (context) {
      context.metadata[key] = value;
      this.context.set(requestId, context);
    }
  }

  /**
   * Remove correlation context
   */
  static removeContext(requestId: string): void {
    this.context.delete(requestId);
  }

  /**
   * Create child span context
   */
  static createChildSpan(parentRequestId: string, operation: string): CorrelationContext {
    const parentContext = CorrelationService.getContext(parentRequestId);
    if (!parentContext) {
      throw new Error(`Parent context not found for request ID: ${parentRequestId}`);
    }

    const childContext: CorrelationContext = {
      requestId: CorrelationService.generateRequestId(),
      userId: parentContext.userId,
      sessionId: parentContext.sessionId,
      traceId: parentContext.traceId,
      spanId: CorrelationService.generateSpanId(),
      parentSpanId: parentContext.spanId,
      startTime: Date.now(),
      metadata: {
        operation,
        parentRequestId
      }
    };

    return childContext;
  }

  /**
   * Create log context for structured logging
   */
  static createLogContext(
    requestId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, any>
  ): LogContext {
    const context = CorrelationService.getContext(requestId);

    return {
      requestId,
      userId: context?.userId,
      sessionId: context?.sessionId,
      traceId: context?.traceId,
      spanId: context?.spanId,
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: {
        ...context?.metadata,
        ...metadata
      }
    };
  }

  /**
   * Format log context for output
   */
  static formatLogContext(logContext: LogContext): string {
    const { requestId, userId, sessionId, traceId, spanId, timestamp, level, message, metadata } = logContext;

    const correlationInfo = [
      `requestId=${requestId}`,
      userId && `userId=${userId}`,
      sessionId && `sessionId=${sessionId}`,
      traceId && `traceId=${traceId}`,
      spanId && `spanId=${spanId}`
    ]
      .filter(Boolean)
      .join(' ');

    const metadataStr = metadata && Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';

    return `[${timestamp}] ${level.toUpperCase()} ${correlationInfo} ${message}${metadataStr}`;
  }

  /**
   * Get correlation headers for outgoing requests
   */
  static getCorrelationHeaders(requestId: string): Record<string, string> {
    const context = CorrelationService.getContext(requestId);
    if (!context) {
      return {};
    }

    return {
      [CorrelationService.REQUEST_ID_HEADER]: context.requestId,
      [CorrelationService.TRACE_ID_HEADER]: context.traceId || '',
      [CorrelationService.SPAN_ID_HEADER]: context.spanId || ''
    };
  }

  /**
   * Clean up old contexts (call periodically)
   */
  static cleanup(maxAge: number = 300000): void {
    // 5 minutes default
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [requestId, context] of CorrelationService.context.entries()) {
      if (now - context.startTime > maxAge) {
        toDelete.push(requestId);
      }
    }

    toDelete.forEach(requestId => CorrelationService.removeContext(requestId));
  }

  /**
   * Get all active contexts
   */
  static getActiveContexts(): CorrelationContext[] {
    return Array.from(CorrelationService.context.values());
  }

  /**
   * Get context statistics
   */
  static getContextStats(): {
    totalContexts: number;
    averageAge: number;
    oldestContext: number;
    newestContext: number;
  } {
    const contexts = CorrelationService.getActiveContexts();
    const now = Date.now();

    if (contexts.length === 0) {
      return {
        totalContexts: 0,
        averageAge: 0,
        oldestContext: 0,
        newestContext: 0
      };
    }

    const ages = contexts.map(ctx => now - ctx.startTime);
    const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
    const oldestContext = Math.max(...ages);
    const newestContext = Math.min(...ages);

    return {
      totalContexts: contexts.length,
      averageAge: Math.round(averageAge),
      oldestContext,
      newestContext
    };
  }
}

// Export utility functions
export const correlationUtils = {
  generateRequestId: CorrelationService.generateRequestId,
  generateTraceId: CorrelationService.generateTraceId,
  generateSpanId: CorrelationService.generateSpanId,
  extractFromHeaders: CorrelationService.extractFromHeaders,
  createContext: CorrelationService.createContext,
  createChildSpan: CorrelationService.createChildSpan,
  createLogContext: CorrelationService.createLogContext,
  formatLogContext: CorrelationService.formatLogContext,
  getCorrelationHeaders: CorrelationService.getCorrelationHeaders
};
