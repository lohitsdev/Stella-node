import type { ObjectId, Document } from 'mongodb';

import type { ChatStatus, MessageSender } from '../enums/chat.enum.js';

/**
 * Interface for chat message
 */
export interface IChatMessage {
  message: string;
  sender: MessageSender;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Interface for chat session
 */
export interface IChatSession extends Document {
  _id?: ObjectId;
  chat_id: string;
  email: string;
  user_id?: string;
  status: ChatStatus;
  messages: IChatMessage[];
  started_at: Date;
  ended_at?: Date;
  duration?: number; // in seconds
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for creating a chat session
 */
export interface ICreateChatSession {
  chat_id: string;
  email: string;
  user_id?: string;
  metadata?: Record<string, any> | undefined;
}

/**
 * Interface for ending a chat session
 */
export interface IEndChatSession {
  chat_id: string;
  email: string;
  timestamp: number;
  metadata?: Record<string, any> | undefined;
}

/**
 * Interface for chat service operations
 */
export interface IChatService {
  createSession(sessionData: ICreateChatSession): Promise<IChatSession>;
  endSession(endData: IEndChatSession): Promise<IChatSession | null>;
  addMessage(chatId: string, message: IChatMessage): Promise<IChatSession | null>;
  getSession(chatId: string): Promise<IChatSession | null>;
  getUserSessions(email: string): Promise<IChatSession[]>;
  getUserChatIds(email: string): Promise<string[]>;
  getUserChatIdsWithTimestamps(email: string): Promise<Array<{ chat_id: string; created_at: Date; started_at?: Date }>>;
  getActiveSession(email: string): Promise<IChatSession | null>;
}
