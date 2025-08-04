import { HumeClient } from 'hume';
import { configService } from '../../services/config.service.js';
import type { 
  IHumeChatEventsResponse, 
  IHumeQueryParams, 
  IProcessedHumeData,
  IHumeChatEvent
} from '../interfaces/hume.interface.js';
import { HumeChatStatus } from '../interfaces/hume.interface.js';
import type { IServiceResponse } from '../../common/interfaces/service.interface.js';

export class HumeService {
  private client: HumeClient;

  constructor() {
    const apiKey = configService.get('hume.apiKey') || process.env.HUME_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  Hume API key not found. Hume integration disabled.');
      this.client = null as any;
      return;
    }

    this.client = new HumeClient({ 
      apiKey: apiKey 
    });
    
    console.log('🎭 Hume AI client initialized');
  }

  /**
   * Check if Hume client is available
   */
  public isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Fetch all chat events for a given chat ID
   */
  async fetchChatEvents(
    chatId: string, 
    params: IHumeQueryParams = {}
  ): Promise<IServiceResponse<IHumeChatEventsResponse>> {
    try {
      if (!this.isAvailable()) {
        return {
          success: false,
          error: 'Hume client not available - API key missing',
          timestamp: new Date()
        };
      }

      console.log(`🎭 Fetching Hume chat events for chat ID: ${chatId}`);

      const queryParams = {
        pageNumber: params.pageNumber || 0,
        pageSize: params.pageSize || 100, // Get more events per page
        ascendingOrder: params.ascendingOrder !== false // Default to true
      };

      const response = await this.client.empathicVoice.chats.listChatEvents(
        chatId, 
        queryParams
      );

      // Note: The Hume SDK returns a Page object, so we need to iterate through it
      const events: IHumeChatEvent[] = [];
      let chatMetadata: any = null;
      
      for await (const event of response) {
        // Transform the Hume event to our interface
        const transformedEvent: IHumeChatEvent = {
          id: event.id || '',
          type: event.type || 'unknown',
          timestamp: event.timestamp || Date.now() / 1000,
          data: (event as any).data || {},
          user_input: (event as any).user_input,
          assistant_output: (event as any).assistant_output,
          emotions: (event as any).emotions || [],
          metadata: event.metadata ? JSON.parse(event.metadata) : {}
        };
        events.push(transformedEvent);
      }

      // Create our response structure (we'll need to get chat details separately)
      const chatEventsData: IHumeChatEventsResponse = {
        id: chatId,
        chat_group_id: chatId, // Fallback to chatId
        status: HumeChatStatus.ACTIVE, // Default status
        start_timestamp: Date.now() / 1000, // Fallback timestamp
        end_timestamp: null,
        pagination_direction: queryParams.ascendingOrder ? 'ASC' as any : 'DESC' as any,
        events_page: events,
        page_number: queryParams.pageNumber,
        page_size: queryParams.pageSize,
        total_pages: 1, // We'll update this if needed
        metadata: null,
        config: null
      };

      console.log(`✅ Fetched ${chatEventsData.events_page.length} events for chat ${chatId}`);

      return {
        success: true,
        data: chatEventsData,
        message: `Successfully fetched chat events for ${chatId}`,
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ Hume API error:', error);
      return {
        success: false,
        error: `Failed to fetch Hume chat events: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Fetch all chat events across multiple pages
   */
  async fetchAllChatEvents(chatId: string): Promise<IServiceResponse<IProcessedHumeData>> {
    try {
      if (!this.isAvailable()) {
        return {
          success: false,
          error: 'Hume client not available - API key missing',
          timestamp: new Date()
        };
      }

      console.log(`🎭 Fetching ALL chat events for chat ID: ${chatId}`);

      let allEvents: IHumeChatEvent[] = [];
      let currentPage = 0;
      let totalPages = 1;
      let chatData: IHumeChatEventsResponse | null = null;

      // Fetch all pages
      while (currentPage < totalPages) {
        const result = await this.fetchChatEvents(chatId, {
          pageNumber: currentPage,
          pageSize: 100,
          ascendingOrder: true
        });

        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to fetch chat events',
            timestamp: new Date()
          };
        }

        if (currentPage === 0) {
          chatData = result.data;
          totalPages = result.data.total_pages;
        }

        allEvents = allEvents.concat(result.data.events_page);
        currentPage++;
      }

      if (!chatData) {
        return {
          success: false,
          error: 'No chat data retrieved',
          timestamp: new Date()
        };
      }

      // Process emotions data
      const emotionsSummary = this.processEmotions(allEvents);

      const processedData: IProcessedHumeData = {
        hume_chat_id: chatData.id,
        chat_group_id: chatData.chat_group_id,
        status: chatData.status,
        start_timestamp: chatData.start_timestamp,
        end_timestamp: chatData.end_timestamp || null,
        total_events: allEvents.length,
        events: allEvents,
        emotions_summary: emotionsSummary,
        metadata: chatData.metadata ? JSON.parse(chatData.metadata) : null,
        config: chatData.config || null,
        fetched_at: new Date()
      };

      console.log(`✅ Processed ${allEvents.length} total events for chat ${chatId}`);

      return {
        success: true,
        data: processedData,
        message: `Successfully processed all chat events for ${chatId}`,
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ Error fetching all Hume chat events:', error);
      return {
        success: false,
        error: `Failed to fetch all chat events: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Process emotions data from events
   */
  private processEmotions(events: IHumeChatEvent[]) {
    const emotionCounts: Record<string, { total: number; count: number }> = {};
    const emotionTimeline: Array<{
      timestamp: number;
      emotions: Array<{ name: string; score: number }>;
    }> = [];

    events.forEach(event => {
      if (event.emotions && Array.isArray(event.emotions)) {
        // Add to timeline
        emotionTimeline.push({
          timestamp: event.timestamp,
          emotions: event.emotions
        });

        // Aggregate emotions
        event.emotions.forEach(emotion => {
          if (!emotionCounts[emotion.name]) {
            emotionCounts[emotion.name] = { total: 0, count: 0 };
          }
          emotionCounts[emotion.name]!.total += emotion.score;
          emotionCounts[emotion.name]!.count += 1;
        });
      }
    });

    // Calculate dominant emotions
    const dominantEmotions = Object.entries(emotionCounts)
      .map(([name, data]) => ({
        name,
        average_score: data.total / data.count,
        occurrence_count: data.count
      }))
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, 10); // Top 10 emotions

    return {
      dominant_emotions: dominantEmotions,
      emotion_timeline: emotionTimeline
    };
  }
}

export const humeService = new HumeService();