import { Router } from 'express';
import { body, query } from 'express-validator';

import { authMiddleware } from '../../auth/middleware/auth.middleware.js';
import { AdminController } from '../controllers/admin.controller.js';

const router = Router();
const adminController = new AdminController();

// Admin role check middleware with fallback
const requireAdmin = (req: any, res: any, next: any) => {
  // Check if user is authenticated via JWT and has admin role
  if (req.user && (req.user.role === 'admin' || req.user.role === 'ADMIN')) {
    return next();
  }

  // Fallback: Check for basic auth with admin/admin
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Basic ')) {
    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username === 'admin' && password === 'admin') {
      // Set a fake user object for the fallback
      req.user = { userId: 'admin-fallback', email: 'admin@admin.com', role: 'admin' };
      return next();
    }
  }

  // Check for query parameters fallback (for development)
  if (req.query.admin === 'admin' && req.query.password === 'admin') {
    req.user = { userId: 'admin-fallback', email: 'admin@admin.com', role: 'admin' };
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Admin access required. Use JWT token or admin/admin credentials.',
    timestamp: new Date()
  });
};

// Optional authentication middleware (tries JWT first, then falls back)
const optionalAuthMiddleware = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  // If there's a Bearer token, try to authenticate with JWT
  if (authHeader?.startsWith('Bearer ')) {
    try {
      await authMiddleware(req, res, (error?: any) => {
        if (error) {
          // JWT failed, continue without setting req.user
          next();
        } else {
          // JWT succeeded, req.user is set
          next();
        }
      });
    } catch (error) {
      // JWT failed, continue without setting req.user
      next();
    }
  } else {
    // No Bearer token, continue without JWT auth
    next();
  }
};

// Apply optional authentication and admin check to all routes
router.use(optionalAuthMiddleware);
router.use(requireAdmin);

// Environment variable management
router.get('/environment', adminController.getEnvironmentVariables.bind(adminController));

router.put(
  '/environment',
  [
    body('variables').isArray().withMessage('Variables must be an array'),
    body('variables.*.key').isString().notEmpty().withMessage('Variable key is required'),
    body('variables.*.value').isString().withMessage('Variable value must be a string')
  ],
  adminController.updateEnvironmentVariables.bind(adminController)
);

// System monitoring
router.get('/system/status', adminController.getSystemStatus.bind(adminController));
router.get('/system/metrics', adminController.getSystemMetrics.bind(adminController));
router.get('/system/services', adminController.getServiceStatus.bind(adminController));

// Analytics
router.get('/analytics', adminController.getAnalytics.bind(adminController));

// Logs
router.get(
  '/logs',
  [query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')],
  adminController.getSystemLogs.bind(adminController)
);

// System management
router.post('/restart', adminController.restartApplication.bind(adminController));

// Dashboard (combined data)
router.get('/dashboard', adminController.getDashboardData.bind(adminController));

// User management
router.get('/users/stats', adminController.getUserStats.bind(adminController));
router.get('/users', adminController.getUsers.bind(adminController));
router.get('/users/:userId/analytics', adminController.getUserAnalytics.bind(adminController));
router.put(
  '/users/:userId/status',
  [body('status').isString().isIn(['verified', 'suspended', 'blocked', 'pending']).withMessage('Invalid status')],
  adminController.updateUserStatus.bind(adminController)
);

// Security monitoring
router.get('/security/events', adminController.getSecurityEvents.bind(adminController));

// AI usage tracking
router.get('/ai/usage', adminController.getAIUsageStats.bind(adminController));

// Database statistics
router.get('/database/stats', adminController.getDatabaseStats.bind(adminController));

// Performance monitoring
router.get('/performance/metrics', adminController.getPerformanceMetrics.bind(adminController));

// User Activity Tracking
router.post('/tracking/session/start', adminController.startUserSession.bind(adminController));
router.post('/tracking/session/end', adminController.endUserSession.bind(adminController));
router.post('/tracking/interaction', adminController.trackUserInteraction.bind(adminController));
router.post('/tracking/page-view', adminController.trackPageView.bind(adminController));
router.post('/tracking/feature-usage', adminController.trackFeatureUsage.bind(adminController));

export { router as adminRoutes };
