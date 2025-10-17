import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import { pinecone } from '../../database/pinecone.js';
import { openaiService } from '../../chat/services/openai.service.js';

export interface IMemoryResult {
  conversationText: string;
  sessionId: string;
  timestamp: string;
  relevanceScore: number;
}

export interface IMemorySearchRequest {
  email: string;
  query: string;
  limit?: number;
}

export class MemoryService {
  /**
   * Search past conversations in Pinecone by semantic similarity
   */
  async searchMemory(request: IMemorySearchRequest): Promise<IServiceResponse<IMemoryResult[]>> {
    try {
      const { email, query, limit = 5 } = request;

      console.log(`🧠 Searching memory for ${email}: "${query}"`);

      // Generate embedding for the query
      const embeddingResult = await openaiService.generateEmbedding(query);
      if (!embeddingResult.success || !embeddingResult.data) {
        return {
          success: false,
          error: 'Failed to generate query embedding',
          timestamp: new Date()
        };
      }

      // Search in Pinecone
      const index = await pinecone.getIndex();
      const namespace = index.namespace('vapi-conversations');

      const searchResults = await namespace.query({
        vector: embeddingResult.data,
        topK: limit,
        filter: {
          type: { $eq: 'vapi_conversation' },
          email: { $eq: email }
        },
        includeMetadata: true
      });

      // Format results
      const memories: IMemoryResult[] = (searchResults.matches || [])
        .filter((match: any) => (match.score || 0) > 0.7) // Only relevant memories
        .map((match: any) => ({
          conversationText: match.metadata?.conversationText || '',
          sessionId: match.metadata?.sessionId || '',
          timestamp: match.metadata?.startedAt || '',
          relevanceScore: match.score || 0
        }));

      console.log(`✅ Found ${memories.length} relevant memories`);

      return {
        success: true,
        data: memories,
        message: `Found ${memories.length} relevant past conversations`,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Memory search error:', error);
      return {
        success: false,
        error: `Memory search failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get recent conversations for a user
   */
  async getRecentConversations(email: string, limit: number = 3): Promise<IServiceResponse<IMemoryResult[]>> {
    try {
      console.log(`📚 Getting recent conversations for ${email}`);

      const index = await pinecone.getIndex();
      const namespace = index.namespace('vapi-conversations');

      // Use a dummy vector to get results by metadata only
      const dummyVector = new Array(1536).fill(0);

      const results = await namespace.query({
        vector: dummyVector,
        topK: limit,
        filter: {
          type: { $eq: 'vapi_conversation' },
          email: { $eq: email }
        },
        includeMetadata: true
      });

      const memories: IMemoryResult[] = (results.matches || [])
        .map((match: any) => ({
          conversationText: match.metadata?.conversationText || '',
          sessionId: match.metadata?.sessionId || '',
          timestamp: match.metadata?.startedAt || '',
          relevanceScore: 1.0
        }))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log(`✅ Found ${memories.length} recent conversations`);

      return {
        success: true,
        data: memories,
        message: `Found ${memories.length} recent conversations`,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Error getting recent conversations:', error);
      return {
        success: false,
        error: `Failed to get recent conversations: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Format memories for VAPI to include in conversation context
   */
  formatMemoriesForContext(memories: IMemoryResult[]): string {
    if (!memories || memories.length === 0) {
      return 'No previous conversations found.';
    }

    const formattedMemories = memories.map((memory, index) => {
      const date = new Date(memory.timestamp).toLocaleDateString();
      return `
Previous Conversation #${index + 1} (${date}):
${memory.conversationText}
---`;
    });

    return `
Here are the user's previous conversations for context:

${formattedMemories.join('\n')}

Use this information to provide personalized responses and reference past discussions when relevant.
`;
  }
}

export const memoryService = new MemoryService();

