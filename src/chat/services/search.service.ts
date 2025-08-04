import { pinecone } from '../../database/pinecone.js';
import { openaiService } from './openai.service.js';
import type { IServiceResponse } from '../../common/interfaces/service.interface.js';

export interface ISearchResult {
  chat_id: string;
  email: string;
  summary: string;
  score: number;
  created_at: string;
  metadata: any;
}

export interface ISearchResponse {
  query: string;
  results: ISearchResult[];
  total_found: number;
  search_time_ms: number;
}

export class SearchService {
  
  /**
   * Search conversation summaries by semantic similarity
   */
  async searchConversations(
    query: string, 
    email?: string, 
    topK: number = 5,
    minRelevanceScore: number = 0.2  // NEW: Minimum relevance threshold (lowered for better results)
  ): Promise<IServiceResponse<ISearchResponse>> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Searching conversations for: "${query}"`);

      // Generate embedding for search query
      const embeddingResult = await openaiService.generateEmbedding(query);
      
      if (!embeddingResult.success || !embeddingResult.data) {
        return {
          success: false,
          error: `Failed to generate search embedding: ${embeddingResult.error}`,
          timestamp: new Date()
        };
      }

      // Get Pinecone index with namespace
      const index = await pinecone.getIndex();
      const namespace = index.namespace('conversation-namespace');
      
      // Build search filter
      const filter: any = {
        type: { $eq: 'conversation_summary' }
      };
      
      if (email) {
        filter.email = { $eq: email };
      }

      // Perform vector search in namespace (get more results to filter)
      const searchResults = await namespace.query({
        vector: embeddingResult.data,
        topK: topK * 3,  // Get 3x more results to filter for relevance
        filter,
        includeMetadata: true,
        includeValues: false
      });

      // Process and filter results by relevance score
      let allResults: ISearchResult[] = searchResults.matches?.map((match: any) => ({
        chat_id: match.metadata?.chat_id || 'unknown',
        email: match.metadata?.email || 'unknown',
        summary: match.metadata?.summary_text || 'No summary available',
        score: match.score || 0,
        created_at: match.metadata?.created_at || new Date().toISOString(),
        metadata: {
          user_id: match.metadata?.user_id,
          total_events: match.metadata?.total_events,
          conversation_duration: match.metadata?.conversation_duration,
          emotions_count: match.metadata?.emotions_count,
          summary_id: match.metadata?.summary_id
        }
      })) || [];

      // FILTER: Only keep results above relevance threshold
      const relevantResults = allResults.filter(result => result.score >= minRelevanceScore);
      
      // SORT: Order by created_at (latest first), then by score
      const sortedResults = relevantResults.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        
        // First sort by date (newest first)
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        
        // If dates are equal, sort by relevance score (highest first)
        return b.score - a.score;
      });

      // LIMIT: Take only the requested number of results
      const finalResults = sortedResults.slice(0, topK);

      const searchTime = Date.now() - startTime;

      console.log(`🎯 RELEVANCE FILTERING:`);
      console.log(`   📊 Total matches from Pinecone: ${allResults.length}`);
      console.log(`   ✅ Relevant matches (score >= ${minRelevanceScore}): ${relevantResults.length}`);
      console.log(`   🎯 Final results (latest first): ${finalResults.length}`);
      
      if (finalResults.length > 0) {
        console.log(`   📅 Date range: ${new Date(finalResults[0].created_at).toLocaleDateString()} to ${new Date(finalResults[finalResults.length - 1].created_at).toLocaleDateString()}`);
        console.log(`   📊 Score range: ${finalResults[0].score.toFixed(3)} to ${finalResults[finalResults.length - 1].score.toFixed(3)}`);
      }

      console.log(`✅ Found ${finalResults.length} relevant conversations in ${searchTime}ms`);

      return {
        success: true,
        data: {
          query,
          results: finalResults,
          total_found: finalResults.length,
          search_time_ms: searchTime
        },
        message: `Found ${finalResults.length} relevant conversations (score >= ${minRelevanceScore})`,
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ Search error:', error);
      return {
        success: false,
        error: `Search failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Search conversations for a specific user
   */
  async searchUserConversations(
    email: string, 
    query?: string, 
    topK: number = 10
  ): Promise<IServiceResponse<ISearchResponse>> {
    
    if (query) {
      // Semantic search within user's conversations (with relevance filtering)
      return this.searchConversations(query, email, topK, 0.2);
    }

    // Return all user conversations (simple filter search) - ALSO sorted by date
    try {
      const index = await pinecone.getIndex();
      const namespace = index.namespace('conversation-namespace');
      
      const searchResults = await namespace.query({
        vector: new Array(1024).fill(0), // Dummy vector for filter-only search (1024 dims)
        topK: topK * 2, // Get more results to sort properly
        filter: {
          type: { $eq: 'conversation_summary' },
          email: { $eq: email }
        },
        includeMetadata: true,
        includeValues: false
      });

      let results: ISearchResult[] = searchResults.matches?.map((match: any) => ({
        chat_id: match.metadata?.chat_id || 'unknown',
        email: match.metadata?.email || email,
        summary: match.metadata?.summary_text || 'No summary available',
        score: match.score || 0,
        created_at: match.metadata?.created_at || new Date().toISOString(),
        metadata: {
          user_id: match.metadata?.user_id,
          total_events: match.metadata?.total_events,
          conversation_duration: match.metadata?.conversation_duration,
          emotions_count: match.metadata?.emotions_count,
          summary_id: match.metadata?.summary_id
        }
      })) || [];

      // SORT: Order by created_at (latest first)
      results = results.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Latest first
      });

      // LIMIT: Take only the requested number of results
      results = results.slice(0, topK);

      console.log(`📅 USER CONVERSATIONS SORTED BY DATE (latest first): ${results.length}`);

      return {
        success: true,
        data: {
          query: query || `All conversations for ${email}`,
          results,
          total_found: results.length,
          search_time_ms: 0
        },
        message: `Found ${results.length} conversations for user`,
        timestamp: new Date()
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Failed to fetch user conversations: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
}

export const searchService = new SearchService();