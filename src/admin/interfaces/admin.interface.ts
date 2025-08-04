/**
 * Admin module interfaces
 */

export interface IEnvironmentVariable {
  key: string;
  value: string;
  description?: string;
  isSecret: boolean;
  category: 'database' | 'api' | 'app' | 'security' | 'other';
}

export interface IEnvironmentUpdate {
  key: string;
  value: string;
}

export interface ISystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  nodeVersion: string;
  platform: string;
}

export interface IServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  lastChecked: Date;
  responseTime?: number;
  error?: string;
  details?: any;
}

export interface IAnalytics {
  totalRequests: number;
  requestsPerHour: number;
  errorRate: number;
  averageResponseTime: number;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  recentErrors: Array<{
    timestamp: Date;
    endpoint: string;
    error: string;
    statusCode: number;
  }>;
}

export interface ILogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  meta?: any;
}

export interface ISystemInfo {
  version: string;
  environment: string;
  startTime: Date;
  services: IServiceStatus[];
  metrics: ISystemMetrics;
}

export interface IUserStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  usersByStatus: Record<string, number>;
  usersByProvider: Record<string, number>;
  recentRegistrations: number;
  activeUsers: number;
}

export interface IUserListItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  provider: string;
  emailVerified: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  createdAt: Date;
}

export interface ISecurityEvent {
  type: 'failed_login' | 'account_locked' | 'suspicious_activity' | 'password_reset';
  userId?: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details: string;
}

export interface IAIUsageStats {
  openai: {
    totalTokens: number;
    totalCost: number;
    requestsToday: number;
    averageTokensPerRequest: number;
  };
  hume: {
    totalCalls: number;
    eventsProcessed: number;
    callsToday: number;
  };
  pinecone: {
    totalQueries: number;
    averageLatency: number;
    queriesToday: number;
  };
}

export interface IDatabaseStats {
  collections: Array<{
    name: string;
    documentCount: number;
    avgSize: number;
    totalSize: number;
    indexes: number;
  }>;
  totalSize: number;
  totalDocuments: number;
}

export interface IPerformanceMetrics {
  endpoints: Array<{
    path: string;
    method: string;
    averageResponseTime: number;
    requestCount: number;
    errorRate: number;
    p95ResponseTime: number;
  }>;
  slowestQueries: Array<{
    query: string;
    collection: string;
    duration: number;
    timestamp: Date;
  }>;
}

export interface IUserAnalytics {
  user: IUserListItem;
  chatActivity: {
    totalSessions: number;
    activeSessions: number;
    averageSessionDuration: number;
    totalMessages: number;
    lastActivity: Date;
    sessionsByMonth: Array<{ month: string; count: number }>;
  };
  aiUsage: {
    openaiRequests: number;
    openaiTokens: number;
    openaiCost: number;
    humeApiCalls: number;
    humeEventsProcessed: number;
    emotionAnalysisCount: number;
  };
  vectorActivity: {
    searchQueries: number;
    embeddingsGenerated: number;
    averageSearchLatency: number;
    topSearchTerms: Array<{ term: string; count: number }>;
    searchesByCategory: Array<{ category: string; count: number }>;
  };
  summaries: {
    totalSummaries: number;
    averageSummaryLength: number;
    summariesByType: Array<{ type: string; count: number }>;
    recentSummaries: Array<{
      _id: string;
      chat_id: string;
      summary: string;
      created_at: Date;
      quality_score?: number;
    }>;
  };
  engagement: {
    totalApiCalls: number;
    averageResponseTime: number;
    errorRate: number;
    peakUsageHour: number;
    usagePattern: Array<{ hour: number; requests: number }>;
    deviceInfo: Array<{ device: string; count: number }>;
  };
  // Enhanced Pinecone Analytics
  pineconeActivity: {
    totalQueries: number;
    totalUpserts: number;
    averageQueryTime: number;
    indexUtilization: number; // percentage
    vectorDimensions: number;
    totalVectors: number;
    averageScore: number;
    queryPerformance: Array<{
      timestamp: Date;
      responseTime: number;
      topK: number;
      resultCount: number;
    }>;
    indexStats: {
      name: string;
      dimension: number;
      metric: string;
      pods: number;
      replicas: number;
      shards: number;
      totalVectorCount: number;
      indexSize: number; // in bytes
    };
    costAnalysis: {
      queryCost: number;
      storageCost: number;
      totalCost: number;
      costTrend: Array<{ date: string; cost: number }>;
    };
  };
  // Enhanced Database Analytics
  databaseActivity: {
    totalQueries: number;
    totalWrites: number;
    totalReads: number;
    averageQueryTime: number;
    slowestQueries: Array<{
      collection: string;
      operation: string;
      duration: number;
      timestamp: Date;
    }>;
    collectionUsage: Array<{
      collection: string;
      readCount: number;
      writeCount: number;
      averageResponseTime: number;
      dataSize: number;
    }>;
    indexPerformance: Array<{
      collection: string;
      index: string;
      hitRate: number;
      missRate: number;
    }>;
    connectionStats: {
      activeConnections: number;
      totalConnections: number;
      connectionPoolSize: number;
      averageConnectionTime: number;
    };
  };
  // Comprehensive User Behavior Tracking
  behaviorTracking: {
    totalSessions: number;
    totalActiveTime: number; // in seconds
    totalIdleTime: number;
    averageSessionLength: number;
    sessionFrequency: number; // sessions per day
    retentionRate: number; // percentage
    featureAdoption: Array<{
      feature: string;
      usageCount: number;
      timeSpent: number;
      lastUsed: Date;
      proficiency: number; // 0-100 score
    }>;
    interactionPatterns: Array<{
      type: string;
      count: number;
      averageTime: number;
      successRate: number;
    }>;
    navigationFlow: Array<{
      fromPage: string;
      toPage: string;
      count: number;
      averageTime: number;
    }>;
    deviceAnalytics: Array<{
      device: string;
      browser: string;
      os: string;
      screenResolution: string;
      usageCount: number;
      averageSessionTime: number;
    }>;
    geographicData: Array<{
      country: string;
      city: string;
      sessionCount: number;
      totalTime: number;
    }>;
  };
  // Real-time Activity Feed
  timeline: Array<{
    timestamp: Date;
    type: 'chat' | 'search' | 'summary' | 'login' | 'error' | 'click' | 'navigation' | 'feature_use' | 'api_call';
    description: string;
    metadata?: any;
    duration?: number;
    success?: boolean;
  }>;
  // Performance & Productivity Metrics
  productivity: {
    tasksCompleted: number;
    averageTaskTime: number;
    errorRate: number;
    efficiency: number; // 0-100 score
    learningCurve: Array<{ date: string; proficiency: number }>;
    bottlenecks: Array<{
      area: string;
      timeSpent: number;
      frequency: number;
      impact: number;
    }>;
  };
}