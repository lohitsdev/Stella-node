import type { ObjectId, Document } from 'mongodb';

/**
 * Interface for conversation summary
 */
export interface IConversationSummary extends Document {
  _id?: ObjectId;
  chat_id: string;
  email: string;
  user_id?: string;
  summary: string;
  metadata: {
    total_events: number;
    conversation_duration?: number;
    summary_generated_at: Date;
    openai_model: string;
    tokens_used?: number;
  };
  raw_data?: {
    original_events_count: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for creating a conversation summary
 */
export interface ICreateSummary {
  chat_id: string;
  email: string;
  user_id?: string | undefined;
  conversation_events: any[];
}

/**
 * Interface for OpenAI summary response
 */
export interface IOpenAISummaryResponse {
  summary: string;
}

/**
 * Interface for summary service operations
 */
export interface ISummaryService {
  generateSummary(summaryData: ICreateSummary): Promise<IConversationSummary>;
  getSummary(chatId: string): Promise<IConversationSummary | null>;
  getUserSummaries(email: string): Promise<IConversationSummary[]>;
}
