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
    minRelevanceScore: number = 0.1  // Lowered threshold to catch more potential matches
  ): Promise<IServiceResponse<ISearchResponse>> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Searching conversations for: "${query}"`);

      // Detect query type and adjust search strategy
      const queryType = this.detectQueryType(query);
      console.log(`🎯 Detected query type: ${queryType}`);

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
      
      // Build enhanced search filter based on query type
      const filter: any = {
        type: { $eq: 'conversation_summary' }
      };
      
      if (email) {
        filter.email = { $eq: email };
      }

      // Add filters based on detected query type
      this.addQueryTypeFilters(filter, queryType, query);

      // Get user's conversations first for OpenAI extraction
      console.log(`🔍 First attempting OpenAI extraction for email: ${email}`);
      const userConversations = await namespace.query({
        vector: new Array(1024).fill(0), // Dummy vector for metadata-only search
        topK: 10,
        filter: {
          type: { $eq: 'conversation_summary' },
          email: { $eq: email }
        },
        includeMetadata: true
      });

      console.log(`📊 Found ${userConversations.matches?.length || 0} user conversations for OpenAI extraction`);

      if (userConversations.matches && userConversations.matches.length > 0) {
        console.log(`🤖 Using OpenAI to extract specific information from ${userConversations.matches.length} conversations`);
        
        // Format conversations for OpenAI
        const conversations = userConversations.matches.map((match: any) => {
          let summary = match.metadata?.summary_text;
          // Try to parse if it's JSON string
          if (typeof summary === 'string' && summary.startsWith('{')) {
            try {
              const parsed = JSON.parse(summary);
              summary = parsed.summary;
            } catch (e) {
              // Keep original if parsing fails
            }
          }
          console.log(`  - Chat ${match.metadata?.chat_id}: "${summary?.substring(0, 100)}..."`);
          return {
            chat_id: match.metadata?.chat_id,
            summary: summary
          };
        });

        // Use OpenAI to extract specific information
        console.log(`🔍 Asking OpenAI to extract: "${query}"`);
        const extractionResult = await openaiService.extractSpecificInformation(conversations, query);
        console.log(`🎯 OpenAI extraction result:`, extractionResult);

        if (extractionResult.success && extractionResult.data?.found) {
          // Return the specific information found
          const info = extractionResult.data;
          console.log(`✅ Found exact information: "${info.value}" from chat ${info.source_chat_id}`);
          
          return {
            success: true,
            data: {
              query,
              results: [{
                chat_id: info.source_chat_id,
                email: email || 'unknown',
                summary: info.value,
                score: 1.0,
                created_at: new Date().toISOString(),
                metadata: {
                  extracted: true,
                  original_query: query
                }
              }],
              total_found: 1,
              search_time_ms: Date.now() - startTime
            },
            message: 'Found exact information requested',
            timestamp: new Date()
          };
        } else {
          console.log(`❌ OpenAI could not find specific information for: "${query}"`);
        }
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
      
      // SORT: Enhanced scoring with emotion, topics, and recency
      const sortedResults = relevantResults.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        
        // Calculate time difference in hours
        const hoursDiffA = (Date.now() - dateA) / (1000 * 60 * 60);
        const hoursDiffB = (Date.now() - dateB) / (1000 * 60 * 60);
        
        // Normalize time difference (0-1 range, where 1 is most recent)
        const timeScoreA = Math.max(0, 1 - (hoursDiffA / 168)); // Within last week
        const timeScoreB = Math.max(0, 1 - (hoursDiffB / 168));
        
        // Check for personal information content
        const personalInfoA = a.metadata?.has_personal_info || false;
        const personalInfoB = b.metadata?.has_personal_info || false;
        
        // Check for emotional relevance to query
        const emotionRelevanceA = this.calculateEmotionRelevance(query, a.metadata);
        const emotionRelevanceB = this.calculateEmotionRelevance(query, b.metadata);
        
        // Check for topic relevance
        const topicRelevanceA = this.calculateTopicRelevance(query, a.metadata);
        const topicRelevanceB = this.calculateTopicRelevance(query, b.metadata);
        
        // Use stored relevance score from metadata
        const metadataScoreA = a.metadata?.relevance_score || 0.5;
        const metadataScoreB = b.metadata?.relevance_score || 0.5;

        // Enhanced combined score
        const combinedScoreA = (
          a.score * 0.35 +                    // Semantic relevance
          timeScoreA * 0.15 +                 // Recency
          (personalInfoA ? 0.2 : 0) +         // Personal info bonus
          emotionRelevanceA * 0.1 +           // Emotion relevance
          topicRelevanceA * 0.1 +             // Topic relevance
          metadataScoreA * 0.1                // Stored relevance score
        );
        
        const combinedScoreB = (
          b.score * 0.35 +
          timeScoreB * 0.15 +
          (personalInfoB ? 0.2 : 0) +
          emotionRelevanceB * 0.1 +
          topicRelevanceB * 0.1 +
          metadataScoreB * 0.1
        );
        
        return combinedScoreB - combinedScoreA;
      });

      // LIMIT: Take only the requested number of results
      const finalResults = sortedResults.slice(0, topK);

      const searchTime = Date.now() - startTime;

      console.log(`🎯 RELEVANCE FILTERING:`);
      console.log(`   📊 Total matches from Pinecone: ${allResults.length}`);
      console.log(`   ✅ Relevant matches (score >= ${minRelevanceScore}): ${relevantResults.length}`);
      console.log(`   🎯 Final results (latest first): ${finalResults.length}`);
      
      if (finalResults.length > 0) {
        const firstResult = finalResults[0];
        const lastResult = finalResults[finalResults.length - 1];
        if (firstResult?.created_at && lastResult?.created_at) {
          console.log(`   📅 Date range: ${new Date(firstResult.created_at).toLocaleDateString()} to ${new Date(lastResult.created_at).toLocaleDateString()}`);
        }
        if (firstResult?.score !== undefined && lastResult?.score !== undefined) {
          console.log(`   📊 Score range: ${firstResult.score.toFixed(3)} to ${lastResult.score.toFixed(3)}`);
        }
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

  /**
   * Calculate emotion relevance between query and conversation
   */
  private calculateEmotionRelevance(query: string, metadata: any): number {
    if (!metadata) return 0;

    const queryLower = query.toLowerCase();
    const dominantEmotion = metadata.dominant_emotion?.toLowerCase() || 'neutral';
    const emotionalContext = metadata.emotional_context?.toLowerCase() || 'neutral';

    // Check if query is emotion-related
    const emotionKeywords = ['feel', 'felt', 'emotion', 'mood', 'happy', 'sad', 'angry', 'excited', 'frustrated'];
    const isEmotionQuery = emotionKeywords.some(keyword => queryLower.includes(keyword));

    if (!isEmotionQuery) return 0;

    // Match emotion keywords in query with stored emotion
    if (queryLower.includes(dominantEmotion)) return 0.8;
    if (emotionalContext.includes('positive') && (queryLower.includes('happy') || queryLower.includes('excited'))) return 0.6;
    if (emotionalContext.includes('negative') && (queryLower.includes('sad') || queryLower.includes('frustrated'))) return 0.6;

    return 0.1; // Small boost for any emotional content
  }

  /**
   * Calculate topic relevance between query and conversation
   */
  private calculateTopicRelevance(query: string, metadata: any): number {
    if (!metadata?.topics) return 0;

    const queryLower = query.toLowerCase();
    const topics = metadata.topics.split(',').map((t: string) => t.trim().toLowerCase());

    // Count topic matches
    let matches = 0;
    topics.forEach((topic: string) => {
      if (topic && queryLower.includes(topic)) {
        matches++;
      }
    });

    // Return normalized score (0-1)
    return Math.min(matches / Math.max(topics.length, 1), 1.0);
  }

  /**
   * Detect the type of query to optimize search strategy
   */
  private detectQueryType(query: string): string {
    const queryLower = query.toLowerCase();

    // Emotion-based queries
    const emotionKeywords = ['feel', 'felt', 'emotion', 'mood', 'happy', 'sad', 'angry', 'excited', 'frustrated'];
    if (emotionKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'emotion';
    }

    // Fact extraction queries
    const factKeywords = ['what', 'when', 'where', 'who', 'how', 'mentioned', 'said', 'told'];
    if (factKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'fact_extraction';
    }

    // Personal information queries
    const personalKeywords = ['my', 'mine', 'i have', 'i own', 'i am', 'i work', 'i live'];
    if (personalKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'personal_info';
    }

    // Topic-based queries
    const topicKeywords = ['about', 'regarding', 'concerning', 'related to'];
    if (topicKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'topic_based';
    }

    // Default to general search
    return 'general';
  }

  /**
   * Add query-type specific filters to improve search accuracy
   */
  private addQueryTypeFilters(filter: any, queryType: string, query: string): void {
    const queryLower = query.toLowerCase();

    switch (queryType) {
      case 'emotion':
        // Filter for conversations with emotional content
        filter.dominant_emotion = { $ne: 'neutral' };
        break;

      case 'fact_extraction':
      case 'personal_info':
        // Filter for conversations containing personal information
        filter.has_personal_info = { $eq: true };
        break;

      case 'topic_based':
        // Extract topic from query and filter
        const topic = this.extractTopicFromQuery(queryLower);
        if (topic) {
          filter.topics = { $regex: topic };
        }
        break;

      default:
        // No additional filters for general queries
        break;
    }
  }

  /**
   * Extract topic from topic-based queries
   */
  private extractTopicFromQuery(queryLower: string): string | null {
    // Simple topic extraction - can be enhanced
    const aboutIndex = queryLower.indexOf('about ');
    if (aboutIndex !== -1) {
      const topic = queryLower.substring(aboutIndex + 6).trim().split(' ')[0];
      return topic || null;
    }

    const regardingIndex = queryLower.indexOf('regarding ');
    if (regardingIndex !== -1) {
      const topic = queryLower.substring(regardingIndex + 10).trim().split(' ')[0];
      return topic || null;
    }

    return null;
  }
}

export const searchService = new SearchService();