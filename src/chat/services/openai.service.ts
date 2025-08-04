import OpenAI from 'openai';
import { configService } from '../../services/config.service.js';
import type { IOpenAISummaryResponse } from '../interfaces/summary.interface.js';
import type { IServiceResponse } from '../../common/interfaces/service.interface.js';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = configService.get('openai.apiKey') || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  OpenAI API key not found. AI summarization disabled.');
      this.client = null as any;
      return;
    }

    this.client = new OpenAI({
      apiKey: apiKey
    });
    
    console.log('🤖 OpenAI client initialized');
  }

  /**
   * Check if OpenAI client is available
   */
  public isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate embedding vector from text using OpenAI
   */
  async generateEmbedding(text: string): Promise<IServiceResponse<number[]>> {
    try {
      if (!this.isAvailable()) {
        return {
          success: false,
          error: 'OpenAI client not available - API key missing',
          timestamp: new Date()
        };
      }

      // 🔧 Validate and clean input text
      if (!text || typeof text !== 'string') {
        return {
          success: false,
          error: 'Invalid input: text must be a non-empty string',
          timestamp: new Date()
        };
      }

      // Clean and truncate text if needed
      const cleanText = text.trim();
      if (cleanText.length === 0) {
        return {
          success: false,
          error: 'Input text is empty after cleaning',
          timestamp: new Date()
        };
      }

      // OpenAI embedding limit is ~8191 tokens, truncate to be safe
      const maxLength = 8000;
      const inputText = cleanText.length > maxLength ? cleanText.substring(0, maxLength) : cleanText;

      console.log(`🔮 Generating embedding for text (${inputText.length} chars)`);

      // 🎯 Use model compatible with Pinecone index dimensions (1024)
      const response = await this.client.embeddings.create({
        model: "text-embedding-3-small", // This generates 1536 dimensions
        input: inputText,
        encoding_format: "float",
        dimensions: 1024 // 🔧 Truncate to match Pinecone index (1024 dims)
      });

      if (!response.data?.[0]?.embedding) {
        return {
          success: false,
          error: 'No embedding returned from OpenAI',
          timestamp: new Date()
        };
      }

      const embedding = response.data[0].embedding;
      console.log(`✅ Generated embedding vector (${embedding.length} dimensions)`);

      return {
        success: true,
        data: embedding,
        message: 'Embedding generated successfully',
        metadata: {
          model: "text-embedding-3-small",
          dimensions: embedding.length,
          tokens_used: response.usage?.total_tokens
        },
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ OpenAI embedding error:', error);
      return {
        success: false,
        error: `Failed to generate embedding: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate conversation summary using OpenAI
   */
  async generateConversationSummary(
    chatId: string,
    humeData: any,
    conversationEvents: any[]
  ): Promise<IServiceResponse<IOpenAISummaryResponse>> {
    try {
      if (!this.isAvailable()) {
        return {
          success: false,
          error: 'OpenAI client not available - API key missing',
          timestamp: new Date()
        };
      }

      console.log(`🤖 Generating AI summary for chat: ${chatId}`);

      // Prepare conversation text from events
      const conversationText = this.extractConversationText(conversationEvents);
      
      // Prepare emotions data
      const emotionsData = this.extractEmotionsData(humeData);

      // Create the prompt
      const prompt = this.buildSummaryPrompt(conversationText, emotionsData, humeData);

      console.log(`📝 Sending ${conversationText.length} characters to OpenAI for analysis`);

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini", // Using faster, cost-effective model
        messages: [
          {
            role: "system",
            content: `You are an expert conversation analyst specializing in emotional intelligence and communication insights. Analyze conversations and provide structured summaries with emotional context.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        return {
          success: false,
          error: 'No response from OpenAI',
          timestamp: new Date()
        };
      }

      try {
        const summary: IOpenAISummaryResponse = JSON.parse(response);
        
        console.log(`✅ Generated AI summary: ${summary.summary.substring(0, 100)}...`);
        
        return {
          success: true,
          data: summary,
          message: 'Conversation summary generated successfully',
          metadata: {
            tokens_used: completion.usage?.total_tokens,
            model: "gpt-4o-mini"
          },
          timestamp: new Date()
        };

      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI response:', parseError);
        return {
          success: false,
          error: 'Failed to parse AI summary response',
          timestamp: new Date()
        };
      }

    } catch (error: any) {
      console.error('❌ OpenAI API error:', error);
      return {
        success: false,
        error: `Failed to generate AI summary: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Extract conversation text from events (USER MESSAGES ONLY)
   */
  private extractConversationText(events: any[]): string {
    const userMessages: string[] = [];
    
    events.forEach((event, index) => {
      // Extract from USER_MESSAGE events in metadata.segments[0].content
      if (event.type === 'USER_MESSAGE' && event.metadata?.segments?.[0]?.content) {
        const userText = event.metadata.segments[0].content;
        userMessages.push(`[Message ${index + 1}] ${userText}`);
      } 
      // Fallback: Check user_input (rarely used)
      else if (event.user_input) {
        userMessages.push(`[Message ${index + 1}] ${event.user_input}`);
      }
    });

    return userMessages.join('\n\n');
  }

  /**
   * Extract emotions data from Hume analysis
   */
  private extractEmotionsData(humeData: any): string {
    if (!humeData?.emotions_summary) {
      return 'No emotional data available';
    }

    const { dominant_emotions, emotion_timeline } = humeData.emotions_summary;
    
    let emotionsSummary = 'Dominant emotions detected:\n';
    
    if (dominant_emotions?.length > 0) {
      dominant_emotions.slice(0, 5).forEach((emotion: any, index: number) => {
        emotionsSummary += `${index + 1}. ${emotion.name} (avg: ${emotion.average_score?.toFixed(2)}, occurrences: ${emotion.occurrence_count})\n`;
      });
    }

    if (emotion_timeline?.length > 0) {
      emotionsSummary += `\nEmotional timeline: ${emotion_timeline.length} emotion data points throughout conversation`;
    }

    return emotionsSummary;
  }

  /**
   * Build the summary prompt
   */
  private buildSummaryPrompt(conversationText: string, emotionsData: string, humeData: any): string {
    return `Extract and summarize ONLY the specific, concrete information the user actually said. Focus on exact details, not interpretations.

USER MESSAGES:
${conversationText}

EMOTIONAL ANALYSIS:
${emotionsData}

Please provide a JSON response with this structure:
{
  "summary": "Include ONLY specific facts the user mentioned: exact passwords, numbers, names, addresses, preferences, requests, decisions, problems, goals, personal details, important events, deadlines, requirements, or any concrete information they provided. Do NOT include interpretations about their communication style or emotional descriptions. Focus on WHAT they actually said, WHAT they want, WHAT information they provided, and WHAT specific help they need."
}

CRITICAL INSTRUCTIONS:
- Include EXACT quotes when user provides specific data (passwords, codes, numbers, names, etc.)
- Capture specific requests: "I want X", "I need Y", "My problem is Z"
- Note concrete preferences: "I prefer A over B", "I don't like C"
- Record actual events: "Yesterday I did X", "My meeting is on Y"
- List specific requirements: "It must have X feature", "Budget is Y"
- Include personal context: "I work at X", "I live in Y", "I have Z problem"
- Avoid generic phrases like "expressed preference" or "emotional state fluctuated"
- Focus on actionable, literal information

Example format: "User wants to set up smart home lighting with budget of $500. Their password is 1-2-3-4-5-6. They mentioned they have 3 bedrooms and existing Alexa devices. They need it completed by Friday for a family gathering. They specifically requested written instructions and prefer the living room setup first."`;
  }
}

export const openaiService = new OpenAIService();