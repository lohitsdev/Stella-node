import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import { mongodb } from '../../database/mongodb.js';
import { openaiService } from '../../chat/services/openai.service.js';
import { pinecone } from '../../database/pinecone.js';

import type {
  IVAPISession,
  IVAPIMessage,
  IVAPIConversationMessage,
  IVAPIEndOfCallReport,
  IStartVAPISessionRequest,
  IVAPISessionResponse
} from '../interfaces/vapi.interface.js';
import { VAPIMessageType, VAPIRole } from '../interfaces/vapi.interface.js';

export class VAPIService {
  private readonly COLLECTION_NAME = 'vapi_sessions';
  private readonly CHUNK_SIZE = 5; // Number of messages per chunk for vector storage

  /**
   * Start a new VAPI session
   */
  async startSession(request: IStartVAPISessionRequest, sessionId: string): Promise<IServiceResponse<IVAPISessionResponse>> {
    try {
      const db = await mongodb.getDatabase();
      const collection = db.collection(this.COLLECTION_NAME);

      // Check if session already exists
      const existingSession = await collection.findOne({ sessionId });
      if (existingSession) {
        return {
          success: true,
          data: {
            sessionId,
            status: 'existing',
            message: 'Session already exists'
          },
          timestamp: new Date()
        };
      }

      // Create new session
      const session: IVAPISession = {
        sessionId,
        userId: request.userId || undefined,
        email: request.email,
        phoneNumber: request.phoneNumber || undefined,
        status: 'active',
        startedAt: new Date(),
        messages: [],
        metadata: request.metadata || {},
        vectorStored: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collection.insertOne(session);

      console.log(`✅ VAPI session started: ${sessionId} for ${request.email}`);

      return {
        success: true,
        data: {
          sessionId,
          status: 'active',
          message: 'Session started successfully'
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Error starting VAPI session:', error);
      return {
        success: false,
        error: `Failed to start session: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Process incoming VAPI webhook message
   */
  async processWebhookMessage(message: IVAPIMessage, email?: string): Promise<IServiceResponse<any>> {
    try {
      console.log(`📞 VAPI webhook received: ${message.type}`);

      switch (message.type) {
        case VAPIMessageType.TRANSCRIPT:
          return await this.handleTranscript(message, email);

        case VAPIMessageType.END_OF_CALL_REPORT:
          return await this.handleEndOfCall(message as any, email);

        case VAPIMessageType.STATUS_UPDATE:
          return await this.handleStatusUpdate(message, email);

        default:
          console.log(`ℹ️  Unhandled VAPI message type: ${message.type}`);
          return {
            success: true,
            data: { processed: false, type: message.type },
            timestamp: new Date()
          };
      }
    } catch (error: any) {
      console.error('❌ Error processing VAPI webhook:', error);
      return {
        success: false,
        error: `Failed to process webhook: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle transcript messages (save conversation in real-time)
   */
  private async handleTranscript(message: IVAPIMessage, email?: string): Promise<IServiceResponse<any>> {
    try {
      if (!message.call?.id) {
        return {
          success: false,
          error: 'No call ID in message',
          timestamp: new Date()
        };
      }

      const sessionId = message.call.id;
      const transcript = message.transcript;

      if (!transcript) {
        return {
          success: false,
          error: 'No transcript in message',
          timestamp: new Date()
        };
      }

      const db = await mongodb.getDatabase();
      const collection = db.collection(this.COLLECTION_NAME);

      // Only save final transcripts to avoid duplicates
      if (transcript.transcriptType === 'final') {
        const conversationMessage: IVAPIConversationMessage = {
          role: transcript.role,
          content: transcript.transcript,
          timestamp: new Date(),
          transcriptType: 'final'
        };

        await collection.updateOne(
          { sessionId },
          {
            $push: { messages: conversationMessage } as any,
            $set: { 
              updatedAt: new Date(),
              ...(email && { email }) // Update email if provided
            }
          },
          { upsert: true }
        );

        console.log(`💬 Saved message for session ${sessionId}: ${transcript.role} - "${transcript.transcript.substring(0, 50)}..."`);

        // Check if we should chunk and store in Pinecone
        const session = await collection.findOne({ sessionId });
        if (session && session.messages.length % this.CHUNK_SIZE === 0) {
          // Store every CHUNK_SIZE messages
          await this.storeInPinecone(sessionId);
        }
      }

      return {
        success: true,
        data: { 
          sessionId, 
          messagesSaved: 1,
          transcriptType: transcript.transcriptType 
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Error handling transcript:', error);
      return {
        success: false,
        error: `Failed to handle transcript: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle end of call report
   */
  private async handleEndOfCall(message: IVAPIEndOfCallReport, email?: string): Promise<IServiceResponse<any>> {
    try {
      const sessionId = message.call.id;
      const db = await mongodb.getDatabase();
      const collection = db.collection(this.COLLECTION_NAME);

      // Get the session
      const session = await collection.findOne({ sessionId });
      if (!session) {
        console.log(`⚠️  Session not found for end of call: ${sessionId}`);
        // Create session from end of call report
        const newSession: IVAPISession = {
          sessionId,
          email: email || 'unknown',
          status: 'completed',
          startedAt: new Date(message.call.createdAt || Date.now()),
          endedAt: new Date(),
          messages: [],
          metadata: {
            endedReason: message.endedReason,
            cost: message.call.cost,
            costBreakdown: message.call.costBreakdown,
            recordingUrl: message.recordingUrl
          },
          summary: message.summary || undefined,
          vectorStored: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add messages from report if available
        if (message.messages && message.messages.length > 0) {
          newSession.messages = message.messages.map(msg => ({
            role: msg.role.toLowerCase() as VAPIRole,
            content: msg.message,
            timestamp: new Date(Date.now() + (msg.secondsFromStart || 0) * 1000),
            transcriptType: 'final'
          }));
        }

        // Calculate duration
        if (message.messages && message.messages.length > 0) {
          const lastMessage = message.messages[message.messages.length - 1];
          if (lastMessage) {
            newSession.duration = lastMessage.endTime || lastMessage.secondsFromStart || 0;
          }
        }

        await collection.insertOne(newSession);
        console.log(`✅ Created session from end of call report: ${sessionId}`);
      } else {
        // Update existing session
        const updateData: any = {
          status: 'completed',
          endedAt: new Date(),
          updatedAt: new Date(),
          'metadata.endedReason': message.endedReason,
          'metadata.cost': message.call.cost,
          'metadata.costBreakdown': message.call.costBreakdown,
          'metadata.recordingUrl': message.recordingUrl
        };

        if (message.summary) {
          updateData.summary = message.summary;
        }

        // Calculate duration
        if (session.startedAt) {
          updateData.duration = Math.floor((new Date().getTime() - new Date(session.startedAt).getTime()) / 1000);
        }

        await collection.updateOne({ sessionId }, { $set: updateData });

        console.log(`✅ Call ended for session ${sessionId}. Duration: ${updateData.duration}s`);
      }

      // Store final conversation in Pinecone
      await this.storeInPinecone(sessionId);

      // Generate AI summary if not provided
      const updatedSession = await collection.findOne({ sessionId });
      if (updatedSession && updatedSession.messages.length > 0 && !updatedSession.summary) {
        await this.generateAndStoreSummary(sessionId);
      }

      return {
        success: true,
        data: {
          sessionId,
          status: 'completed',
          summary: message.summary
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Error handling end of call:', error);
      return {
        success: false,
        error: `Failed to handle end of call: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle status updates
   */
  private async handleStatusUpdate(message: IVAPIMessage, email?: string): Promise<IServiceResponse<any>> {
    try {
      if (!message.call?.id) {
        return {
          success: false,
          error: 'No call ID in message',
          timestamp: new Date()
        };
      }

      const sessionId = message.call.id;
      const status = message.call.status;

      console.log(`📊 Status update for session ${sessionId}: ${status}`);

      return {
        success: true,
        data: { sessionId, status },
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Error handling status update:', error);
      return {
        success: false,
        error: `Failed to handle status update: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Store conversation chunks in Pinecone
   */
  private async storeInPinecone(sessionId: string): Promise<void> {
    try {
      const db = await mongodb.getDatabase();
      const collection = db.collection(this.COLLECTION_NAME);

      const session = await collection.findOne({ sessionId });
      if (!session || !session.messages || session.messages.length === 0) {
        console.log(`⚠️  No messages to store for session ${sessionId}`);
        return;
      }

      // Create conversation text from messages
      const conversationText = session.messages
        .map((msg: IVAPIConversationMessage) => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Generate embedding
      const embeddingResult = await openaiService.generateEmbedding(conversationText);
      if (!embeddingResult.success || !embeddingResult.data) {
        console.error(`❌ Failed to generate embedding for session ${sessionId}`);
        return;
      }

      // Store in Pinecone
      const index = await pinecone.getIndex();
      const namespace = index.namespace('vapi-conversations');

      await namespace.upsert([
        {
          id: `vapi_${sessionId}_${Date.now()}`,
          values: embeddingResult.data,
          metadata: {
            type: 'vapi_conversation',
            sessionId,
            email: session.email,
            userId: session.userId || 'unknown',
            messageCount: session.messages.length,
            conversationText: conversationText.substring(0, 40000), // Pinecone metadata limit
            startedAt: session.startedAt.toISOString(),
            status: session.status,
            createdAt: new Date().toISOString()
          }
        }
      ]);

      // Update session to mark vector as stored
      await collection.updateOne(
        { sessionId },
        { $set: { vectorStored: true, updatedAt: new Date() } }
      );

      console.log(`✅ Stored ${session.messages.length} messages in Pinecone for session ${sessionId}`);
    } catch (error: any) {
      console.error(`❌ Error storing in Pinecone for session ${sessionId}:`, error);
    }
  }

  /**
   * Generate and store AI summary of conversation
   */
  private async generateAndStoreSummary(sessionId: string): Promise<void> {
    try {
      const db = await mongodb.getDatabase();
      const collection = db.collection(this.COLLECTION_NAME);

      const session = await collection.findOne({ sessionId });
      if (!session || !session.messages || session.messages.length === 0) {
        return;
      }

      // Create conversation text
      const conversationText = session.messages
        .map((msg: IVAPIConversationMessage) => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Generate summary using OpenAI
      const conversationEvents = session.messages.map((msg: IVAPIConversationMessage) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
      const summaryResult = await openaiService.generateConversationSummary(sessionId, conversationEvents);

      if (summaryResult.success && summaryResult.data) {
        const summary = typeof summaryResult.data === 'string' 
          ? summaryResult.data 
          : JSON.stringify(summaryResult.data);

        await collection.updateOne(
          { sessionId },
          { $set: { summary, updatedAt: new Date() } }
        );

        console.log(`✅ Generated summary for session ${sessionId}`);
      }
    } catch (error: any) {
      console.error(`❌ Error generating summary for session ${sessionId}:`, error);
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<IServiceResponse<IVAPISession>> {
    try {
      const db = await mongodb.getDatabase();
      const collection = db.collection(this.COLLECTION_NAME);

      const session = await collection.findOne({ sessionId });
      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          timestamp: new Date()
        };
      }

      return {
        success: true,
        data: session as any,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Error getting session:', error);
      return {
        success: false,
        error: `Failed to get session: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(email: string, limit: number = 50): Promise<IServiceResponse<IVAPISession[]>> {
    try {
      const db = await mongodb.getDatabase();
      const collection = db.collection(this.COLLECTION_NAME);

      const sessions = await collection
        .find({ email })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return {
        success: true,
        data: sessions as any,
        message: `Found ${sessions.length} sessions`,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Error getting user sessions:', error);
      return {
        success: false,
        error: `Failed to get user sessions: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
}

export const vapiService = new VAPIService();

