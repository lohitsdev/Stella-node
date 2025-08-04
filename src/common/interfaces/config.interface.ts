/**
 * Interface for application configuration
 */
export interface IAppConfig {
  port: number;
  environment: string;
  nodeEnv: 'development' | 'production' | 'test';
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
  mongodb: IMongoConfig;
  pinecone: IPineconeConfig;
  hume: IHumeConfig;
  openai: IOpenAIConfig;
}

/**
 * Interface for Hume AI configuration
 */
export interface IHumeConfig {
  apiKey: string;
  secretKey: string;
  configId: string;
}

/**
 * Interface for OpenAI configuration
 */
export interface IOpenAIConfig {
  apiKey: string;
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