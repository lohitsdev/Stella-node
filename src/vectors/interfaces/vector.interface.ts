/**
 * Interface for vector data in Pinecone
 */
export interface IVector {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

/**
 * Interface for vector query parameters
 */
export interface IVectorQuery {
  vector: number[];
  topK: number;
  includeMetadata?: boolean;
  includeValues?: boolean;
  filter?: Record<string, any>;
}

/**
 * Interface for vector query result
 */
export interface IVectorQueryResult {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, any>;
}

/**
 * Interface for vector upsert operation
 */
export interface IVectorUpsert {
  vectors: IVector[];
  namespace?: string;
}

/**
 * Interface for vector delete operation
 */
export interface IVectorDelete {
  ids?: string[];
  deleteAll?: boolean;
  namespace?: string;
  filter?: Record<string, any>;
}

/**
 * Interface for vector index stats
 */
export interface IVectorIndexStats {
  namespaces?: Record<string, {
    vectorCount?: number;
  }>;
  dimension?: number;
  indexFullness?: number;
  totalVectorCount?: number;
}