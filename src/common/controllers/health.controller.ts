/**
 * Health check controller for liveness and readiness probes
 */

import type { Request, Response } from 'express';

import { HttpStatus } from '../enums/app.enum.js';
import { healthService } from '../observability/health.service.js';
import { metricsService } from '../observability/metrics.service.js';

export class HealthController {
  /**
   * Liveness probe endpoint
   * GET /healthz
   *
   * This endpoint checks if the application is alive and responsive.
   * It should be fast and not depend on external services.
   */
  async getLiveness(req: Request, res: Response): Promise<void> {
    try {
      const livenessStatus = await healthService.getLivenessStatus();

      const statusCode = livenessStatus.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

      res.status(statusCode).json(livenessStatus);
    } catch (error) {
      console.error('Liveness check failed:', error);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Liveness check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Readiness probe endpoint
   * GET /readyz
   *
   * This endpoint checks if the application is ready to serve traffic.
   * It includes checks for external dependencies like databases.
   */
  async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      const readinessStatus = await healthService.getReadinessStatus();

      let statusCode = HttpStatus.OK;
      if (readinessStatus.status === 'unhealthy') {
        statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      } else if (readinessStatus.status === 'degraded') {
        statusCode = HttpStatus.OK; // Still OK but degraded
      }

      res.status(statusCode).json(readinessStatus);
    } catch (error) {
      console.error('Readiness check failed:', error);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Metrics endpoint
   * GET /metrics
   *
   * This endpoint provides Prometheus metrics in text format.
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getMetrics();

      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.status(HttpStatus.OK).send(metrics);
    } catch (error) {
      console.error('Metrics retrieval failed:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve metrics',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Metrics JSON endpoint
   * GET /metrics/json
   *
   * This endpoint provides metrics in JSON format.
   */
  async getMetricsJson(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getMetricsJSON();

      res.status(HttpStatus.OK).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Metrics JSON retrieval failed:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve metrics JSON',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * System information endpoint
   * GET /health/system
   *
   * This endpoint provides detailed system information.
   */
  async getSystemInfo(req: Request, res: Response): Promise<void> {
    try {
      const systemInfo = healthService.getSystemInfo();

      res.status(HttpStatus.OK).json({
        success: true,
        data: systemInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('System info retrieval failed:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retrieve system information',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Health check summary endpoint
   * GET /health
   *
   * This endpoint provides a summary of all health checks.
   */
  async getHealthSummary(req: Request, res: Response): Promise<void> {
    try {
      const [livenessStatus, readinessStatus] = await Promise.all([
        healthService.getLivenessStatus(),
        healthService.getReadinessStatus()
      ]);

      const overallStatus =
        livenessStatus.status === 'unhealthy' || readinessStatus.status === 'unhealthy'
          ? 'unhealthy'
          : readinessStatus.status === 'degraded'
            ? 'degraded'
            : 'healthy';

      const statusCode = overallStatus === 'unhealthy' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;

      res.status(statusCode).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: livenessStatus.uptime,
        version: livenessStatus.version,
        environment: livenessStatus.environment,
        checks: {
          liveness: livenessStatus,
          readiness: readinessStatus
        }
      });
    } catch (error) {
      console.error('Health summary failed:', error);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const healthController = new HealthController();
