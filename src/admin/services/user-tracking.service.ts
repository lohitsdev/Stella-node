/**
 * Comprehensive User Activity Tracking Service
 * Tracks and stores all user interactions, time spent, and detailed analytics
 */

import { mongodb } from '../../database/mongodb.js';
import { pinecone } from '../../database/pinecone.js';
import type {
  IUserSession,
  IUserInteraction,
  IUserPineconeActivity,
  IUserDatabaseActivity,
  IUserFeatureUsage,
  IUserTimeTracking
} from '../schemas/user-activity.schema.js';

export class UserTrackingService {
  private activeSessions: Map<string, IUserSession> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Start a new user session
   */
  async startSession(email: string, deviceInfo: IUserSession['deviceInfo']): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: IUserSession = {
      email,
      sessionId,
      startTime: new Date(),
      pageViews: [],
      totalInteractions: 0,
      deviceInfo,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to MongoDB
    try {
      const sessionsCollection = mongodb.getCollection('user_sessions');
      await sessionsCollection.insertOne(session as any);

      // Store in memory for quick access
      this.activeSessions.set(sessionId, session);

      // Set timeout for session expiry
      this.resetSessionTimeout(sessionId);

      return sessionId;
    } catch (error) {
      console.error('Failed to start user session:', error);
      throw new Error('Failed to start session');
    }
  }

  /**
   * End a user session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

    try {
      const sessionsCollection = mongodb.getCollection('user_sessions');
      await sessionsCollection.updateOne(
        { sessionId },
        {
          $set: {
            endTime,
            duration,
            status: 'ended',
            updatedAt: new Date()
          }
        }
      );

      // Update time tracking
      await this.updateTimeTracking(session.email, sessionId, session.startTime, endTime, duration);

      // Clean up
      this.activeSessions.delete(sessionId);
      const timeout = this.sessionTimeouts.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.sessionTimeouts.delete(sessionId);
      }
    } catch (error) {
      console.error('Failed to end user session:', error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(sessionId: string, page: string, timeSpent: number = 0, scrollDepth: number = 0): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const pageView = {
      page,
      timestamp: new Date(),
      timeSpent,
      scrollDepth,
      interactions: 0
    };

    session.pageViews.push(pageView);
    session.updatedAt = new Date();

    try {
      const sessionsCollection = mongodb.getCollection('user_sessions');
      await sessionsCollection.updateOne(
        { sessionId },
        {
          $push: { pageViews: pageView } as any,
          $set: { updatedAt: session.updatedAt }
        }
      );

      this.resetSessionTimeout(sessionId);
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  /**
   * Track user interaction
   */
  async trackInteraction(
    sessionId: string,
    interaction: Omit<IUserInteraction, '_id' | 'email' | 'sessionId' | 'createdAt'>
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const fullInteraction: IUserInteraction = {
      email: session.email,
      sessionId,
      ...interaction,
      createdAt: new Date()
    };

    try {
      const interactionsCollection = mongodb.getCollection('user_interactions');
      await interactionsCollection.insertOne(fullInteraction as any);

      // Update session interaction count
      session.totalInteractions++;
      session.updatedAt = new Date();

      // Update current page view interaction count
      if (session.pageViews.length > 0) {
        const currentPageView = session.pageViews[session.pageViews.length - 1];
        if (currentPageView && currentPageView.page === interaction.page) {
          currentPageView.interactions++;
        }
      }

      const sessionsCollection = mongodb.getCollection('user_sessions');
      await sessionsCollection.updateOne(
        { sessionId },
        {
          $set: {
            totalInteractions: session.totalInteractions,
            pageViews: session.pageViews,
            updatedAt: session.updatedAt
          }
        }
      );

      this.resetSessionTimeout(sessionId);
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  /**
   * Track Pinecone activity
   */
  async trackPineconeActivity(
    email: string,
    sessionId: string,
    activity: Omit<IUserPineconeActivity, '_id' | 'email' | 'sessionId' | 'createdAt'>
  ): Promise<void> {
    const fullActivity: IUserPineconeActivity = {
      email,
      sessionId,
      ...activity,
      createdAt: new Date()
    };

    try {
      const pineconeCollection = mongodb.getCollection('user_pinecone_activity');
      await pineconeCollection.insertOne(fullActivity as any);
    } catch (error) {
      console.error('Failed to track Pinecone activity:', error);
    }
  }

  /**
   * Track database activity
   */
  async trackDatabaseActivity(
    email: string,
    sessionId: string,
    activity: Omit<IUserDatabaseActivity, '_id' | 'email' | 'sessionId' | 'createdAt'>
  ): Promise<void> {
    const fullActivity: IUserDatabaseActivity = {
      email,
      sessionId,
      ...activity,
      createdAt: new Date()
    };

    try {
      const dbCollection = mongodb.getCollection('user_database_activity');
      await dbCollection.insertOne(fullActivity as any);
    } catch (error) {
      console.error('Failed to track database activity:', error);
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(
    email: string,
    sessionId: string,
    usage: Omit<IUserFeatureUsage, '_id' | 'email' | 'sessionId' | 'createdAt'>
  ): Promise<void> {
    const fullUsage: IUserFeatureUsage = {
      email,
      sessionId,
      ...usage,
      createdAt: new Date()
    };

    try {
      const featureCollection = mongodb.getCollection('user_feature_usage');
      await featureCollection.insertOne(fullUsage as any);
    } catch (error) {
      console.error('Failed to track feature usage:', error);
    }
  }

  /**
   * Get detailed Pinecone analytics for a user
   */
  async getPineconeAnalytics(email: string): Promise<any> {
    try {
      const pineconeCollection = mongodb.getCollection('user_pinecone_activity');
      const activities = await pineconeCollection.find({ email }).toArray();

      if (activities.length === 0) {
        return this.getEmptyPineconeAnalytics();
      }

      const totalQueries = activities.filter(a => a.type === 'search').length;
      const totalUpserts = activities.filter(a => a.type === 'upsert').length;
      const avgQueryTime = activities.reduce((sum, a) => sum + a.responseTime, 0) / activities.length;
      const avgScore =
        activities
          .filter(a => a.results && a.results.length > 0)
          .reduce((sum, a) => sum + (a.results[0]?.score || 0), 0) / Math.max(1, totalQueries);

      // Get index stats from Pinecone
      const indexStats = await this.getPineconeIndexStats();

      return {
        totalQueries,
        totalUpserts,
        averageQueryTime: avgQueryTime,
        indexUtilization: (totalQueries / Math.max(1, indexStats.totalVectorCount)) * 100,
        vectorDimensions: indexStats.dimension,
        totalVectors: indexStats.totalVectorCount,
        averageScore: avgScore,
        queryPerformance: activities.slice(-20).map(a => ({
          timestamp: a.timestamp,
          responseTime: a.responseTime,
          topK: a.topK || 10,
          resultCount: a.results?.length || 0
        })),
        indexStats,
        costAnalysis: {
          queryCost: totalQueries * 0.0004, // Estimated cost per query
          storageCost: indexStats.totalVectorCount * 0.00000001, // Estimated storage cost
          totalCost: totalQueries * 0.0004 + indexStats.totalVectorCount * 0.00000001,
          costTrend: [] // Would need historical data
        }
      };
    } catch (error) {
      console.error('Failed to get Pinecone analytics:', error);
      return this.getEmptyPineconeAnalytics();
    }
  }

  /**
   * Get detailed database analytics for a user
   */
  async getDatabaseAnalytics(email: string): Promise<any> {
    try {
      const dbCollection = mongodb.getCollection('user_database_activity');
      const activities = await dbCollection.find({ email }).toArray();

      if (activities.length === 0) {
        return this.getEmptyDatabaseAnalytics();
      }

      const totalQueries = activities.length;
      const totalWrites = activities.filter(a => ['write', 'update', 'delete'].includes(a.type)).length;
      const totalReads = activities.filter(a => a.type === 'read').length;
      const avgQueryTime = activities.reduce((sum, a) => sum + a.responseTime, 0) / activities.length;

      // Slowest queries
      const slowestQueries = activities
        .sort((a, b) => b.responseTime - a.responseTime)
        .slice(0, 10)
        .map(a => ({
          collection: a.collection,
          operation: a.operation,
          duration: a.responseTime,
          timestamp: a.timestamp
        }));

      // Collection usage analysis
      const collectionMap = new Map();
      activities.forEach(a => {
        if (!collectionMap.has(a.collection)) {
          collectionMap.set(a.collection, {
            collection: a.collection,
            readCount: 0,
            writeCount: 0,
            totalTime: 0,
            count: 0
          });
        }
        const stats = collectionMap.get(a.collection);
        if (a.type === 'read') stats.readCount++;
        else stats.writeCount++;
        stats.totalTime += a.responseTime;
        stats.count++;
      });

      const collectionUsage = Array.from(collectionMap.values()).map(stats => ({
        ...stats,
        averageResponseTime: stats.totalTime / stats.count,
        dataSize: 0 // Would need to query actual collection sizes
      }));

      return {
        totalQueries,
        totalWrites,
        totalReads,
        averageQueryTime: avgQueryTime,
        slowestQueries,
        collectionUsage,
        indexPerformance: [], // Would need to analyze index usage
        connectionStats: {
          activeConnections: 1,
          totalConnections: 1,
          connectionPoolSize: 10,
          averageConnectionTime: 50
        }
      };
    } catch (error) {
      console.error('Failed to get database analytics:', error);
      return this.getEmptyDatabaseAnalytics();
    }
  }

  /**
   * Get comprehensive behavior tracking for a user
   */
  async getBehaviorTracking(email: string): Promise<any> {
    try {
      const sessionsCollection = mongodb.getCollection('user_sessions');
      const interactionsCollection = mongodb.getCollection('user_interactions');
      const featureCollection = mongodb.getCollection('user_feature_usage');

      const sessions = await sessionsCollection.find({ email }).toArray();
      const interactions = await interactionsCollection.find({ email }).toArray();
      const features = await featureCollection.find({ email }).toArray();

      const totalSessions = sessions.length;
      const totalActiveTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const avgSessionLength = totalActiveTime / Math.max(1, totalSessions);

      // Feature adoption analysis
      const featureMap = new Map();
      features.forEach(f => {
        if (!featureMap.has(f.feature)) {
          featureMap.set(f.feature, {
            feature: f.feature,
            usageCount: 0,
            timeSpent: 0,
            lastUsed: f.timestamp,
            successes: 0,
            total: 0
          });
        }
        const stats = featureMap.get(f.feature);
        stats.usageCount++;
        stats.timeSpent += f.duration || 0;
        stats.total++;
        if (f.success) stats.successes++;
        if (f.timestamp > stats.lastUsed) stats.lastUsed = f.timestamp;
      });

      const featureAdoption = Array.from(featureMap.values()).map(stats => ({
        feature: stats.feature,
        usageCount: stats.usageCount,
        timeSpent: stats.timeSpent,
        lastUsed: stats.lastUsed,
        proficiency: (stats.successes / Math.max(1, stats.total)) * 100
      }));

      // Interaction patterns
      const interactionMap = new Map();
      interactions.forEach(i => {
        if (!interactionMap.has(i.type)) {
          interactionMap.set(i.type, {
            type: i.type,
            count: 0,
            totalTime: 0,
            successes: 0
          });
        }
        const stats = interactionMap.get(i.type);
        stats.count++;
        stats.totalTime += i.metadata?.duration || 0;
        // Assume most interactions are successful unless there's an error
        stats.successes++;
      });

      const interactionPatterns = Array.from(interactionMap.values()).map(stats => ({
        type: stats.type,
        count: stats.count,
        averageTime: stats.totalTime / Math.max(1, stats.count),
        successRate: (stats.successes / Math.max(1, stats.count)) * 100
      }));

      // Device analytics
      const deviceMap = new Map();
      sessions.forEach(s => {
        const key = `${s.deviceInfo.browserInfo}_${s.deviceInfo.screenResolution}`;
        if (!deviceMap.has(key)) {
          deviceMap.set(key, {
            device: 'Desktop', // Simplified
            browser: s.deviceInfo.browserInfo || 'Unknown',
            os: 'Unknown',
            screenResolution: s.deviceInfo.screenResolution || 'Unknown',
            usageCount: 0,
            totalTime: 0
          });
        }
        const stats = deviceMap.get(key);
        stats.usageCount++;
        stats.totalTime += s.duration || 0;
      });

      const deviceAnalytics = Array.from(deviceMap.values()).map(stats => ({
        ...stats,
        averageSessionTime: stats.totalTime / Math.max(1, stats.usageCount)
      }));

      return {
        totalSessions,
        totalActiveTime,
        totalIdleTime: 0, // Would need idle time tracking
        averageSessionLength: avgSessionLength,
        sessionFrequency: totalSessions / Math.max(1, this.getDaysSinceFirstSession(sessions)),
        retentionRate: this.calculateRetentionRate(sessions),
        featureAdoption,
        interactionPatterns,
        navigationFlow: [], // Would need page transition tracking
        deviceAnalytics,
        geographicData: [] // Would need IP geolocation
      };
    } catch (error) {
      console.error('Failed to get behavior tracking:', error);
      return this.getEmptyBehaviorTracking();
    }
  }

  /**
   * Private helper methods
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private resetSessionTimeout(sessionId: string): void {
    const existingTimeout = this.sessionTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.endSession(sessionId);
    }, this.SESSION_TIMEOUT);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  private async updateTimeTracking(
    email: string,
    sessionId: string,
    startTime: Date,
    endTime: Date,
    duration: number
  ): Promise<void> {
    const date = startTime.toISOString().split('T')[0];

    try {
      const timeCollection = mongodb.getCollection('user_time_tracking');
      await timeCollection.updateOne(
        { email, date },
        {
          $push: {
            sessions: { sessionId, startTime, endTime, duration }
          } as any,
          $inc: {
            totalActiveTime: duration
          },
          $setOnInsert: {
            email,
            date,
            totalIdleTime: 0,
            featuresUsed: [],
            peakActivityHour: startTime.getHours(),
            productivity: {
              tasksCompleted: 0,
              errorsEncountered: 0,
              averageTaskTime: 0,
              efficiency: 0
            },
            createdAt: new Date()
          },
          $set: {
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Failed to update time tracking:', error);
    }
  }

  private async getPineconeIndexStats(): Promise<any> {
    try {
      // This would call Pinecone API to get real index stats
      // For now, return mock data
      return {
        name: 'rohit-buddy-voice-bot',
        dimension: 1536,
        metric: 'cosine',
        pods: 1,
        replicas: 1,
        shards: 1,
        totalVectorCount: 1000,
        indexSize: 1536000
      };
    } catch (error) {
      return {
        name: 'unknown',
        dimension: 0,
        metric: 'cosine',
        pods: 0,
        replicas: 0,
        shards: 0,
        totalVectorCount: 0,
        indexSize: 0
      };
    }
  }

  private getDaysSinceFirstSession(sessions: any[]): number {
    if (sessions.length === 0) return 1;
    const firstSession = sessions.reduce((earliest, session) =>
      session.startTime < earliest.startTime ? session : earliest
    );
    const daysDiff = (Date.now() - new Date(firstSession.startTime).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.ceil(daysDiff));
  }

  private calculateRetentionRate(sessions: any[]): number {
    if (sessions.length < 2) return 0;

    const uniqueDays = new Set(sessions.map(s => new Date(s.startTime).toISOString().split('T')[0]));

    const totalDays = this.getDaysSinceFirstSession(sessions);
    return (uniqueDays.size / totalDays) * 100;
  }

  private getEmptyPineconeAnalytics() {
    return {
      totalQueries: 0,
      totalUpserts: 0,
      averageQueryTime: 0,
      indexUtilization: 0,
      vectorDimensions: 0,
      totalVectors: 0,
      averageScore: 0,
      queryPerformance: [],
      indexStats: {
        name: 'unknown',
        dimension: 0,
        metric: 'cosine',
        pods: 0,
        replicas: 0,
        shards: 0,
        totalVectorCount: 0,
        indexSize: 0
      },
      costAnalysis: {
        queryCost: 0,
        storageCost: 0,
        totalCost: 0,
        costTrend: []
      }
    };
  }

  private getEmptyDatabaseAnalytics() {
    return {
      totalQueries: 0,
      totalWrites: 0,
      totalReads: 0,
      averageQueryTime: 0,
      slowestQueries: [],
      collectionUsage: [],
      indexPerformance: [],
      connectionStats: {
        activeConnections: 0,
        totalConnections: 0,
        connectionPoolSize: 0,
        averageConnectionTime: 0
      }
    };
  }

  private getEmptyBehaviorTracking() {
    return {
      totalSessions: 0,
      totalActiveTime: 0,
      totalIdleTime: 0,
      averageSessionLength: 0,
      sessionFrequency: 0,
      retentionRate: 0,
      featureAdoption: [],
      interactionPatterns: [],
      navigationFlow: [],
      deviceAnalytics: [],
      geographicData: []
    };
  }
}

export const userTrackingService = new UserTrackingService();
