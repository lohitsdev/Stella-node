import dotenv from 'dotenv';

import type {
  IConfiguration,
  IConfigService,
  IConfigValidation,
  IAppConfig,
  IAuthConfig,
  IAIConfig,
  IMongoConfig,
  IPineconeConfig,
  IOpenAIConfig
} from '../common/interfaces/config.interface.js';

// Load environment variables
dotenv.config();

/**
 * ConfigService similar to NestJS ConfigService for managing configuration
 */
export class ConfigService implements IConfigService {
  private config: IConfiguration;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Get configuration value by key with optional default value
   */
  get<T = any>(key: string): T;
  get<T = any>(key: string, defaultValue: T): T;
  get<T = any>(key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new Error(`Configuration key "${key}" not found`);
      }
    }

    return value as T;
  }

  /**
   * Get all configuration
   */
  getAll(): IConfiguration {
    return { ...this.config };
  }

  /**
   * Check if configuration key exists
   */
  has(key: string): boolean {
    try {
      this.get(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set configuration value (for testing purposes)
   */
  set(key: string, value: any): void {
    const keys = key.split('.');
    let current: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]!;
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  /**
   * Validate configuration
   */
  validate(): IConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!this.config.mongodb.uri) {
      errors.push('MongoDB URI is required (MONGODB_URI)');
    }

    // Only require Pinecone in production
    if (this.config.app.nodeEnv === 'production') {
      if (!this.config.pinecone.apiKey) {
        errors.push('Pinecone API key is required in production (PINECONE_API_KEY)');
      }

      if (!this.config.pinecone.environment) {
        errors.push('Pinecone environment is required in production (PINECONE_ENVIRONMENT)');
      }
    } else {
      // Development warnings
      if (!this.config.pinecone.apiKey) {
        warnings.push('Pinecone API key not provided - vector operations will be disabled');
      }

      if (!this.config.pinecone.environment) {
        warnings.push('Pinecone environment not provided - using development mode');
      }
    }

    // Validate authentication configuration
    if (!this.config.auth.jwtSecret || this.config.auth.jwtSecret === 'stella-dev-secret-key') {
      if (this.config.app.nodeEnv === 'production') {
        errors.push('JWT secret must be set in production (JWT_SECRET)');
      } else {
        warnings.push('Using default JWT secret - change for production');
      }
    }

    if (this.config.auth.maxLoginAttempts < 1 || this.config.auth.maxLoginAttempts > 20) {
      warnings.push('Max login attempts should be between 1 and 20');
    }

    if (this.config.auth.lockoutDurationMs < 60000) {
      // Less than 1 minute
      warnings.push('Lockout duration should be at least 1 minute');
    }

    // Validate AI configuration
    if (this.config.ai.maxTokenLength < 1000 || this.config.ai.maxTokenLength > 100000) {
      warnings.push('Max token length should be between 1000 and 100000');
    }

    if (this.config.ai.embeddingDimensions < 128 || this.config.ai.embeddingDimensions > 4096) {
      warnings.push('Embedding dimensions should be between 128 and 4096');
    }

    // Warnings for optional but recommended fields
    if (!this.config.pinecone.indexName) {
      warnings.push('Pinecone index name not specified, using default');
    }

    if (this.config.app.nodeEnv === 'production' && this.config.app.port === 3000) {
      warnings.push('Using default port 3000 in production');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): IConfiguration {
    const app: IAppConfig = {
      port: parseInt(process.env.PORT || '3000', 10),
      environment: process.env.NODE_ENV || 'development',
      nodeEnv: (process.env.NODE_ENV as any) || 'development'
    };

    const auth = {
      maxLoginAttempts: parseInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS || '5', 10),
      lockoutDurationMs: parseInt(process.env.AUTH_LOCKOUT_DURATION_MS || '1800000', 10), // 30 minutes
      jwtSecret: process.env.JWT_SECRET || 'stella-dev-secret-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
    };

    const ai = {
      maxTokenLength: parseInt(process.env.OPENAI_MAX_TOKEN_LENGTH || '8000', 10),
      embeddingDimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || '1024', 10),
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
    };

    const mongodb: IMongoConfig = {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/stella',
      database: process.env.MONGODB_DATABASE || undefined,
      options: {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
        maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '30000', 10),
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
        connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS || '10000', 10)
      }
    };

    const pinecone: IPineconeConfig = {
      apiKey: process.env.PINECONE_API_KEY || '',
      environment: process.env.PINECONE_ENVIRONMENT || '',
      indexName: process.env.PINECONE_INDEX_NAME || 'buddy-app',
      namespace: process.env.PINECONE_NAMESPACE || 'conversation-namespace',
      dimension: parseInt(process.env.PINECONE_DIMENSION || '1024', 10),
      metric: (process.env.PINECONE_METRIC as any) || 'cosine'
    };

    const openai: IOpenAIConfig = {
      apiKey: process.env.OPENAI_API_KEY || ''
    };

    return {
      app,
      auth,
      mongodb,
      pinecone,
      openai,
      ai
    };
  }
}

// Export singleton instance
export const configService = new ConfigService();
