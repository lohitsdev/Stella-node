/**
 * Health check routes for monitoring and observability
 */

import express from 'express';

import { healthController } from '../controllers/health.controller.js';

const router = express.Router();

/**
 * Health check routes
 */

// Liveness probe - checks if application is alive
router.get('/healthz', healthController.getLiveness.bind(healthController));

// Readiness probe - checks if application is ready to serve traffic
router.get('/readyz', healthController.getReadiness.bind(healthController));

// Health summary - comprehensive health check
router.get('/health', healthController.getHealthSummary.bind(healthController));

// Metrics endpoint - Prometheus metrics
router.get('/metrics', healthController.getMetrics.bind(healthController));

// Metrics JSON endpoint - metrics in JSON format
router.get('/metrics/json', healthController.getMetricsJson.bind(healthController));

// System information endpoint
router.get('/health/system', healthController.getSystemInfo.bind(healthController));

export { router as healthRoutes };
