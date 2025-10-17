/**
 * Chat session status enumeration
 */
export enum ChatStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
  ARCHIVED = 'archived'
}

/**
 * Chat message sender enumeration
 */
export enum MessageSender {
  USER = 'user',
  ASSISTANT = 'assistant'
}

/**
 * Chat event types enumeration
 */
export enum ChatEventType {
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received'
}
