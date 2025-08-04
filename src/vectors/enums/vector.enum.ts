/**
 * Vector similarity metrics enumeration
 */
export enum VectorMetric {
  COSINE = 'cosine',
  EUCLIDEAN = 'euclidean',
  DOTPRODUCT = 'dotproduct'
}

/**
 * Vector index environment enumeration
 */
export enum VectorEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

/**
 * Vector operation types enumeration
 */
export enum VectorOperation {
  UPSERT = 'upsert',
  QUERY = 'query',
  DELETE = 'delete',
  FETCH = 'fetch',
  UPDATE = 'update'
}

/**
 * Vector content types enumeration
 */
export enum VectorContentType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  CODE = 'code'
}

/**
 * Vector processing status enumeration
 */
export enum VectorProcessingStatus {
  PENDING = 'pending',
  EMBEDDING = 'embedding',
  INDEXED = 'indexed',
  ERROR = 'error'
}