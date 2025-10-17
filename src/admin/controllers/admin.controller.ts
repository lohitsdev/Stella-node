import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import type { UpdateEnvironmentDto, BulkUpdateEnvironmentDto } from '../dto/admin.dto.js';
import { adminService } from '../services/admin.service.js';
import { userTrackingService } from '../services/user-tracking.service.js';

export class AdminController {
  /**
   * @swagger
   * /api/admin/environment:
   *   get:
   *     summary: Get all environment variables
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Environment variables retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   */
  async getEnvironmentVariables(req: Request, res: Response): Promise<void> {
    try {
      const envVars = await adminService.getEnvironmentVariables();

      res.json({
        success: true,
        data: envVars,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get environment variables: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve environment variables',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/environment:
   *   put:
   *     summary: Update environment variables
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               variables:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     key:
   *                       type: string
   *                     value:
   *                       type: string
   *     responses:
   *       200:
   *         description: Environment variables updated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   */
  async updateEnvironmentVariables(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date()
        });
        return;
      }

      const { variables } = req.body as BulkUpdateEnvironmentDto;

      await adminService.updateEnvironmentVariables(variables);

      adminService.addSystemLog('info', 'Environment variables updated by admin', {
        updatedKeys: variables.map(v => v.key)
      });

      res.json({
        success: true,
        message: 'Environment variables updated successfully. Restart required for changes to take effect.',
        data: { updatedCount: variables.length },
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to update environment variables: ${error}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update environment variables',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/system/status:
   *   get:
   *     summary: Get comprehensive system status
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: System status retrieved successfully
   */
  async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const systemInfo = await adminService.getSystemInfo();

      res.json({
        success: true,
        data: systemInfo,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get system status: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system status',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/system/metrics:
   *   get:
   *     summary: Get system performance metrics
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: System metrics retrieved successfully
   */
  async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await adminService.getSystemMetrics();

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get system metrics: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/system/services:
   *   get:
   *     summary: Get status of all services
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Service status retrieved successfully
   */
  async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const services = await adminService.getServiceStatus();

      res.json({
        success: true,
        data: services,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get service status: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service status',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/analytics:
   *   get:
   *     summary: Get application analytics
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Analytics data retrieved successfully
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await adminService.getAnalytics();

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get analytics: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/logs:
   *   get:
   *     summary: Get system logs
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *         description: Number of log entries to retrieve
   *     responses:
   *       200:
   *         description: System logs retrieved successfully
   */
  async getSystemLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = adminService.getSystemLogs(limit);

      res.json({
        success: true,
        data: logs,
        meta: {
          count: logs.length,
          limit
        },
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get system logs: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system logs',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/restart:
   *   post:
   *     summary: Restart the application (requires system privileges)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Restart initiated successfully
   *       403:
   *         description: Forbidden - Admin access required
   */
  async restartApplication(req: Request, res: Response): Promise<void> {
    try {
      adminService.addSystemLog('info', 'Application restart initiated by admin');

      res.json({
        success: true,
        message: 'Application restart initiated. The service will be unavailable for a few seconds.',
        timestamp: new Date()
      });

      // Graceful shutdown after response
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch (error) {
      adminService.addSystemLog('error', `Failed to restart application: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to restart application',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/dashboard:
   *   get:
   *     summary: Get admin dashboard data (combined endpoint)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dashboard data retrieved successfully
   */
  async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const [systemInfo, analytics, logs] = await Promise.all([
        adminService.getSystemInfo(),
        adminService.getAnalytics(),
        adminService.getSystemLogs(20) // Recent logs only for dashboard
      ]);

      res.json({
        success: true,
        data: {
          system: systemInfo,
          analytics,
          recentLogs: logs
        },
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get dashboard data: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/users/stats:
   *   get:
   *     summary: Get user statistics
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User statistics retrieved successfully
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getUserStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get user stats: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user statistics',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/users:
   *   get:
   *     summary: Get paginated list of users
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const filters = {
        role: req.query.role as string,
        status: req.query.status as string,
        search: req.query.search as string
      };

      const result = await adminService.getUsers(page, limit, filters);
      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get users: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/users/{userId}/status:
   *   put:
   *     summary: Update user status
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [verified, suspended, blocked, pending]
   *     responses:
   *       200:
   *         description: User status updated successfully
   */
  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date()
        });
        return;
      }

      const success = await adminService.updateUserStatus(userId, status);

      if (success) {
        res.json({
          success: true,
          message: 'User status updated successfully',
          timestamp: new Date()
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date()
        });
      }
    } catch (error) {
      adminService.addSystemLog('error', `Failed to update user status: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to update user status',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/security/events:
   *   get:
   *     summary: Get security events
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *     responses:
   *       200:
   *         description: Security events retrieved successfully
   */
  async getSecurityEvents(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = await adminService.getSecurityEvents(limit);

      res.json({
        success: true,
        data: events,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get security events: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve security events',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/ai/usage:
   *   get:
   *     summary: Get AI service usage statistics
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: AI usage statistics retrieved successfully
   */
  async getAIUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getAIUsageStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get AI usage stats: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve AI usage statistics',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/database/stats:
   *   get:
   *     summary: Get database statistics
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Database statistics retrieved successfully
   */
  async getDatabaseStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDatabaseStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get database stats: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve database statistics',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/performance/metrics:
   *   get:
   *     summary: Get performance metrics
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Performance metrics retrieved successfully
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await adminService.getPerformanceMetrics();
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to get performance metrics: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/users/{userId}/analytics:
   *   get:
   *     summary: Get comprehensive analytics for a specific user
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The user ID to get analytics for
   *     responses:
   *       200:
   *         description: User analytics retrieved successfully
   *       404:
   *         description: User not found
   */
  async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
          timestamp: new Date()
        });
        return;
      }

      const analytics = await adminService.getUserAnalytics(userId);

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date()
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date()
        });
      } else {
        adminService.addSystemLog('error', `Failed to get user analytics: ${error}`);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve user analytics',
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * @swagger
   * /api/admin/tracking/session/start:
   *   post:
   *     summary: Start a new user session for activity tracking
   *     tags: [User Tracking]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               deviceInfo:
   *                 type: object
   *     responses:
   *       200:
   *         description: Session started successfully
   */
  async startUserSession(req: Request, res: Response): Promise<void> {
    try {
      const { email, deviceInfo } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
          timestamp: new Date()
        });
        return;
      }

      const sessionId = await userTrackingService.startSession(email, deviceInfo || {});

      res.json({
        success: true,
        data: { sessionId },
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to start user session: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to start session',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/tracking/session/end:
   *   post:
   *     summary: End a user session
   *     tags: [User Tracking]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               sessionId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Session ended successfully
   */
  async endUserSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date()
        });
        return;
      }

      await userTrackingService.endSession(sessionId);

      res.json({
        success: true,
        message: 'Session ended successfully',
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to end user session: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to end session',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/tracking/interaction:
   *   post:
   *     summary: Track a user interaction
   *     tags: [User Tracking]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               sessionId:
   *                 type: string
   *               type:
   *                 type: string
   *               element:
   *                 type: string
   *               page:
   *                 type: string
   *               metadata:
   *                 type: object
   *     responses:
   *       200:
   *         description: Interaction tracked successfully
   */
  async trackUserInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, type, element, page, metadata } = req.body;

      if (!sessionId || !type || !element || !page) {
        res.status(400).json({
          success: false,
          error: 'SessionId, type, element, and page are required',
          timestamp: new Date()
        });
        return;
      }

      await userTrackingService.trackInteraction(sessionId, {
        type,
        element,
        page,
        timestamp: new Date(),
        metadata: metadata || {}
      });

      res.json({
        success: true,
        message: 'Interaction tracked successfully',
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to track user interaction: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to track interaction',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/tracking/page-view:
   *   post:
   *     summary: Track a page view
   *     tags: [User Tracking]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               sessionId:
   *                 type: string
   *               page:
   *                 type: string
   *               timeSpent:
   *                 type: number
   *               scrollDepth:
   *                 type: number
   *     responses:
   *       200:
   *         description: Page view tracked successfully
   */
  async trackPageView(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, page, timeSpent, scrollDepth } = req.body;

      if (!sessionId || !page) {
        res.status(400).json({
          success: false,
          error: 'SessionId and page are required',
          timestamp: new Date()
        });
        return;
      }

      await userTrackingService.trackPageView(sessionId, page, timeSpent || 0, scrollDepth || 0);

      res.json({
        success: true,
        message: 'Page view tracked successfully',
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to track page view: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to track page view',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/admin/tracking/feature-usage:
   *   post:
   *     summary: Track feature usage
   *     tags: [User Tracking]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               sessionId:
   *                 type: string
   *               feature:
   *                 type: string
   *               action:
   *                 type: string
   *               startTime:
   *                 type: string
   *               endTime:
   *                 type: string
   *               metadata:
   *                 type: object
   *               success:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Feature usage tracked successfully
   */
  async trackFeatureUsage(req: Request, res: Response): Promise<void> {
    try {
      const { email, sessionId, feature, action, startTime, endTime, metadata, success } = req.body;

      if (!email || !sessionId || !feature || !action) {
        res.status(400).json({
          success: false,
          error: 'Email, sessionId, feature, and action are required',
          timestamp: new Date()
        });
        return;
      }

      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date(); // Default to current time if not provided
      const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

      await userTrackingService.trackFeatureUsage(email, sessionId, {
        feature,
        action,
        startTime: start,
        endTime: end,
        duration,
        metadata: metadata || {},
        success: success !== false,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'Feature usage tracked successfully',
        timestamp: new Date()
      });
    } catch (error) {
      adminService.addSystemLog('error', `Failed to track feature usage: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to track feature usage',
        timestamp: new Date()
      });
    }
  }
}
