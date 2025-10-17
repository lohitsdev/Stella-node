/**
 * Performance monitoring middleware
 */

import type { Request, Response, NextFunction } from 'express';

import { correlationUtils, type CorrelationContext } from '../observability/correlation.service.js';
import { metricsService } from '../observability/metrics.service.js';
import { PerformanceMonitor } from '../utils/performance.utils.js';

// Extend Request interface to include correlation context
declare global {
  namespace Express {
    interface Request {
      correlationContext?: CorrelationContext;
      startTime?: number;
    }
  }
}

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Extract correlation context from headers
  const correlationContext = correlationUtils.createContext(
    correlationUtils.extractFromHeaders(req.headers).requestId,
    req.headers['x-user-id'] as string,
    req.headers['x-session-id'] as string,
    correlationUtils.extractFromHeaders(req.headers).traceId,
    correlationUtils.extractFromHeaders(req.headers).spanId
  );

  // Set correlation context on request
  req.correlationContext = correlationContext;
  req.startTime = Date.now();

  // Start performance monitoring
  PerformanceMonitor.startTimer(`http_${req.method}_${req.route?.path || req.path}`);

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const duration = Date.now() - (req.startTime || Date.now());
    const route = req.route?.path || req.path;

    // Record metrics
    metricsService.recordHttpRequest(req.method, route, res.statusCode, duration);

    // Record response time
    metricsService.recordResponseTime(route, duration);

    // End performance monitoring
    try {
      PerformanceMonitor.endTimer(`http_${req.method}_${req.route?.path || req.path}`);
    } catch (error) {
      // Timer might not exist, ignore error
    }

    // Call original end
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error tracking middleware
 */
export const errorTrackingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const originalEnd = res.end;

  res.end = function (chunk?: any, encoding?: any) {
    if (res.statusCode >= 400) {
      const route = req.route?.path || req.path;
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';

      metricsService.recordHttpError(req.method, route, errorType);
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Database operation monitoring decorator
 */
export function monitorDbOperation(operation: string, collection: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        metricsService.recordDbOperation(operation, collection, 'success', duration);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        metricsService.recordDbOperation(operation, collection, 'error', duration);

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * AI operation monitoring decorator
 */
export function monitorAiOperation(service: string, model: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await method.apply(this, args);

        metricsService.recordAiRequest(service, model, 'success');

        return result;
      } catch (error) {
        metricsService.recordAiRequest(service, model, 'error');

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Memory monitoring middleware
 */
export const memoryMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Update system metrics
  metricsService.updateSystemMetrics();

  next();
};

/**
 * Request correlation middleware
 */
export const correlationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Extract correlation context from headers
  const correlationContext = correlationUtils.createContext(
    correlationUtils.extractFromHeaders(req.headers).requestId,
    req.headers['x-user-id'] as string,
    req.headers['x-session-id'] as string,
    correlationUtils.extractFromHeaders(req.headers).traceId,
    correlationUtils.extractFromHeaders(req.headers).spanId
  );

  // Set correlation context on request
  req.correlationContext = correlationContext;

  // Add correlation headers to response
  res.setHeader('x-request-id', correlationContext.requestId);
  res.setHeader('x-trace-id', correlationContext.traceId || '');
  res.setHeader('x-span-id', correlationContext.spanId || '');

  next();
};

/**
 * Logging middleware with correlation
 */
export const correlationLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log request start
  if (req.correlationContext) {
    const logContext = correlationUtils.createLogContext(
      req.correlationContext.requestId,
      'info',
      `Request started: ${req.method} ${req.path}`,
      {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    );

    console.log(correlationUtils.formatLogContext(logContext));
  }

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;

    if (req.correlationContext) {
      const logContext = correlationUtils.createLogContext(
        req.correlationContext.requestId,
        res.statusCode >= 400 ? 'warn' : 'info',
        `Request completed: ${req.method} ${req.path} - ${res.statusCode}`,
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`
        }
      );

      console.log(correlationUtils.formatLogContext(logContext));
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};
