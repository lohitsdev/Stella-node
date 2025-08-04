import { MongoClient, Db, Collection } from 'mongodb';
import type { Document } from 'mongodb';
import { configService } from '../services/config.service.js';
import type { IMongoDBOperations, IDatabaseStatus } from '../common/interfaces/database.interface.js';

export class MongoDBConnection implements IMongoDBOperations {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor() {
    const mongoConfig = configService.get('mongodb');
    this.client = new MongoClient(mongoConfig.uri, mongoConfig.options);
  }

  async connect(): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('MongoDB client not initialized');
      }

      await this.client.connect();
      this.db = this.client.db();
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        console.log('✅ Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ MongoDB disconnection error:', error);
      throw error;
    }
  }

  getDatabase(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getCollection<T extends Document = Document>(name: string): Collection<T> {
    return this.getDatabase().collection<T>(name);
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }
      await this.db.admin().ping();
      return true;
    } catch (error) {
      console.error('❌ MongoDB ping failed:', error);
      return false;
    }
  }

  async getStatus(): Promise<IDatabaseStatus> {
    const lastChecked = new Date();
    try {
      const connected = await this.ping();
      return {
        connected,
        lastChecked
      };
    } catch (error) {
      return {
        connected: false,
        lastChecked,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
export const mongodb = new MongoDBConnection();