/**
 * Interface for application configuration
 */
export interface IAppConfig {
  port: number;
  environment: string;
  nodeEnv: 'development' | 'production' | 'test';
}

/**
 * Interface for authentication configuration
 */
export interface IAuthConfig {
  maxLoginAttempts: number;
  lockoutDurationMs: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
}

/**
 * Interface for AI configuration
 */
export interface IAIConfig {
  maxTokenLength: number;
  embeddingDimensions: number;
  embeddingModel: string;
  chatModel: string;
}

/**
 * Interface for MongoDB configuration
 */
export interface IMongoConfig {
  uri: string;
  database?: string | undefined;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
    connectTimeoutMS?: number;
  };
}

/**
 * Interface for Pinecone configuration
 */
export interface IPineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
  namespace?: string;
  dimension?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
}

/**
 * Interface for the complete application configuration
 */
export interface IConfiguration {
  app: IAppConfig;
  auth: IAuthConfig;
  mongodb: IMongoConfig;
  pinecone: IPineconeConfig;
  openai: IOpenAIConfig;
  vapi: IVAPIConfig;
  ai: IAIConfig;
}

/**
 * Interface for OpenAI configuration
 */
export interface IOpenAIConfig {
  apiKey: string;
}

/**
 * Interface for VAPI configuration
 */
export interface IVAPIConfig {
  apiKey: string;
  phoneNumberId?: string | undefined;
  assistantId?: string | undefined;
}

/**
 * Interface for configuration validation result
 */
export interface IConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Interface for ConfigService operations
 */
export interface IConfigService {
  get<T = any>(key: string): T;
  get<T = any>(key: string, defaultValue: T): T;
  getAll(): IConfiguration;
  validate(): IConfigValidation;
  has(key: string): boolean;
  set(key: string, value: any): void;
}
