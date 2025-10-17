/**
 * VAPI Message Types
 */
export enum VAPIMessageType {
  TRANSCRIPT = 'transcript',
  FUNCTION_CALL = 'function-call',
  HANG = 'hang',
  SPEECH_UPDATE = 'speech-update',
  STATUS_UPDATE = 'status-update',
  CONVERSATION_UPDATE = 'conversation-update',
  END_OF_CALL_REPORT = 'end-of-call-report'
}

/**
 * VAPI Message Role
 */
export enum VAPIRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

/**
 * VAPI Transcript Message
 */
export interface IVAPITranscript {
  role: VAPIRole;
  transcriptType: 'partial' | 'final';
  transcript: string;
  timestamp?: string;
}

/**
 * VAPI Message
 */
export interface IVAPIMessage {
  type: VAPIMessageType;
  call?: {
    id: string;
    orgId?: string;
    createdAt?: string;
    updatedAt?: string;
    type?: string;
    status?: string;
  };
  transcript?: IVAPITranscript;
  phoneNumber?: any;
  customer?: any;
  artifact?: any;
  timestamp?: string;
}

/**
 * VAPI Conversation Message (stored in MongoDB)
 */
export interface IVAPIConversationMessage {
  role: VAPIRole;
  content: string;
  timestamp: Date;
  transcriptType?: 'partial' | 'final';
}

/**
 * VAPI Session (stored in MongoDB)
 */
export interface IVAPISession {
  sessionId: string; // VAPI call ID
  userId?: string | undefined;
  email: string;
  phoneNumber?: string | undefined;
  status: 'active' | 'completed' | 'failed';
  startedAt: Date;
  endedAt?: Date | undefined;
  duration?: number | undefined; // in seconds
  messages: IVAPIConversationMessage[];
  metadata?: {
    callType?: string;
    orgId?: string;
    customerInfo?: any;
    [key: string]: any;
  } | undefined;
  summary?: string | undefined;
  vectorStored?: boolean | undefined; // Flag to track if stored in Pinecone
  createdAt: Date;
  updatedAt: Date;
}

/**
 * VAPI End of Call Report
 */
export interface IVAPIEndOfCallReport {
  type: 'end-of-call-report';
  endedReason?: string;
  call: {
    id: string;
    orgId?: string;
    createdAt?: string;
    updatedAt?: string;
    type?: string;
    cost?: number;
    costBreakdown?: {
      transport?: number;
      stt?: number;
      llm?: number;
      tts?: number;
      vapi?: number;
      total?: number;
    };
  };
  transcript?: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  summary?: string;
  messages?: Array<{
    role: string;
    message: string;
    time: number;
    endTime?: number;
    secondsFromStart?: number;
  }>;
}

/**
 * Request to start VAPI session
 */
export interface IStartVAPISessionRequest {
  email: string;
  userId?: string;
  phoneNumber?: string;
  metadata?: any;
}

/**
 * Response for VAPI session
 */
export interface IVAPISessionResponse {
  sessionId: string;
  status: string;
  message: string;
}

