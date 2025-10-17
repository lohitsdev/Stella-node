/**
 * MongoDB Schema for VAPI Sessions
 */
export const vapiSessionSchema = {
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, index: true },
  email: { type: String, required: true, index: true },
  phoneNumber: { type: String },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active',
    index: true
  },
  startedAt: { type: Date, required: true, default: Date.now },
  endedAt: { type: Date },
  duration: { type: Number }, // seconds
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, required: true, default: Date.now },
      transcriptType: { type: String, enum: ['partial', 'final'] }
    }
  ],
  metadata: { type: Object, default: {} },
  summary: { type: String },
  vectorStored: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
};

/**
 * Indexes for VAPI Sessions collection
 */
export const vapiSessionIndexes = [
  { key: { sessionId: 1 }, unique: true },
  { key: { email: 1, createdAt: -1 } },
  { key: { userId: 1, createdAt: -1 } },
  { key: { status: 1 } },
  { key: { createdAt: -1 } }
];

