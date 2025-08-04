import { ObjectId } from 'mongodb';
import { mongodb } from '../../database/mongodb.js';
import { pinecone } from '../../database/pinecone.js';
import { openaiService } from './openai.service.js';
import type { 
  IConversationSummary, 
  ICreateSummary, 
  ISummaryService 
} from '../interfaces/summary.interface.js';
import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import type { IVector } from '../../vectors/interfaces/vector.interface.js';

export class SummaryService implements ISummaryService {

  /**
   * Generate and save conversation summary
   */
  async generateSummary(summaryData: ICreateSummary): Promise<IConversationSummary> {
    try {
      console.log(`📊 Generating summary for chat: ${summaryData.chat_id}`);

      // Generate AI summary using OpenAI
      const aiResult = await openaiService.generateConversationSummary(
        summaryData.chat_id,
        summaryData.hume_data,
        summaryData.conversation_events
      );

      if (!aiResult.success || !aiResult.data) {
        // Create a basic summary if AI fails
        const basicSummary = this.createBasicSummary(summaryData);
        const savedSummary = await this.saveSummary(summaryData, basicSummary, aiResult.metadata);

        // 🔮 Vectorize and store in Pinecone (even for fallback summaries)
        await this.vectorizeSummary(savedSummary, summaryData.email);

        return savedSummary;
      }

      // Save the AI-generated summary
      const savedSummary = await this.saveSummary(summaryData, aiResult.data, aiResult.metadata);

      // 🔮 Vectorize and store in Pinecone
      await this.vectorizeSummary(savedSummary, summaryData.email);

      return savedSummary;

    } catch (error) {
      console.error('❌ Error generating summary:', error);
      
      // Fallback to basic summary
      const basicSummary = this.createBasicSummary(summaryData);
      const savedSummary = await this.saveSummary(summaryData, basicSummary);

      // 🔮 Vectorize and store in Pinecone (even for basic summaries)
      await this.vectorizeSummary(savedSummary, summaryData.email);

      return savedSummary;
    }
  }

  /**
   * Save summary to MongoDB
   */
  private async saveSummary(
    summaryData: ICreateSummary, 
    summary: any, 
    aiMetadata?: any
  ): Promise<IConversationSummary> {
    const collection = mongodb.getCollection<IConversationSummary>('summaries');
    
    const summaryDoc: Omit<IConversationSummary, '_id'> = {
      chat_id: summaryData.chat_id,
      email: summaryData.email,
      user_id: summaryData.user_id,
      summary: summary,
      metadata: {
        total_events: summaryData.hume_data?.total_events || summaryData.conversation_events.length,
        conversation_duration: summaryData.hume_data?.duration,
        hume_emotions_count: summaryData.hume_data?.emotions_summary?.emotion_timeline?.length || 0,
        summary_generated_at: new Date(),
        openai_model: aiMetadata?.model || 'basic',
        tokens_used: aiMetadata?.tokens_used
      },
      raw_data: {
        hume_chat_id: summaryData.hume_data?.hume_chat_id || summaryData.chat_id,
        original_events_count: summaryData.conversation_events.length
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if summary already exists
    const existingSummary = await collection.findOne({ chat_id: summaryData.chat_id });
    
    if (existingSummary) {
      // Update existing summary
      const updateResult = await collection.findOneAndUpdate(
        { chat_id: summaryData.chat_id },
        { 
          $set: { 
            ...summaryDoc,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );
      
      console.log(`📊 Updated existing summary for chat: ${summaryData.chat_id}`);
      return updateResult!;
    } else {
      // Create new summary
      const result = await collection.insertOne(summaryDoc as IConversationSummary);
      console.log(`📊 Created new summary for chat: ${summaryData.chat_id}`);
      return { ...summaryDoc, _id: result.insertedId } as IConversationSummary;
    }
  }

  /**
   * Create basic summary when AI is not available
   */
  private createBasicSummary(summaryData: ICreateSummary): any {
    const events = summaryData.conversation_events || [];
    const humeData = summaryData.hume_data;

    const userMessages = events.filter(e => e.user_input).length;
    const dominantEmotions = humeData?.emotions_summary?.dominant_emotions?.slice(0, 3)?.map((e: any) => e.name) || [];

    return {
      summary: `User engaged in a conversation with ${userMessages} messages. ${dominantEmotions.length > 0 ? `Primary emotions detected: ${dominantEmotions.join(', ')}. ` : ''}The user participated in an interactive dialogue session. Emotional analysis data is available from Hume AI for further insights into user mood and communication patterns.`
    };
  }

  /**
   * Get summary by chat ID
   */
  async getSummary(chatId: string): Promise<IConversationSummary | null> {
    const collection = mongodb.getCollection<IConversationSummary>('summaries');
    return await collection.findOne({ chat_id: chatId });
  }

  /**
   * Get all summaries for a user
   */
  async getUserSummaries(email: string): Promise<IConversationSummary[]> {
    const collection = mongodb.getCollection<IConversationSummary>('summaries');
    return await collection.find({ email }).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Process summary generation (called from chat service)
   */
  async processSummaryGeneration(
    chatId: string,
    email: string,
    humeData: any,
    userId?: string
  ): Promise<IServiceResponse<IConversationSummary>> {
    try {
      const conversationEvents = humeData?.events || [];
      
      const summaryData: ICreateSummary = {
        chat_id: chatId,
        email,
        user_id: userId,
        hume_data: humeData,
        conversation_events: conversationEvents
      };

      const summary = await this.generateSummary(summaryData);

      return {
        success: true,
        data: summary,
        message: 'Conversation summary generated and saved successfully',
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ Error processing summary generation:', error);
      return {
        success: false,
        error: `Failed to generate summary: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Vectorize summary and store in Pinecone for semantic search
   */
  private async vectorizeSummary(summary: IConversationSummary, email: string): Promise<void> {
    try {
      console.log(`🔮 Vectorizing summary for chat: ${summary.chat_id}`);

      // Generate embedding from summary text
      const summaryText = typeof summary.summary === 'object' ? JSON.stringify(summary.summary) : String(summary.summary);
      console.log(`🔍 Debug - Summary text type: ${typeof summary.summary}, value: "${summaryText}"`);
      
      const embeddingResult = await openaiService.generateEmbedding(summaryText);
      
      if (!embeddingResult.success || !embeddingResult.data) {
        console.warn(`⚠️  Failed to generate embedding: ${embeddingResult.error}`);
        return;
      }

      // Get Pinecone index
      const index = await pinecone.getIndex();
      
      // Use namespace from config
      const namespace = index.namespace('conversation-namespace');
      
      // Create vector data with metadata (filter out null values for Pinecone)
      // summaryText is already a string from the embedding generation above
      const metadata: any = {
        type: 'conversation_summary',
        chat_id: summary.chat_id,
        email: email,
        summary_text: summaryText, // Already guaranteed to be a string
          total_events: summary.metadata.total_events,
          emotions_count: summary.metadata.hume_emotions_count,
          created_at: summary.createdAt.toISOString(),
          updated_at: summary.updatedAt.toISOString()
        };

        // Only add non-null optional fields
        if (summary.user_id) {
          metadata.user_id = summary.user_id;
        }
        if (summary.metadata.conversation_duration) {
          metadata.conversation_duration = summary.metadata.conversation_duration;
        }
        if (summary._id) {
          metadata.summary_id = summary._id.toString();
        }

        const vectorData: IVector = {
          id: `summary-${summary.chat_id}-${Date.now()}`, // Unique ID for each summary
          values: embeddingResult.data,
          metadata
        };

      // Store in Pinecone with namespace
      console.log(`🔮 Storing vector in Pinecone namespace: conversation-namespace`);
      await namespace.upsert([vectorData]);

      console.log(`✅ Summary vectorized and stored in Pinecone for user: ${email} (ID: ${vectorData.id})`);

    } catch (error) {
      console.error('❌ Failed to vectorize summary:', error);
      // Don't throw - vectorization failure shouldn't break summary generation
    }
  }
}

export const summaryService = new SummaryService();