/**
 * MongoDB schemas for comprehensive user activity tracking
 */

import type { ObjectId } from 'mongodb';

export interface IUserSession {
  _id?: ObjectId;
  email: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  pageViews: Array<{
    page: string;
    timestamp: Date;
    timeSpent: number; // in seconds
    scrollDepth: number; // percentage
    interactions: number;
  }>;
  totalInteractions: number;
  deviceInfo: {
    userAgent: string;
    screenResolution: string;
    browserInfo: string;
    ipAddress: string;
    country?: string;
    city?: string;
  };
  status: 'active' | 'ended' | 'timeout';
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserInteraction {
  _id?: ObjectId;
  email: string;
  sessionId: string;
  type: 'click' | 'scroll' | 'hover' | 'input' | 'api_call' | 'search' | 'view_modal' | 'download' | 'upload';
  element: string; // CSS selector or element description
  page: string;
  timestamp: Date;
  metadata: {
    coordinates?: { x: number; y: number };
    value?: string; // for inputs
    duration?: number; // for hovers
    scrollPosition?: number;
    modalType?: string;
    apiEndpoint?: string;
    searchQuery?: string;
    fileType?: string;
    additional?: any;
  };
  createdAt: Date;
}

export interface IUserPineconeActivity {
  _id?: ObjectId;
  email: string;
  sessionId: string;
  queryId: string;
  type: 'search' | 'upsert' | 'delete' | 'fetch';
  indexName: string;
  queryVector?: number[];
  queryText?: string;
  topK?: number;
  filter?: any;
  results: Array<{
    id: string;
    score: number;
    metadata: any;
  }>;
  responseTime: number; // in milliseconds
  tokensUsed?: number;
  cost?: number;
  success: boolean;
  error?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface IUserDatabaseActivity {
  _id?: ObjectId;
  email: string;
  sessionId: string;
  queryId: string;
  type: 'read' | 'write' | 'update' | 'delete' | 'aggregate';
  collection: string;
  operation: string;
  query?: any;
  result?: {
    matchedCount?: number;
    modifiedCount?: number;
    insertedCount?: number;
    deletedCount?: number;
    documentCount?: number;
  };
  responseTime: number; // in milliseconds
  indexesUsed?: string[];
  dataTransferred?: number; // in bytes
  success: boolean;
  error?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface IUserFeatureUsage {
  _id?: ObjectId;
  email: string;
  sessionId: string;
  feature: string; // 'chat', 'search', 'summary', 'admin_panel', 'analytics', etc.
  action: string; // 'start', 'complete', 'cancel', 'error'
  startTime: Date;
  endTime: Date; // Required
  duration: number; // in seconds
  metadata: {
    chatId?: string;
    searchQuery?: string;
    summaryLength?: number;
    aiTokensUsed?: number;
    errorMessage?: string;
    additional?: any;
  };
  success: boolean;
  timestamp: Date;
  createdAt: Date;
}

export interface IUserTimeTracking {
  _id?: ObjectId;
  email: string;
  date: string; // YYYY-MM-DD
  sessions: Array<{
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    duration: number;
  }>;
  totalActiveTime: number; // total seconds active
  totalIdleTime: number; // total seconds idle
  featuresUsed: Array<{
    feature: string;
    timeSpent: number; // in seconds
    interactions: number;
  }>;
  peakActivityHour: number; // 0-23
  productivity: {
    tasksCompleted: number;
    errorsEncountered: number;
    averageTaskTime: number;
    efficiency: number; // 0-100 score
  };
  createdAt: Date;
  updatedAt: Date;
}
