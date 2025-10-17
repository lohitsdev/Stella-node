import { Environment, LogLevel } from '../enums/app.enum.js';

/**
 * Application configuration schema
 */
export const AppConfigSchema = {
  port: {
    type: 'number',
    minimum: 1000,
    maximum: 65535,
    default: 3000
  },
  environment: {
    type: 'string',
    enum: Object.values(Environment),
    default: Environment.DEVELOPMENT
  },
  logLevel: {
    type: 'string',
    enum: Object.values(LogLevel),
    default: LogLevel.INFO
  },
  corsOrigins: {
    type: 'array',
    items: {
      type: 'string'
    },
    default: ['*']
  },
  rateLimitWindowMs: {
    type: 'number',
    minimum: 1000,
    default: 900000 // 15 minutes
  },
  rateLimitMaxRequests: {
    type: 'number',
    minimum: 1,
    default: 100
  }
};

/**
 * Pagination schema
 */
export const PaginationSchema = {
  page: {
    type: 'number',
    minimum: 1,
    default: 1
  },
  limit: {
    type: 'number',
    minimum: 1,
    maximum: 100,
    default: 10
  },
  sortBy: {
    type: 'string',
    default: 'createdAt'
  },
  sortOrder: {
    type: 'string',
    enum: ['asc', 'desc'],
    default: 'desc'
  }
};

/**
 * API response schema
 */
export const ApiResponseSchema = {
  success: {
    type: 'boolean',
    required: true
  },
  data: {
    type: 'any'
  },
  message: {
    type: 'string'
  },
  error: {
    type: 'string'
  },
  timestamp: {
    type: 'date',
    required: true
  },
  pagination: {
    type: 'object',
    properties: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
      pages: { type: 'number' },
      hasNext: { type: 'boolean' },
      hasPrevious: { type: 'boolean' }
    }
  }
};
