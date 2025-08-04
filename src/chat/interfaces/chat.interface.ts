import type { ObjectId, Document } from 'mongodb';

import { ChatStatus, MessageSender } from '../enums/chat.enum.js';
import type { IProcessedHumeData } from './hume.interface.js';

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
  hume_data?: IProcessedHumeData; // Hume AI chat data
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
  getActiveSession(email: string): Promise<IChatSession | null>;
}