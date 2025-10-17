import type { Document, ObjectId } from 'mongodb';

/**
 * Interface for tool query data
 */
export interface IToolQuery {
  query: string;
  email: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for tool result
 */
export interface IToolResult extends Document {
  _id?: ObjectId;
  query: string;
  email: string;
  result?: any;
  processed_at: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for tool service
 */
export interface IToolService {
  processQuery(queryData: IToolQuery): Promise<any>;
  getQueryHistory(email: string): Promise<any>;
  getQueryResult(queryId: string): Promise<any>;
}
