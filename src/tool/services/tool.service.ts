import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import type { IToolQuery, IToolResult, IToolService } from '../interfaces/tool.interface.js';
import { mongodb } from '../../database/mongodb.js';
import { ObjectId } from 'mongodb';
import { searchService } from '../../chat/services/search.service.js';

/**
 * Service for handling tool queries and processing
 */
export class ToolService implements IToolService {
  private readonly collectionName = 'tool_queries';

  /**
   * Process a tool query
   */
  async processQuery(queryData: IToolQuery): Promise<IServiceResponse<IToolResult>> {
    try {
      console.log(`🔧 Processing tool query for: ${queryData.email}`);
      console.log(`📝 Query: "${queryData.query}"`);

      // 🚀 IMMEDIATE PINECONE SEARCH - HIGH SPEED PROCESSING
      console.log(`⚡ SEARCHING PINECONE for user: ${queryData.email}`);
      
      // Search user's conversations (latest first)
      const userSearchResult = await searchService.searchUserConversations(queryData.email, undefined, 10);
      console.log(`📊 USER CONVERSATIONS FOUND: ${userSearchResult.success ? userSearchResult.data?.results?.length || 0 : 0}`);
      
      // Semantic search with query (RELEVANCE FILTERED - minimum score 0.2)
      const semanticSearchResult = await searchService.searchConversations(queryData.query, queryData.email, 5, 0.2);
      console.log(`🔍 SEMANTIC SEARCH RESULTS: ${semanticSearchResult.success ? semanticSearchResult.data?.results?.length || 0 : 0}`);
      
      if (semanticSearchResult.success && semanticSearchResult.data?.results?.length === 0) {
        console.log(`💡 No relevant results found (score < 0.2). Query "${queryData.query}" might not match any conversations.`);
      }
      
      // Log detailed results
      if (userSearchResult.success && userSearchResult.data?.results) {
        console.log(`👤 USER'S CONVERSATIONS (${userSearchResult.data.results.length}):`);
        userSearchResult.data.results.forEach((conv: any, i: number) => {
          console.log(`  ${i + 1}. Chat: ${conv.chat_id} | Score: ${conv.score.toFixed(3)}`);
          console.log(`     Summary: "${conv.summary.substring(0, 100)}..."`);
        });
      }
      
      if (semanticSearchResult.success && semanticSearchResult.data?.results) {
        console.log(`🎯 SEMANTIC SEARCH MATCHES (${semanticSearchResult.data.results.length}):`);
        semanticSearchResult.data.results.forEach((match: any, i: number) => {
          console.log(`  ${i + 1}. Email: ${match.email} | Score: ${match.score.toFixed(3)}`);
          console.log(`     Summary: "${match.summary.substring(0, 100)}..."`);
        });
      }

      const result = {
        status: 'processed',
        message: 'Query processed with Pinecone search results',
        user_conversations_count: userSearchResult.success ? userSearchResult.data?.results?.length || 0 : 0,
        semantic_matches_count: semanticSearchResult.success ? semanticSearchResult.data?.results?.length || 0 : 0,
        search_results: {
          user_conversations: userSearchResult.data?.results || [],
          semantic_matches: semanticSearchResult.data?.results || []
        }
      };

      // Save the query and result to MongoDB
      const toolResult: Omit<IToolResult, '_id'> = {
        query: queryData.query,
        email: queryData.email,
        result: result,
        processed_at: new Date(),
        metadata: queryData.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const collection = await mongodb.getCollection<IToolResult>(this.collectionName);
      const insertResult = await collection.insertOne(toolResult as IToolResult);

      const savedResult = await collection.findOne({ _id: insertResult.insertedId });

      console.log(`✅ Tool query processed and saved with ID: ${insertResult.insertedId}`);

      return {
        success: true,
        data: savedResult!,
        message: 'Tool query processed successfully',
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ Failed to process tool query:', error);
      return {
        success: false,
        error: `Failed to process tool query: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get query history for a user
   */
  async getQueryHistory(email: string): Promise<IServiceResponse<IToolResult[]>> {
    try {
      console.log(`📋 Fetching query history for: ${email}`);

      const collection = await mongodb.getCollection<IToolResult>(this.collectionName);
      const queries = await collection
        .find({ email })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      return {
        success: true,
        data: queries,
        message: `Found ${queries.length} queries for user`,
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ Failed to fetch query history:', error);
      return {
        success: false,
        error: `Failed to fetch query history: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get a specific query result
   */
  async getQueryResult(queryId: string): Promise<IServiceResponse<IToolResult>> {
    try {
      console.log(`🔍 Fetching query result: ${queryId}`);

      if (!ObjectId.isValid(queryId)) {
        return {
          success: false,
          error: 'Invalid query ID format',
          timestamp: new Date()
        };
      }

      const collection = await mongodb.getCollection<IToolResult>(this.collectionName);
      const query = await collection.findOne({ _id: new ObjectId(queryId) });

      if (!query) {
        return {
          success: false,
          error: 'Query not found',
          timestamp: new Date()
        };
      }

      return {
        success: true,
        data: query,
        message: 'Query result retrieved successfully',
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ Failed to fetch query result:', error);
      return {
        success: false,
        error: `Failed to fetch query result: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
}

// Export singleton instance
export const toolService = new ToolService();