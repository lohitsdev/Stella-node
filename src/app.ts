import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config.js';
import { configService } from './services/config.service.js';
import { mongodb } from './database/mongodb.js';
import { pinecone } from './database/pinecone.js';
import authRoutes from './auth/routes/auth.routes.js';
import chatRoutes from './chat/routes/chat.routes.js';
import { searchRoutes } from './chat/routes/search.routes.js';
import toolRoutes from './tool/routes/tool.routes.js';
import 'reflect-metadata';

/**
 * Express application setup with Swagger documentation
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
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

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

    // Request logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Check API health status
     *     tags: [Health]
     *     responses:
     *       200:
     *         description: Health status
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/ServiceResponse'
     *                 - type: object
     *                   properties:
     *                     data:
     *                       $ref: '#/components/schemas/HealthResponse'
     */
    this.app.get('/health', async (req, res) => {
      try {
        const mongoHealthy = await mongodb.ping();
        const pineconeHealthy = await pinecone.ping();
        const uptime = process.uptime();

        const healthStatus = {
          status: (mongoHealthy && pineconeHealthy) ? 'healthy' : 'unhealthy',
          services: {
            mongodb: mongoHealthy,
            pinecone: pineconeHealthy
          },
          uptime,
          timestamp: new Date()
        };

        res.json({
          success: true,
          data: healthStatus,
          timestamp: new Date()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Health check failed',
          timestamp: new Date()
        });
      }
    });

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
          documentation: '/api-docs'
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

    // TODO: Add document and vector routes here
    // this.app.use('/api/documents', documentRoutes);
    // this.app.use('/api/vectors', vectorRoutes);
  }

  /**
   * Initialize Swagger documentation
   */
  private initializeSwagger(): void {
    // Swagger UI
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Stella API Documentation'
    }));

    // Swagger JSON endpoint
    this.app.get('/swagger.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  }

  /**
   * Initialize error handling middleware
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
   * Initialize databases
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
   * Start the server
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
   * Graceful shutdown
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
   * Get Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

export default StellaApp;