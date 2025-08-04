/**
 * Vector index configuration for Pinecone
 */
export const VectorIndexConfig = {
  dimension: 1024, // llama-text-embed-v2 embedding dimension
  metric: 'cosine' as const,
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1'
    }
  }
};

/**
 * Default namespace for vector operations
 */
export const DefaultNamespace = 'conversation-namespace';

/**
 * Vector metadata schema
 */
export const VectorMetadataSchema = {
  documentId: 'string',
  chunkIndex: 'number',
  source: 'string',
  type: 'string',
  createdAt: 'string', // ISO date string
  userId: 'string',
  namespace: 'string'
};

/**
 * Vector namespace configuration
 */
export const VectorNamespaces = {
  DOCUMENTS: 'documents',
  CONVERSATIONS: 'conversations',
  KNOWLEDGE_BASE: 'knowledge-base',
  USER_CONTENT: 'user-content',
  EMBEDDINGS: 'embeddings'
} as const;

/**
 * Vector similarity thresholds
 */
export const SimilarityThresholds = {
  VERY_HIGH: 0.9,
  HIGH: 0.8,
  MEDIUM: 0.7,
  LOW: 0.6,
  VERY_LOW: 0.5
} as const;