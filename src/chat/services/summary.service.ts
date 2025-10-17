import { ObjectId } from 'mongodb';

import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import { mongodb } from '../../database/mongodb.js';
import { pinecone } from '../../database/pinecone.js';
import type { IConversationSummary, ICreateSummary, ISummaryService } from '../interfaces/summary.interface.js';

import { openaiService } from './openai.service.js';

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
        summaryData.conversation_events
      );

      if (!aiResult.success || !aiResult.data) {
        // Create a basic summary if AI fails
        const basicSummary = this.createBasicSummary(summaryData);
        const savedSummary = await this.saveSummary(summaryData, basicSummary, aiResult.metadata);

        return savedSummary;
      }

      // Save the AI-generated summary
      const savedSummary = await this.saveSummary(summaryData, aiResult.data, aiResult.metadata);

      return savedSummary;
    } catch (error) {
      console.error('❌ Error generating summary:', error);

      // Fallback to basic summary
      const basicSummary = this.createBasicSummary(summaryData);
      const savedSummary = await this.saveSummary(summaryData, basicSummary);

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
      summary,
      metadata: {
        total_events: summaryData.conversation_events.length,
        summary_generated_at: new Date(),
        openai_model: aiMetadata?.model || 'basic',
        tokens_used: aiMetadata?.tokens_used
      },
      raw_data: {
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
    const userMessages = events.filter(e => e.user_input).length;

    return {
      summary: `User engaged in a conversation with ${userMessages} messages. The user participated in an interactive dialogue session.`
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
    conversationEvents: any[],
    userId?: string
  ): Promise<IServiceResponse<IConversationSummary>> {
    try {
      const summaryData: ICreateSummary = {
        chat_id: chatId,
        email,
        user_id: userId,
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
}

export const summaryService = new SummaryService();
