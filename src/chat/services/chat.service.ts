import { ObjectId } from 'mongodb';
import { mongodb } from '../../database/mongodb.js';
import { validationService } from '../../services/validation.service.js';
import { humeService } from './hume.service.js';
import { summaryService } from './summary.service.js';
import type { 
  IChatSession, 
  ICreateChatSession, 
  IEndChatSession,
  IChatMessage,
  IChatService 
} from '../interfaces/chat.interface.js';
import { ChatStatus, MessageSender } from '../enums/chat.enum.js';
import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import { ChatEndWebhookDto, CreateChatSessionDto, ChatMessageDto } from '../dto/chat.dto.js';

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
          duration: duration,
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
    const sessions = await collection.find(
      { email }, 
      { 
        projection: { chat_id: 1, _id: 0 },
        sort: { createdAt: -1 }
      }
    ).toArray();
    
    return sessions.map(session => session.chat_id);
  }

  /**
   * Get chat IDs with timestamps for a user by email (lightweight)
   */
  async getUserChatIdsWithTimestamps(email: string): Promise<Array<{chat_id: string, created_at: Date, started_at?: Date}>> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');
    const sessions = await collection.find(
      { email }, 
      { 
        projection: { chat_id: 1, createdAt: 1, started_at: 1, _id: 0 },
        sort: { createdAt: -1 }
      }
    ).toArray();
    
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
    return await collection.findOne({ 
      email, 
      status: ChatStatus.ACTIVE 
    }, { 
      sort: { createdAt: -1 } 
    });
  }

  /**
   * Process chat end webhook with Hume AI integration
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

      // Fetch Hume AI data for this chat
      let humeData = null;
      if (humeService.isAvailable()) {
        console.log(`🎭 Fetching Hume AI data for chat: ${chat_id}`);
        const humeResult = await humeService.fetchAllChatEvents(chat_id);
        
        if (humeResult.success && humeResult.data) {
          humeData = humeResult.data;
          console.log(`✅ Retrieved ${humeData.total_events} events from Hume AI`);
        } else {
          console.warn(`⚠️  Failed to fetch Hume data: ${humeResult.error}`);
        }
      } else {
        console.warn('⚠️  Hume service not available, skipping data fetch');
      }

      // End the session with Hume data
      const endedSession = await this.endSessionWithHumeData({
        chat_id,
        email,
        timestamp,
        metadata: metadata || undefined
      }, humeData);

      if (!endedSession) {
        return {
          success: false,
          error: 'Failed to end chat session',
          timestamp: new Date()
        };
      }

      // Generate AI summary if we have Hume data
      let summaryGenerated = false;
      if (humeData && humeData.events && humeData.events.length > 0) {
        console.log(`🤖 Generating AI summary for chat: ${chat_id}`);
        
        const summaryResult = await summaryService.processSummaryGeneration(
          chat_id,
          email,
          humeData,
          endedSession.user_id
        );

        if (summaryResult.success) {
          summaryGenerated = true;
          console.log(`✅ AI summary generated and saved for chat: ${chat_id}`);
        } else {
          console.warn(`⚠️  Failed to generate AI summary: ${summaryResult.error}`);
        }
      } else {
        console.log(`ℹ️  No conversation events available for AI summary`);
      }

      return {
        success: true,
        data: endedSession,
        message: `Chat session ended successfully${humeData ? ' with Hume AI data' : ''}${summaryGenerated ? ' and AI summary' : ''}`,
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

  /**
   * End a chat session and include Hume AI data
   */
  private async endSessionWithHumeData(
    endData: IEndChatSession, 
    humeData: any
  ): Promise<IChatSession | null> {
    const collection = mongodb.getCollection<IChatSession>('chat_sessions');
    
    const endedAt = new Date(endData.timestamp * 1000);
    
    const session = await collection.findOne({ chat_id: endData.chat_id });
    if (!session) {
      return null;
    }

    const duration = Math.floor((endedAt.getTime() - session.started_at.getTime()) / 1000);

    const updateData: any = {
      status: ChatStatus.ENDED,
      ended_at: endedAt,
      duration: duration,
      updatedAt: new Date(),
      ...(endData.metadata && { 
        metadata: { ...session.metadata, ...endData.metadata } 
      })
    };

    // Add Hume data if available
    if (humeData) {
      updateData.hume_data = humeData;
    }

    const updateResult = await collection.findOneAndUpdate(
      { chat_id: endData.chat_id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return updateResult;
  }
}

export const chatService = new ChatService();