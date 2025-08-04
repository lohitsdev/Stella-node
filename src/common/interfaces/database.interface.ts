import type { Db, Collection, MongoClient, Document } from 'mongodb';
import type { Pinecone } from '@pinecone-database/pinecone';

/**
 * Interface for MongoDB connection configuration
 */
export interface IMongoDBConfig {
  uri: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
    connectTimeoutMS?: number;
  };
}

/**
 * Interface for Pinecone connection configuration
 */
export interface IPineconeConnectionConfig {
  apiKey: string;
  environment?: string;
  indexName: string;
}

/**
 * Interface for database connection status
 */
export interface IDatabaseStatus {
  connected: boolean;
  lastChecked: Date;
  error?: string;
}

/**
 * Interface for MongoDB operations
 */
export interface IMongoDBOperations {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getDatabase(): Db;
  getCollection<T extends Document = Document>(name: string): Collection<T>;
  ping(): Promise<boolean>;
  getStatus(): Promise<IDatabaseStatus>;
}

/**
 * Interface for Pinecone operations
 */
export interface IPineconeOperations {
  connect(): Promise<void>;
  getIndex(indexName?: string): Promise<any>;
  createIndex(indexName: string, dimension: number, metric?: string): Promise<void>;
  deleteIndex(indexName: string): Promise<void>;
  ping(): Promise<boolean>;
  getStatus(): Promise<IDatabaseStatus>;
}