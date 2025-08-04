import type { Document, ObjectId } from 'mongodb';

/**
 * Interface for document entity in MongoDB
 */
export interface IDocument extends Document {
  _id?: ObjectId;
  message: string;
  timestamp: Date;
  type: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for document creation (without _id)
 */
export interface ICreateDocument {
  message: string;
  timestamp: Date;
  type: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for document update (all fields optional except _id)
 */
export interface IUpdateDocument {
  _id: ObjectId;
  message?: string;
  timestamp?: Date;
  type?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for document query filters
 */
export interface IDocumentQuery {
  _id?: ObjectId;
  message?: string | RegExp;
  type?: string;
  timestamp?: {
    $gte?: Date;
    $lte?: Date;
  };
  metadata?: Record<string, any>;
}

/**
 * Interface for document aggregation pipeline
 */
export interface IDocumentAggregation {
  $match?: IDocumentQuery;
  $sort?: Record<string, 1 | -1>;
  $limit?: number;
  $skip?: number;
  $project?: Record<string, 0 | 1>;
}