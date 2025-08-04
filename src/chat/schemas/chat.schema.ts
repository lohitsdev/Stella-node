/**
 * MongoDB schema definition for chat sessions
 */
export const ChatSessionSchema = {
  chat_id: { type: 'string', required: true, unique: true },
  email: { type: 'string', required: true },
  user_id: { type: 'string', required: false },
  status: { 
    type: 'string', 
    required: true, 
    enum: ['active', 'ended', 'archived'],
    default: 'active'
  },
  messages: [{
    message: { type: 'string', required: true },
    sender: { 
      type: 'string', 
      required: true, 
      enum: ['user', 'assistant'] 
    },
    timestamp: { type: 'number', required: true },
    metadata: { type: 'object', required: false }
  }],
  started_at: { type: 'date', required: true, default: Date.now },
  ended_at: { type: 'date', required: false },
  duration: { type: 'number', required: false }, // in seconds
  metadata: { type: 'object', required: false },
  createdAt: { type: 'date', required: true, default: Date.now },
  updatedAt: { type: 'date', required: true, default: Date.now }
};

/**
 * Indexes for chat sessions collection
 */
export const ChatSessionIndexes = [
  { key: { chat_id: 1 }, unique: true },
  { key: { email: 1 } },
  { key: { status: 1 } },
  { key: { createdAt: -1 } },
  { key: { email: 1, status: 1 } },
  { key: { email: 1, createdAt: -1 } }
];