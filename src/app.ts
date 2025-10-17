import compression from 'compression';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import 'reflect-metadata';

import { adminRoutes } from './admin/routes/admin.routes.js';
import { adminService } from './admin/services/admin.service.js';
import { authRoutes } from './auth/routes/auth.routes.js';
import { chatRoutes } from './chat/routes/chat.routes.js';
import { searchRoutes } from './chat/routes/search.routes.js';
import {
  performanceMiddleware,
  errorTrackingMiddleware,
  memoryMonitoringMiddleware,
  correlationMiddleware,
  correlationLoggingMiddleware
} from './common/middleware/performance.middleware.js';
import { metricsService } from './common/observability/metrics.service.js';
import { healthRoutes } from './common/routes/health.routes.js';
import { swaggerSpec } from './config/swagger.config.js';
import { mongodb } from './database/mongodb.js';
import { pinecone } from './database/pinecone.js';
import { personalizeRoutes } from './onboarding/routes/personalize.routes.js';
import { configService } from './services/config.service.js';
import { toolRoutes } from './tool/routes/tool.routes.js';

/**
 * Main Express application class for Stella API
 * Provides comprehensive setup with middleware, routes, and documentation
 */
export class StellaApp {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = configService.get('app.port', 3000);
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  /**
   * Initialize application middleware including JSON parsing, CORS, and logging
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:']
          }
        },
        crossOriginEmbedderPolicy: false
      })
    );

    // Compression middleware
    this.app.use(
      compression({
        level: 6,
        threshold: 1024,
        filter: (req: any, res: any) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        }
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        timestamp: new Date()
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Performance and observability middleware
    this.app.use(correlationMiddleware);
    this.app.use(performanceMiddleware);
    this.app.use(errorTrackingMiddleware);
    this.app.use(memoryMonitoringMiddleware);
    this.app.use(correlationLoggingMiddleware);

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files
    this.app.use(express.static('public'));

    // Admin dashboard route
    this.app.get('/admin', (req, res) => {
      res.redirect('/admin/');
    });

    this.app.get('/admin/', (req, res) => {
      res.sendFile('admin/index.html', { root: 'public' });
    });

    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging and analytics middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);

      const startTime = Date.now();

      // Track API requests for analytics
      if (req.path.startsWith('/api/')) {
        adminService.trackRequest(req.path);
      }

      // Track response for error analytics and performance
      const originalSend = res.send;
      res.send = function (data) {
        const responseTime = Date.now() - startTime;

        // Track performance for all API requests
        if (req.path.startsWith('/api/')) {
          adminService.trackRequestPerformance(req.path, responseTime);
        }

        // Track errors
        if (res.statusCode >= 400 && req.path.startsWith('/api/')) {
          adminService.trackError(req.path, data || 'Unknown error', res.statusCode);

          // Track security events for failed authentication
          if (res.statusCode === 401 || res.statusCode === 403) {
            adminService.addSecurityEvent({
              type: 'failed_login',
              email: req.body?.email || 'unknown',
              ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown',
              details: `${res.statusCode} error on ${req.path}`
            });
          }
        }

        return originalSend.call(this, data);
      };

      next();
    });
  }

  /**
   * Initialize all API routes including health checks and service endpoints
   */
  private initializeRoutes(): void {
    // Health check endpoints
    this.app.use('/', healthRoutes);

    // API info endpoint
    /**
     * @swagger
     * /api/info:
     *   get:
     *     summary: Get API information
     *     tags: [Health]
     *     responses:
     *       200:
     *         description: API information
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ServiceResponse'
     */
    this.app.get('/api/info', (req, res) => {
      res.json({
        success: true,
        data: {
          name: 'Stella API',
          version: '1.0.0',
          description: 'Node.js TypeScript API with MongoDB and Pinecone',
          environment: configService.get('app.environment'),
          documentation: '/api-docs',
          health: '/health',
          metrics: '/metrics',
          liveness: '/healthz',
          readiness: '/readyz'
        },
        timestamp: new Date()
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Welcome to Stella API! 🌟',
        documentation: '/api-docs',
        health: '/health',
        metrics: '/metrics',
        liveness: '/healthz',
        readiness: '/readyz',
        info: '/api/info'
      });
    });

    // Authentication routes
    this.app.use('/api/auth', authRoutes);

    // Chat routes
    this.app.use('/api/chat', chatRoutes);

    // Search routes
    this.app.use('/api/chat', searchRoutes);

    // Tool routes
    this.app.use('/api/tool', toolRoutes);

    // Admin routes
    this.app.use('/api/admin', adminRoutes);

    // Onboarding routes
    this.app.use('/api/onboarding', personalizeRoutes);
  }

  /**
   * Initialize Swagger API documentation endpoints
   */
  private initializeSwagger(): void {
    // Swagger UI
    this.app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Stella API Documentation'
      })
    );

    // Swagger JSON endpoint
    this.app.get('/swagger.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  }

  /**
   * Initialize global error handling and 404 middleware
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
        timestamp: new Date()
      });
    });

    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    });
  }

  /**
   * Establish connections to MongoDB and Pinecone databases
   */
  public async initializeDatabases(): Promise<void> {
    console.log('🔗 Connecting to databases...');

    try {
      await mongodb.connect();
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
    }

    try {
      await pinecone.connect();
    } catch (error) {
      console.error('Failed to connect to Pinecone:', error);
    }
  }

  /**
   * Start the Express server with configuration validation and database connections
   */
  public async start(): Promise<void> {
    try {
      console.log('🌟 Starting Stella API...');

      // Validate configuration
      const validation = configService.validate();
      if (!validation.isValid) {
        console.error('❌ Configuration validation failed:');
        validation.errors.forEach(error => console.error(`  - ${error}`));

        // Only exit in production, allow development to continue with warnings
        if (configService.get('app.nodeEnv') === 'production') {
          process.exit(1);
        } else {
          console.warn('🔧 Continuing in development mode with configuration issues...');
        }
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️  Configuration warnings:');
        validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }

      // Initialize databases
      await this.initializeDatabases();

      // Start the server
      this.app.listen(this.port, () => {
        console.log(`✅ Stella API is running on port ${this.port}`);
        console.log(`📖 API Documentation: http://localhost:${this.port}/api-docs`);
        console.log(`💚 Health Check: http://localhost:${this.port}/health`);
        console.log(`ℹ️  API Info: http://localhost:${this.port}/api/info`);
      });
    } catch (error) {
      console.error('❌ Failed to start Stella API:', error);
      process.exit(1);
    }
  }

  /**
   * Perform graceful shutdown of database connections
   */
  public async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down Stella API...');

    try {
      await mongodb.disconnect();
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }

    console.log('👋 Goodbye from Stella API!');
  }

  /**
   * Get the Express application instance
   * @returns Express application instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

export default StellaApp;
