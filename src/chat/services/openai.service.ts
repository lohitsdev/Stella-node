import OpenAI from 'openai';

import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import { configService } from '../../services/config.service.js';
import type { IOpenAISummaryResponse } from '../interfaces/summary.interface.js';

export class OpenAIService {
  private client: OpenAI;
  private readonly aiConfig = configService.get('ai');

  constructor() {
    const apiKey = configService.get('openai.apiKey') || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  OpenAI API key not found. AI summarization disabled.');
      this.client = null as any;
      return;
    }

    this.client = new OpenAI({
      apiKey
    });

    console.log('🤖 OpenAI client initialized');
  }

  /**
   * Check if OpenAI client is properly initialized and available
   * @returns True if client is available, false otherwise
   */
  public isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate embedding vector from text using OpenAI's embedding model
   * @param text - Input text to generate embedding for
   * @returns Promise resolving to service response with embedding vector
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

      // Truncate text to configured maximum length
      const maxLength = this.aiConfig.maxTokenLength;
      const inputText = cleanText.length > maxLength ? cleanText.substring(0, maxLength) : cleanText;

      console.log(`🔮 Generating embedding for text (${inputText.length} chars)`);

      // Generate embedding using configured model and dimensions
      const response = await this.client.embeddings.create({
        model: this.aiConfig.embeddingModel,
        input: inputText,
        encoding_format: 'float',
        dimensions: this.aiConfig.embeddingDimensions
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
          model: 'text-embedding-3-small',
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
   * Generate AI-powered conversation summary with emotional analysis
   * @param chatId - Unique identifier for the chat session
   * @param conversationEvents - Array of conversation events to analyze
   * @returns Promise resolving to service response with structured summary
   */
  async generateConversationSummary(
    chatId: string,
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

      // Create the prompt
      const prompt = this.buildSummaryPrompt(conversationText);

      console.log(`📝 Sending ${conversationText.length} characters to OpenAI for analysis`);

      const completion = await this.client.chat.completions.create({
        model: this.aiConfig.chatModel,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert conversation analyst specializing in emotional intelligence and communication insights. Analyze conversations and provide structured summaries with emotional context.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
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
            model: 'gpt-4o-mini'
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
   * Extract user messages from conversation events for analysis
   * @param events - Array of conversation events
   * @returns Concatenated string of user messages
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
   * Extract specific factual information from conversation summaries
   * @param conversations - Array of conversation objects with summaries
   * @param query - Specific information to search for
   * @returns Promise resolving to service response with extracted information
   */
  async extractSpecificInformation(conversations: any[], query: string): Promise<IServiceResponse<any>> {
    try {
      if (!this.isAvailable()) {
        return {
          success: false,
          error: 'OpenAI client not available - API key missing',
          timestamp: new Date()
        };
      }

      // Prepare conversation summaries
      const conversationText = conversations
        .map(conv => {
          return `CONVERSATION ${conv.chat_id}:\n${conv.summary}\n`;
        })
        .join('\n');

      const completion = await this.client.chat.completions.create({
        model: this.aiConfig.chatModel,
        messages: [
          {
            role: 'system',
            content: `You are a precise information extractor. Your task is to find CONCRETE FACTS mentioned in conversations, not questions about those facts.

For example:
- If user asks "what car do I own" and you find "User mentioned their car is a Toyota Camry" -> Return "Toyota Camry"
- If you only find "User asked about their car model" -> Return null (no actual information found)

Return ONLY the specific fact/information, not conversations asking about it.`
          },
          {
            role: 'user',
            content: `QUERY: "${query}"\n\nCONVERSATIONS:\n${conversationText}\n\nReturn a JSON response with this structure:\n{\n  "found": boolean,\n  "value": string,\n  "source_chat_id": string\n}`
          }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        return {
          success: false,
          error: 'No response from OpenAI',
          timestamp: new Date()
        };
      }

      const result = JSON.parse(response);
      return {
        success: true,
        data: result,
        message: result.found ? 'Information found' : 'Information not found',
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ OpenAI extraction error:', error);
      return {
        success: false,
        error: `Failed to extract information: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Build comprehensive prompt for conversation analysis and summarization
   * @param conversationText - Extracted user conversation text
   * @returns Formatted prompt string for OpenAI API
   */
  private buildSummaryPrompt(conversationText: string): string {
    return `Extract and analyze this conversation comprehensively. Focus on facts, emotions, and topics.

USER MESSAGES:
${conversationText}

Please provide a JSON response with this structure:
{
  "summary": "Include ONLY specific facts the user mentioned: exact passwords, numbers, names, addresses, preferences, requests, decisions, problems, goals, personal details, important events, deadlines, requirements, or any concrete information they provided. Focus on WHAT they actually said, WHAT they want, WHAT information they provided, and WHAT specific help they need.",
  "emotional_context": "Describe the overall emotional tone: positive, negative, neutral, excited, concerned, happy, sad, frustrated, confused, etc.",
  "dominant_emotion": "Single word for primary emotion detected: joy, sadness, anger, fear, surprise, disgust, neutral",
  "topics": ["list", "of", "main", "topics", "discussed"],
  "personal_facts": ["specific", "personal", "information", "mentioned"],
  "conversation_mood": "Brief description of overall conversation atmosphere",
  "has_questions": true,
  "has_personal_info": true,
  "conversation_length": "short"
}

CRITICAL INSTRUCTIONS:
- Include EXACT quotes when user provides specific data (passwords, codes, numbers, names, etc.)
- Capture specific requests: "I want X", "I need Y", "My problem is Z"
- Note concrete preferences: "I prefer A over B", "I don't like C"
- Record actual events: "Yesterday I did X", "My meeting is on Y"
- List specific requirements: "It must have X feature", "Budget is Y"
- Include personal context: "I work at X", "I live in Y", "I have Z problem"
- Extract main topics discussed (max 5 topics)
- Identify dominant emotion from conversation tone
- Mark has_questions=true if user asked questions
- Mark has_personal_info=true if personal details mentioned
- Set conversation_length: short (<5 messages), medium (5-15), long (>15)

Example: "User wants to set up smart home lighting with budget of $500. Their password is 1-2-3-4-5-6. They mentioned they have 3 bedrooms and existing Alexa devices."`;
  }
}

export const openaiService = new OpenAIService();
