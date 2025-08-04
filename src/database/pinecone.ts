import { Pinecone } from '@pinecone-database/pinecone';
import { configService } from '../services/config.service.js';
import type { IPineconeOperations, IDatabaseStatus } from '../common/interfaces/database.interface.js';

export class PineconeConnection implements IPineconeOperations {
  private client: Pinecone | null = null;

  constructor() {
    const pineconeConfig = configService.get('pinecone');
    if (!pineconeConfig.apiKey) {
      console.warn('⚠️  Pinecone API key not provided. Pinecone will not be initialized.');
      return;
    }

    this.client = new Pinecone({
      apiKey: pineconeConfig.apiKey,
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Pinecone client not initialized. Check your API key.');
      }

      // Test connection by listing indexes
      const indexes = await this.client.listIndexes();
      console.log('✅ Connected to Pinecone successfully');
      console.log(`📍 Available indexes: ${indexes.indexes?.map(i => i.name).join(', ') || 'None'}`);
    } catch (error) {
      console.error('❌ Pinecone connection error:', error);
      throw error;
    }
  }

  async getIndex(indexName?: string): Promise<any> {
    if (!this.client) {
      throw new Error('Pinecone client not initialized');
    }

    const pineconeConfig = configService.get('pinecone');
    const name = indexName || pineconeConfig.indexName;
    return this.client.index(name);
  }

  async createIndex(indexName: string, dimension: number, metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'): Promise<void> {
    if (!this.client) {
      throw new Error('Pinecone client not initialized');
    }

    try {
      await this.client.createIndex({
        name: indexName,
        dimension,
        metric,
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      console.log(`✅ Created Pinecone index: ${indexName}`);
    } catch (error) {
      console.error(`❌ Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    if (!this.client) {
      throw new Error('Pinecone client not initialized');
    }

    try {
      await this.client.deleteIndex(indexName);
      console.log(`✅ Deleted Pinecone index: ${indexName}`);
    } catch (error) {
      console.error(`❌ Failed to delete index ${indexName}:`, error);
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      await this.client.listIndexes();
      return true;
    } catch (error) {
      console.error('❌ Pinecone ping failed:', error);
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
export const pinecone = new PineconeConnection();