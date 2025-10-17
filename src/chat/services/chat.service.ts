import { ObjectId } from 'mongodb';

import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import { mongodb } from '../../database/mongodb.js';
import { validationService } from '../../services/validation.service.js';
import { ChatEndWebhookDto, CreateChatSessionDto, ChatMessageDto } from '../dto/chat.dto.js';
import { ChatStatus, MessageSender } from '../enums/chat.enum.js';
import type {
  IChatSession,
  ICreateChatSession,
  IEndChatSession,
  IChatMessage,
  IChatService
} from '../interfaces/chat.interface.js';

import { summaryService } from './summary.service.js';

export class ChatService implements IChatService {
  /**
   * Create a new chat session
   */
  async createSession(sessionData: ICreateChatSession): Promise<IChatSession> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');

    const newSession: Omit<IChatSession, '_id'> = {
      chat_id: sessionData.chat_id,
      email: sessionData.email,
      user_id: sessionData.user_id,
      status: ChatStatus.ACTIVE,
      messages: [],
      started_at: new Date(),
      metadata: sessionData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newSession as IChatSession);
    return { ...newSession, _id: result.insertedId } as IChatSession;
  }

  /**
   * End a chat session with webhook data
   */
  async endSession(endData: IEndChatSession): Promise<IChatSession | null> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');

    const endedAt = new Date(endData.timestamp * 1000);

    const session = await collection.findOne({ chat_id: endData.chat_id });
    if (!session) {
      return null;
    }

    const duration = Math.floor((endedAt.getTime() - session.started_at.getTime()) / 1000);

    const updateResult = await collection.findOneAndUpdate(
      { chat_id: endData.chat_id },
      {
        $set: {
          status: ChatStatus.ENDED,
          ended_at: endedAt,
          duration,
          updatedAt: new Date(),
          ...(endData.metadata && {
            metadata: { ...session.metadata, ...endData.metadata }
          })
        }
      },
      { returnDocument: 'after' }
    );

    return updateResult;
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(chatId: string, message: IChatMessage): Promise<IChatSession | null> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');

    const updateResult = await collection.findOneAndUpdate(
      { chat_id: chatId },
      {
        $push: { messages: message } as any,
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    return updateResult;
  }

  /**
   * Get a chat session by chat_id
   */
  async getSession(chatId: string): Promise<IChatSession | null> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');
    return await collection.findOne({ chat_id: chatId });
  }

  /**
   * Get all sessions for a user by email
   */
  async getUserSessions(email: string): Promise<IChatSession[]> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');
    return await collection.find({ email }).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Get only chat IDs for a user by email (lightweight)
   */
  async getUserChatIds(email: string): Promise<string[]> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');
    const sessions = await collection
      .find(
        { email },
        {
          projection: { chat_id: 1, _id: 0 },
          sort: { createdAt: -1 }
        }
      )
      .toArray();

    return sessions.map(session => session.chat_id);
  }

  /**
   * Get chat IDs with timestamps for a user by email (lightweight)
   */
  async getUserChatIdsWithTimestamps(
    email: string
  ): Promise<Array<{ chat_id: string; created_at: Date; started_at?: Date }>> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');
    const sessions = await collection
      .find(
        { email },
        {
          projection: { chat_id: 1, createdAt: 1, started_at: 1, _id: 0 },
          sort: { createdAt: -1 }
        }
      )
      .toArray();

    return sessions.map(session => ({
      chat_id: session.chat_id,
      created_at: session.createdAt,
      started_at: session.started_at
    }));
  }

  /**
   * Get active session for a user
   */
  async getActiveSession(email: string): Promise<IChatSession | null> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');
    return await collection.findOne(
      {
        email,
        status: ChatStatus.ACTIVE
      },
      {
        sort: { createdAt: -1 }
      }
    );
  }

  /**
   * Process chat end webhook
   */
  async processEndWebhook(webhookData: ChatEndWebhookDto): Promise<IServiceResponse<IChatSession>> {
    try {
      // Validate webhook data
      const validation = await validationService.validateDto(webhookData, ChatEndWebhookDto);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error || 'Validation failed',
          timestamp: new Date()
        };
      }

      const { email, chat_id, timestamp, metadata } = validation.data!;

      // Check if session exists, if not create it
      let session = await this.getSession(chat_id);
      if (!session) {
        // Create session if it doesn't exist
        session = await this.createSession({
          chat_id,
          email,
          metadata: metadata || undefined
        });
      }

      // End the session
      const endedSession = await this.endSession({
        chat_id,
        email,
        timestamp,
        metadata: metadata || undefined
      });

      if (!endedSession) {
        return {
          success: false,
          error: 'Failed to end chat session',
          timestamp: new Date()
        };
      }

      return {
        success: true,
        data: endedSession,
        message: 'Chat session ended successfully',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Chat end webhook error:', error);
      return {
        success: false,
        error: 'Internal server error processing webhook',
        timestamp: new Date()
      };
    }
  }
}

export const chatService = new ChatService();
