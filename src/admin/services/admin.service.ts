import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { ObjectId } from 'mongodb';

import { mongodb } from '../../database/mongodb.js';
import { pinecone } from '../../database/pinecone.js';
import { configService } from '../../services/config.service.js';
import type {
  IEnvironmentVariable,
  IEnvironmentUpdate,
  ISystemMetrics,
  IServiceStatus,
  IAnalytics,
  ILogEntry,
  ISystemInfo,
  IUserStats,
  IUserListItem,
  ISecurityEvent,
  IAIUsageStats,
  IDatabaseStats,
  IPerformanceMetrics,
  IUserAnalytics
} from '../interfaces/admin.interface.js';

import { userTrackingService } from './user-tracking.service.js';

export class AdminService {
  private requestMetrics: Map<string, number> = new Map();
  private errorLogs: Array<{ timestamp: Date; endpoint: string; error: string; statusCode: number }> = [];
  private systemLogs: ILogEntry[] = [];
  private securityEvents: ISecurityEvent[] = [];
  private aiUsageTracking: Map<string, any> = new Map();
  private performanceData: Map<string, Array<{ timestamp: Date; responseTime: number }>> = new Map();

  /**
   * Get all environment variables with metadata
   */
  async getEnvironmentVariables(): Promise<IEnvironmentVariable[]> {
    const envVars: IEnvironmentVariable[] = [
      // MongoDB Configuration
      {
        key: 'MONGODB_URI',
        value: this.maskSensitive(process.env.MONGODB_URI || ''),
        description: 'MongoDB connection string',
        isSecret: true,
        category: 'database'
      },
      {
        key: 'MONGODB_DATABASE',
        value: process.env.MONGODB_DATABASE || '',
        description: 'MongoDB database name',
        isSecret: false,
        category: 'database'
      },
      {
        key: 'MONGODB_MAX_POOL_SIZE',
        value: process.env.MONGODB_MAX_POOL_SIZE || '10',
        description: 'Maximum connection pool size',
        isSecret: false,
        category: 'database'
      },
      {
        key: 'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
        value: process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000',
        description: 'Server selection timeout in milliseconds',
        isSecret: false,
        category: 'database'
      },

      // Pinecone Configuration
      {
        key: 'PINECONE_API_KEY',
        value: this.maskSensitive(process.env.PINECONE_API_KEY || ''),
        description: 'Pinecone API key for vector operations',
        isSecret: true,
        category: 'api'
      },
      {
        key: 'PINECONE_ENVIRONMENT',
        value: process.env.PINECONE_ENVIRONMENT || '',
        description: 'Pinecone environment/region',
        isSecret: false,
        category: 'api'
      },
      {
        key: 'PINECONE_INDEX_NAME',
        value: process.env.PINECONE_INDEX_NAME || '',
        description: 'Pinecone index name',
        isSecret: false,
        category: 'api'
      },

      // Application Configuration
      {
        key: 'PORT',
        value: process.env.PORT || '3000',
        description: 'Application port number',
        isSecret: false,
        category: 'app'
      },
      {
        key: 'NODE_ENV',
        value: process.env.NODE_ENV || 'development',
        description: 'Node.js environment',
        isSecret: false,
        category: 'app'
      },

      // Security Configuration
      {
        key: 'JWT_SECRET',
        value: this.maskSensitive(process.env.JWT_SECRET || ''),
        description: 'JWT signing secret',
        isSecret: true,
        category: 'security'
      },
      {
        key: 'JWT_EXPIRES_IN',
        value: process.env.JWT_EXPIRES_IN || '24h',
        description: 'JWT token expiration time',
        isSecret: false,
        category: 'security'
      },

      // AI Service Configuration
      {
        key: 'OPENAI_API_KEY',
        value: this.maskSensitive(process.env.OPENAI_API_KEY || ''),
        description: 'OpenAI API key',
        isSecret: true,
        category: 'api'
      }
    ];

    return envVars;
  }

  /**
   * Update environment variables
   */
  async updateEnvironmentVariables(updates: IEnvironmentUpdate[]): Promise<boolean> {
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';

      try {
        envContent = await fs.readFile(envPath, 'utf-8');
      } catch (error) {
        // File doesn't exist, create new content
        envContent = '';
      }

      // Update or add environment variables
      for (const update of updates) {
        const regex = new RegExp(`^${update.key}=.*$`, 'm');
        const newLine = `${update.key}=${update.value}`;

        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, newLine);
        } else {
          envContent += `\n${newLine}`;
        }
      }

      await fs.writeFile(envPath, `${envContent.trim()}\n`);

      // Log the update
      this.addSystemLog('info', `Environment variables updated: ${updates.map(u => u.key).join(', ')}`);

      return true;
    } catch (error) {
      this.addSystemLog('error', `Failed to update environment variables: ${error}`);
      throw new Error('Failed to update environment variables');
    }
  }

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(): Promise<ISystemMetrics> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpu: {
        usage: await this.getCpuUsage(),
        cores: os.cpus().length
      },
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: os.platform()
    };
  }

  /**
   * Get all service statuses
   */
  async getServiceStatus(): Promise<IServiceStatus[]> {
    const services: IServiceStatus[] = [];

    // MongoDB Status
    try {
      const start = Date.now();
      const mongoHealthy = await mongodb.ping();
      const responseTime = Date.now() - start;

      services.push({
        name: 'MongoDB',
        status: mongoHealthy ? 'healthy' : 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        details: {
          uri: this.maskSensitive(configService.get('mongodb.uri', '')),
          database: configService.get('mongodb.database', 'stella')
        }
      });
    } catch (error) {
      services.push({
        name: 'MongoDB',
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Pinecone Status
    try {
      const start = Date.now();
      const pineconeHealthy = await pinecone.ping();
      const responseTime = Date.now() - start;

      services.push({
        name: 'Pinecone',
        status: pineconeHealthy ? 'healthy' : 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        details: {
          environment: configService.get('pinecone.environment', ''),
          indexName: configService.get('pinecone.indexName', '')
        }
      });
    } catch (error) {
      services.push({
        name: 'Pinecone',
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return services;
  }

  /**
   * Get analytics data
   */
  async getAnalytics(): Promise<IAnalytics> {
    const totalRequests = Array.from(this.requestMetrics.values()).reduce((sum, count) => sum + count, 0);
    const requestsPerHour = this.calculateRequestsPerHour();

    return {
      totalRequests,
      requestsPerHour,
      errorRate: this.calculateErrorRate(),
      averageResponseTime: await this.calculateAverageResponseTime(),
      topEndpoints: this.getTopEndpoints(),
      recentErrors: this.errorLogs.slice(-10) // Last 10 errors
    };
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<ISystemInfo> {
    const services = await this.getServiceStatus();
    const metrics = await this.getSystemMetrics();

    return {
      version: '1.0.0',
      environment: configService.get('app.environment', 'development'),
      startTime: new Date(Date.now() - process.uptime() * 1000),
      services,
      metrics
    };
  }

  /**
   * Get recent system logs
   */
  getSystemLogs(limit: number = 100): ILogEntry[] {
    return this.systemLogs.slice(-limit);
  }

  /**
   * Add a system log entry
   */
  addSystemLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any): void {
    this.systemLogs.push({
      timestamp: new Date(),
      level,
      message,
      meta
    });

    // Keep only last 1000 logs to prevent memory issues
    if (this.systemLogs.length > 1000) {
      this.systemLogs = this.systemLogs.slice(-1000);
    }
  }

  /**
   * Track API request for analytics
   */
  trackRequest(endpoint: string): void {
    const current = this.requestMetrics.get(endpoint) || 0;
    this.requestMetrics.set(endpoint, current + 1);
  }

  /**
   * Track API error for analytics
   */
  trackError(endpoint: string, error: string, statusCode: number): void {
    this.errorLogs.push({
      timestamp: new Date(),
      endpoint,
      error,
      statusCode
    });

    // Keep only last 100 errors
    if (this.errorLogs.length > 100) {
      this.errorLogs = this.errorLogs.slice(-100);
    }
  }

  /**
   * Get user statistics and management data
   */
  async getUserStats(): Promise<IUserStats> {
    try {
      const usersCollection = mongodb.getCollection('users');

      // Get total user count
      const totalUsers = await usersCollection.countDocuments();

      // Get users by role
      const roleAggregation = await usersCollection
        .aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }])
        .toArray();

      const usersByRole: Record<string, number> = {};
      roleAggregation.forEach(item => {
        usersByRole[item._id] = item.count;
      });

      // Get users by status
      const statusAggregation = await usersCollection
        .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        .toArray();

      const usersByStatus: Record<string, number> = {};
      statusAggregation.forEach(item => {
        usersByStatus[item._id] = item.count;
      });

      // Get users by provider
      const providerAggregation = await usersCollection
        .aggregate([{ $group: { _id: '$provider', count: { $sum: 1 } } }])
        .toArray();

      const usersByProvider: Record<string, number> = {};
      providerAggregation.forEach(item => {
        usersByProvider[item._id] = item.count;
      });

      // Get recent registrations (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentRegistrations = await usersCollection.countDocuments({
        createdAt: { $gte: yesterday }
      });

      // Get active users (logged in within last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeUsers = await usersCollection.countDocuments({
        lastLogin: { $gte: weekAgo }
      });

      return {
        totalUsers,
        usersByRole,
        usersByStatus,
        usersByProvider,
        recentRegistrations,
        activeUsers
      };
    } catch (error) {
      this.addSystemLog('error', `Failed to get user stats: ${error}`);
      throw new Error('Failed to retrieve user statistics');
    }
  }

  /**
   * Get paginated list of users
   */
  async getUsers(
    page: number = 1,
    limit: number = 50,
    filters?: any
  ): Promise<{ users: IUserListItem[]; total: number; page: number; totalPages: number }> {
    try {
      const usersCollection = mongodb.getCollection('users');
      const skip = (page - 1) * limit;

      // Build query filters
      const query: any = {};
      if (filters?.role) query.role = filters.role;
      if (filters?.status) query.status = filters.status;
      if (filters?.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ];
      }

      // Get users with pagination
      const users = await usersCollection
        .find(query, { projection: { password: 0, refreshTokens: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await usersCollection.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      const userList: IUserListItem[] = users.map(user => ({
        _id: user._id?.toString() || '',
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        provider: user.provider,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        loginAttempts: user.loginAttempts,
        createdAt: user.createdAt
      }));

      return { users: userList, total, page, totalPages };
    } catch (error) {
      this.addSystemLog('error', `Failed to get users: ${error}`);
      throw new Error('Failed to retrieve users');
    }
  }

  /**
   * Get security events and monitoring data
   */
  async getSecurityEvents(limit: number = 100): Promise<ISecurityEvent[]> {
    return this.securityEvents.slice(-limit);
  }

  /**
   * Track security events
   */
  addSecurityEvent(event: Omit<ISecurityEvent, 'timestamp'>): void {
    this.securityEvents.push({
      ...event,
      timestamp: new Date()
    });

    // Keep only last 500 security events
    if (this.securityEvents.length > 500) {
      this.securityEvents = this.securityEvents.slice(-500);
    }

    // Log security event
    this.addSystemLog('warn', `Security Event: ${event.type} for ${event.email}`, event);
  }

  /**
   * Get AI usage statistics
   */
  async getAIUsageStats(): Promise<IAIUsageStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // These would be more sophisticated in production with actual tracking
    return {
      openai: {
        totalTokens: this.aiUsageTracking.get('openai_total_tokens') || 0,
        totalCost: this.aiUsageTracking.get('openai_total_cost') || 0,
        requestsToday: this.aiUsageTracking.get('openai_requests_today') || 0,
        averageTokensPerRequest: this.aiUsageTracking.get('openai_avg_tokens') || 0
      },
      pinecone: {
        totalQueries: this.aiUsageTracking.get('pinecone_total_queries') || 0,
        averageLatency: this.aiUsageTracking.get('pinecone_avg_latency') || 0,
        queriesToday: this.aiUsageTracking.get('pinecone_queries_today') || 0
      }
    };
  }

  /**
   * Track AI service usage
   */
  trackAIUsage(service: 'openai' | 'pinecone', type: string, data: any): void {
    const key = `${service}_${type}`;
    const current = this.aiUsageTracking.get(key) || 0;

    if (typeof data === 'number') {
      this.aiUsageTracking.set(key, current + data);
    } else {
      this.aiUsageTracking.set(key, current + 1);
    }

    // Track daily statistics
    const today = new Date().toDateString();
    const dailyKey = `${service}_${type}_${today}`;
    const dailyCurrent = this.aiUsageTracking.get(dailyKey) || 0;
    this.aiUsageTracking.set(dailyKey, dailyCurrent + (typeof data === 'number' ? data : 1));
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<IDatabaseStats> {
    try {
      const db = mongodb.getDatabase();
      const admin = db.admin();

      // Get database stats
      const dbStats = await admin.command({ dbStats: 1 });

      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = [];

      for (const collection of collections) {
        try {
          const stats = await db.command({ collStats: collection.name });
          collectionStats.push({
            name: collection.name,
            documentCount: stats.count || 0,
            avgSize: stats.avgObjSize || 0,
            totalSize: stats.size || 0,
            indexes: stats.nindexes || 0
          });
        } catch (error) {
          // Collection might not exist or be accessible
          collectionStats.push({
            name: collection.name,
            documentCount: 0,
            avgSize: 0,
            totalSize: 0,
            indexes: 0
          });
        }
      }

      return {
        collections: collectionStats,
        totalSize: dbStats.dataSize || 0,
        totalDocuments: collectionStats.reduce((sum, col) => sum + col.documentCount, 0)
      };
    } catch (error) {
      this.addSystemLog('error', `Failed to get database stats: ${error}`);
      throw new Error('Failed to retrieve database statistics');
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<IPerformanceMetrics> {
    // Calculate endpoint performance from tracked data
    const endpoints: IPerformanceMetrics['endpoints'] = [];

    for (const [endpoint, count] of this.requestMetrics.entries()) {
      const perfData = this.performanceData.get(endpoint) || [];
      const responseTimes = perfData.map(d => d.responseTime);

      const averageResponseTime =
        responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

      const p95ResponseTime =
        responseTimes.length > 0
          ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)] || 0
          : 0;

      const errorCount = this.errorLogs.filter(log => log.endpoint === endpoint).length;
      const errorRate = count > 0 ? (errorCount / count) * 100 : 0;

      endpoints.push({
        path: endpoint,
        method: 'GET', // Simplified - in production, track method separately
        averageResponseTime,
        requestCount: count,
        errorRate,
        p95ResponseTime
      });
    }

    // Sort by request count
    endpoints.sort((a, b) => b.requestCount - a.requestCount);

    return {
      endpoints: endpoints.slice(0, 20), // Top 20 endpoints
      slowestQueries: [] // Placeholder - would need MongoDB profiling in production
    };
  }

  /**
   * Track request performance
   */
  trackRequestPerformance(endpoint: string, responseTime: number): void {
    if (!this.performanceData.has(endpoint)) {
      this.performanceData.set(endpoint, []);
    }

    const data = this.performanceData.get(endpoint)!;
    data.push({ timestamp: new Date(), responseTime });

    // Keep only last 1000 measurements per endpoint
    if (data.length > 1000) {
      this.performanceData.set(endpoint, data.slice(-1000));
    }
  }

  /**
   * Update user status (suspend, activate, etc.)
   */
  async updateUserStatus(userId: string, status: string): Promise<boolean> {
    try {
      const usersCollection = mongodb.getCollection('users');
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            status,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount > 0) {
        this.addSystemLog('info', `User status updated: ${userId} -> ${status}`);
        this.addSecurityEvent({
          type: 'suspicious_activity',
          userId,
          email: 'admin_action',
          details: `User status changed to ${status}`
        });
        return true;
      }
      return false;
    } catch (error) {
      this.addSystemLog('error', `Failed to update user status: ${error}`);
      throw new Error('Failed to update user status');
    }
  }

  /**
   * Get comprehensive analytics for a specific user
   */
  async getUserAnalytics(userId: string): Promise<IUserAnalytics> {
    try {
      // Get user details
      const usersCollection = mongodb.getCollection('users');
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        throw new Error('User not found');
      }

      const userDetails: IUserListItem = {
        _id: user._id?.toString() || '',
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        provider: user.provider,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        loginAttempts: user.loginAttempts,
        createdAt: user.createdAt
      };

      // Get basic analytics
      const chatActivity = await this.getUserChatActivity(user.email);
      const aiUsage = await this.getUserAIUsage(user.email);
      const vectorActivity = await this.getUserVectorActivity(user.email);
      const summaries = await this.getUserSummaries(user.email);
      const engagement = await this.getUserEngagement(user.email);
      const timeline = await this.getUserTimeline(user.email);

      // Get enhanced analytics from tracking service
      const pineconeActivity = await userTrackingService.getPineconeAnalytics(user.email);
      const databaseActivity = await userTrackingService.getDatabaseAnalytics(user.email);
      const behaviorTracking = await userTrackingService.getBehaviorTracking(user.email);

      // Get productivity metrics
      const productivity = await this.getUserProductivity(user.email);

      return {
        user: userDetails,
        chatActivity,
        aiUsage,
        vectorActivity,
        summaries,
        engagement,
        pineconeActivity,
        databaseActivity,
        behaviorTracking,
        timeline,
        productivity
      };
    } catch (error) {
      this.addSystemLog('error', `Failed to get user analytics: ${error}`);
      throw new Error('Failed to retrieve user analytics');
    }
  }

  /**
   * Get chat activity for a user
   */
  private async getUserChatActivity(email: string): Promise<IUserAnalytics['chatActivity']> {
    try {
      const chatCollection = mongodb.getCollection('chat_sessions');

      // Get all chat sessions for the user
      const sessions = await chatCollection.find({ email }).toArray();

      // Calculate metrics
      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(s => s.status === 'active').length;

      // Calculate average session duration
      const completedSessions = sessions.filter(s => s.ended_at);
      const totalDuration = completedSessions.reduce((sum, session) => {
        const duration = new Date(session.ended_at).getTime() - new Date(session.created_at).getTime();
        return sum + duration;
      }, 0);
      const averageSessionDuration = completedSessions.length > 0 ? totalDuration / completedSessions.length : 0;

      // Count total messages (if you store them)
      const totalMessages = sessions.reduce((sum, session) => sum + (session.message_count || 0), 0);

      // Get last activity
      const lastActivity =
        sessions.length > 0
          ? new Date(Math.max(...sessions.map(s => new Date(s.updated_at || s.created_at).getTime())))
          : new Date(0);

      // Sessions by month (last 12 months)
      const now = new Date();
      const sessionsByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const count = sessions.filter(s => {
          const sessionDate = new Date(s.created_at);
          return sessionDate >= monthDate && sessionDate < nextMonth;
        }).length;

        sessionsByMonth.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          count
        });
      }

      return {
        totalSessions,
        activeSessions,
        averageSessionDuration: Math.round(averageSessionDuration / 1000), // Convert to seconds
        totalMessages,
        lastActivity,
        sessionsByMonth
      };
    } catch (error) {
      return {
        totalSessions: 0,
        activeSessions: 0,
        averageSessionDuration: 0,
        totalMessages: 0,
        lastActivity: new Date(0),
        sessionsByMonth: []
      };
    }
  }

  /**
   * Get AI usage for a user
   */
  private async getUserAIUsage(email: string): Promise<IUserAnalytics['aiUsage']> {
    try {
      // This would ideally come from stored AI usage logs per user
      // For now, we'll calculate based on chat sessions and summaries
      const chatCollection = mongodb.getCollection('chat_sessions');
      const summaryCollection = mongodb.getCollection('summaries');

      const userSessions = await chatCollection.find({ email }).toArray();
      const userSummaries = await summaryCollection.find({ email }).toArray();

      // Estimate AI usage based on sessions and summaries
      const openaiRequests = userSummaries.length; // Each summary is an OpenAI request

      // Estimate tokens (rough calculation)
      const estimatedTokensPerSummary = 500;
      const openaiTokens = openaiRequests * estimatedTokensPerSummary;
      const openaiCost = openaiTokens * 0.00003; // Rough cost estimation

      return {
        openaiRequests,
        openaiTokens,
        openaiCost
      };
    } catch (error) {
      return {
        openaiRequests: 0,
        openaiTokens: 0,
        openaiCost: 0
      };
    }
  }

  /**
   * Get vector activity for a user
   */
  private async getUserVectorActivity(email: string): Promise<IUserAnalytics['vectorActivity']> {
    try {
      const toolQueriesCollection = mongodb.getCollection('tool_queries');

      const userQueries = await toolQueriesCollection.find({ user_email: email }).toArray();

      const searchQueries = userQueries.length;
      const embeddingsGenerated = userQueries.filter(q => q.embedding_generated).length;

      // Calculate average search latency
      const queriesWithTiming = userQueries.filter(q => q.response_time);
      const averageSearchLatency =
        queriesWithTiming.length > 0
          ? queriesWithTiming.reduce((sum, q) => sum + q.response_time, 0) / queriesWithTiming.length
          : 0;

      // Get top search terms
      const searchTerms = userQueries.map(q => q.query_text || q.search_term).filter(Boolean);
      const termCounts = searchTerms.reduce(
        (acc, term) => {
          acc[term] = (acc[term] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const topSearchTerms = Object.entries(termCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([term, count]) => ({ term, count: count as number }));

      // Searches by category (if available)
      const categories = userQueries.map(q => q.category || 'general').filter(Boolean);
      const categoryCounts = categories.reduce(
        (acc, cat) => {
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const searchesByCategory = Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count: count as number
      }));

      return {
        searchQueries,
        embeddingsGenerated,
        averageSearchLatency,
        topSearchTerms,
        searchesByCategory
      };
    } catch (error) {
      return {
        searchQueries: 0,
        embeddingsGenerated: 0,
        averageSearchLatency: 0,
        topSearchTerms: [],
        searchesByCategory: []
      };
    }
  }

  /**
   * Get summaries for a user
   */
  private async getUserSummaries(email: string): Promise<IUserAnalytics['summaries']> {
    try {
      const summaryCollection = mongodb.getCollection('summaries');

      const userSummaries = await summaryCollection.find({ email }).toArray();

      const totalSummaries = userSummaries.length;

      // Calculate average summary length
      const summaryLengths = userSummaries.map(s => s.summary?.length || 0);
      const averageSummaryLength =
        summaryLengths.length > 0 ? summaryLengths.reduce((sum, len) => sum + len, 0) / summaryLengths.length : 0;

      // Summaries by type (if available)
      const types = userSummaries.map(s => s.type || 'conversation').filter(Boolean);
      const typeCounts = types.reduce(
        (acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const summariesByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count: count as number }));

      // Recent summaries (last 10)
      const recentSummaries = userSummaries
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(s => ({
          _id: s._id?.toString() || '',
          chat_id: s.chat_id,
          summary: s.summary || '',
          created_at: s.created_at,
          quality_score: s.quality_score
        }));

      return {
        totalSummaries,
        averageSummaryLength: Math.round(averageSummaryLength),
        summariesByType,
        recentSummaries
      };
    } catch (error) {
      return {
        totalSummaries: 0,
        averageSummaryLength: 0,
        summariesByType: [],
        recentSummaries: []
      };
    }
  }

  /**
   * Get engagement metrics for a user
   */
  private async getUserEngagement(email: string): Promise<IUserAnalytics['engagement']> {
    try {
      // This would ideally come from request logs stored per user
      // For now, we'll estimate based on available data
      const chatCollection = mongodb.getCollection('chat_sessions');
      const toolQueriesCollection = mongodb.getCollection('tool_queries');

      const userSessions = await chatCollection.find({ email }).toArray();
      const userQueries = await toolQueriesCollection.find({ user_email: email }).toArray();

      const totalApiCalls = userSessions.length + userQueries.length;

      // Estimate average response time
      const queriesWithTiming = userQueries.filter(q => q.response_time);
      const averageResponseTime =
        queriesWithTiming.length > 0
          ? queriesWithTiming.reduce((sum, q) => sum + q.response_time, 0) / queriesWithTiming.length
          : 0;

      // Error rate (rough estimation)
      const failedSessions = userSessions.filter(s => s.status === 'error').length;
      const errorRate = totalApiCalls > 0 ? (failedSessions / totalApiCalls) * 100 : 0;

      // Usage pattern by hour (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentSessions = userSessions.filter(s => new Date(s.created_at) >= thirtyDaysAgo);

      const usagePattern = Array.from({ length: 24 }, (_, hour) => {
        const requests = recentSessions.filter(s => new Date(s.created_at).getHours() === hour).length;
        return { hour, requests };
      });

      const peakUsageHour = usagePattern.reduce((peak, current) =>
        current.requests > peak.requests ? current : peak
      ).hour;

      return {
        totalApiCalls,
        averageResponseTime,
        errorRate,
        peakUsageHour,
        usagePattern,
        deviceInfo: [{ device: 'web', count: totalApiCalls }] // Placeholder
      };
    } catch (error) {
      return {
        totalApiCalls: 0,
        averageResponseTime: 0,
        errorRate: 0,
        peakUsageHour: 0,
        usagePattern: [],
        deviceInfo: []
      };
    }
  }

  /**
   * Get user timeline (activity feed)
   */
  private async getUserTimeline(email: string): Promise<IUserAnalytics['timeline']> {
    try {
      const timeline: IUserAnalytics['timeline'] = [];

      // Get chat sessions
      const chatCollection = mongodb.getCollection('chat_sessions');
      const userSessions = await chatCollection.find({ email }).sort({ created_at: -1 }).limit(50).toArray();

      userSessions.forEach(session => {
        timeline.push({
          timestamp: new Date(session.created_at),
          type: 'chat',
          description: `Started chat session: ${session.chat_id}`,
          metadata: { chat_id: session.chat_id, status: session.status },
          duration: session.duration,
          success: session.status !== 'error'
        });

        if (session.ended_at) {
          timeline.push({
            timestamp: new Date(session.ended_at),
            type: 'chat',
            description: `Ended chat session: ${session.chat_id}`,
            metadata: { chat_id: session.chat_id, status: session.status },
            success: session.status !== 'error'
          });
        }
      });

      // Get summaries
      const summaryCollection = mongodb.getCollection('summaries');
      const userSummaries = await summaryCollection.find({ email }).sort({ created_at: -1 }).limit(20).toArray();

      userSummaries.forEach(summary => {
        timeline.push({
          timestamp: new Date(summary.created_at),
          type: 'summary',
          description: `Generated summary for chat: ${summary.chat_id}`,
          metadata: { chat_id: summary.chat_id, summary_length: summary.summary?.length },
          success: true
        });
      });

      // Get search queries
      const toolQueriesCollection = mongodb.getCollection('tool_queries');
      const userQueries = await toolQueriesCollection
        .find({ user_email: email })
        .sort({ created_at: -1 })
        .limit(30)
        .toArray();

      userQueries.forEach(query => {
        timeline.push({
          timestamp: new Date(query.created_at),
          type: 'search',
          description: `Performed search: ${query.query_text || 'Vector search'}`,
          metadata: { query_type: query.type, response_time: query.response_time },
          duration: query.response_time,
          success: !query.error
        });
      });

      // Get user interactions from tracking service
      const interactionsCollection = mongodb.getCollection('user_interactions');
      const userInteractions = await interactionsCollection.find({ email }).sort({ timestamp: -1 }).limit(50).toArray();

      userInteractions.forEach(interaction => {
        timeline.push({
          timestamp: new Date(interaction.timestamp),
          type: 'click',
          description: `${interaction.type} on ${interaction.element} in ${interaction.page}`,
          metadata: interaction.metadata,
          duration: interaction.metadata?.duration,
          success: true
        });
      });

      // Get feature usage from tracking service
      const featureCollection = mongodb.getCollection('user_feature_usage');
      const userFeatures = await featureCollection.find({ email }).sort({ timestamp: -1 }).limit(30).toArray();

      userFeatures.forEach(feature => {
        timeline.push({
          timestamp: new Date(feature.timestamp),
          type: 'feature_use',
          description: `${feature.action} ${feature.feature}`,
          metadata: feature.metadata,
          duration: feature.duration,
          success: feature.success
        });
      });

      // Sort timeline by timestamp (most recent first)
      timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return timeline.slice(0, 200); // Return last 200 activities
    } catch (error) {
      return [];
    }
  }

  /**
   * Get user productivity metrics
   */
  private async getUserProductivity(email: string): Promise<IUserAnalytics['productivity']> {
    try {
      const featureCollection = mongodb.getCollection('user_feature_usage');
      const features = await featureCollection.find({ email }).toArray();

      const tasksCompleted = features.filter(f => f.success && f.action === 'complete').length;
      const totalTasks = features.filter(f => f.action === 'complete' || f.action === 'cancel').length;
      const errorCount = features.filter(f => !f.success).length;

      const completedTasks = features.filter(f => f.success && f.duration);
      const avgTaskTime =
        completedTasks.length > 0
          ? completedTasks.reduce((sum, t) => sum + (t.duration || 0), 0) / completedTasks.length
          : 0;

      const efficiency = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;

      // Learning curve (proficiency over time)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentFeatures = features.filter(f => new Date(f.timestamp) >= thirtyDaysAgo);

      const learningCurve = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dayStr = date.toISOString().split('T')[0];
        const dayFeatures = recentFeatures.filter(f => new Date(f.timestamp).toISOString().split('T')[0] === dayStr);

        const daySuccess = dayFeatures.filter(f => f.success).length;
        const dayTotal = dayFeatures.length;
        const proficiency = dayTotal > 0 ? (daySuccess / dayTotal) * 100 : 0;

        learningCurve.push({
          date: dayStr || '',
          proficiency
        });
      }

      // Identify bottlenecks
      const featureMap = new Map();
      features.forEach(f => {
        if (!featureMap.has(f.feature)) {
          featureMap.set(f.feature, {
            area: f.feature,
            timeSpent: 0,
            frequency: 0,
            errors: 0
          });
        }
        const stats = featureMap.get(f.feature);
        stats.timeSpent += f.duration || 0;
        stats.frequency++;
        if (!f.success) stats.errors++;
      });

      const bottlenecks = Array.from(featureMap.values())
        .filter(stats => stats.errors > 0 || stats.timeSpent > avgTaskTime * 2)
        .map(stats => ({
          area: stats.area,
          timeSpent: stats.timeSpent,
          frequency: stats.frequency,
          impact: (stats.errors / stats.frequency) * 100
        }))
        .sort((a, b) => b.impact - a.impact)
        .slice(0, 5);

      return {
        tasksCompleted,
        averageTaskTime: Math.round(avgTaskTime),
        errorRate: totalTasks > 0 ? (errorCount / totalTasks) * 100 : 0,
        efficiency: Math.round(efficiency),
        learningCurve,
        bottlenecks
      };
    } catch (error) {
      return {
        tasksCompleted: 0,
        averageTaskTime: 0,
        errorRate: 0,
        efficiency: 0,
        learningCurve: [],
        bottlenecks: []
      };
    }
  }

  // Private helper methods

  private maskSensitive(value: string): string {
    if (!value || value.length < 8) return value;
    const start = value.substring(0, 4);
    const end = value.substring(value.length - 4);
    const middle = '*'.repeat(Math.max(0, value.length - 8));
    return `${start}${middle}${end}`;
  }

  private async getCpuUsage(): Promise<number> {
    // Simple CPU usage calculation
    const start = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const end = process.cpuUsage(start);
    const totalUsage = (end.user + end.system) / 1000000; // Convert to seconds
    return Math.round((totalUsage / 0.1) * 100); // Percentage over 100ms
  }

  private calculateRequestsPerHour(): number {
    // Simplified calculation - in production, you'd use time-based windows
    const totalRequests = Array.from(this.requestMetrics.values()).reduce((sum, count) => sum + count, 0);
    const uptimeHours = process.uptime() / 3600;
    return Math.round(totalRequests / Math.max(uptimeHours, 1));
  }

  private calculateErrorRate(): number {
    const totalRequests = Array.from(this.requestMetrics.values()).reduce((sum, count) => sum + count, 0);
    const totalErrors = this.errorLogs.length;
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  private async calculateAverageResponseTime(): Promise<number> {
    // Placeholder - in production, you'd track actual response times
    return Math.random() * 100 + 50; // 50-150ms range
  }

  private getTopEndpoints(): Array<{ endpoint: string; count: number }> {
    return Array.from(this.requestMetrics.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

// Singleton instance
export const adminService = new AdminService();
