/**
 * Document types enumeration
 */
export enum DocumentType {
  TEXT = 'text',
  PDF = 'pdf',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  MARKDOWN = 'markdown',
  HTML = 'html',
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml'
}

/**
 * Document status enumeration
 */
export enum DocumentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * Document visibility enumeration
 */
export enum DocumentVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  SHARED = 'shared'
}

/**
 * Document processing status enumeration
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}