/**
 * Hume AI Chat Status enumeration
 */
export enum HumeChatStatus {
  ACTIVE = 'ACTIVE',
  USER_ENDED = 'USER_ENDED',
  USER_TIMEOUT = 'USER_TIMEOUT',
  MAX_DURATION_TIMEOUT = 'MAX_DURATION_TIMEOUT',
  INACTIVITY_TIMEOUT = 'INACTIVITY_TIMEOUT',
  ERROR = 'ERROR'
}

/**
 * Hume AI Pagination Direction
 */
export enum HumePaginationDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * Interface for Hume Chat Event
 */
export interface IHumeChatEvent {
  id: string;
  type: string;
  timestamp: number;
  data?: Record<string, any>;
  user_input?: string;
  assistant_output?: string;
  emotions?: Array<{
    name: string;
    score: number;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Interface for Hume Chat Config
 */
export interface IHumeChatConfig {
  id: string;
  name?: string;
  settings?: Record<string, any>;
}

/**
 * Interface for Hume Chat Events Response
 */
export interface IHumeChatEventsResponse {
  id: string;
  chat_group_id: string;
  status: HumeChatStatus;
  start_timestamp: number;
  end_timestamp?: number | null;
  pagination_direction: HumePaginationDirection;
  events_page: IHumeChatEvent[];
  page_number: number;
  page_size: number;
  total_pages: number;
  metadata?: string | null;
  config?: IHumeChatConfig | null;
}

/**
 * Interface for Hume API Query Parameters
 */
export interface IHumeQueryParams {
  pageNumber?: number;
  pageSize?: number;
  ascendingOrder?: boolean;
}

/**
 * Interface for processed Hume data to store in MongoDB
 */
export interface IProcessedHumeData {
  hume_chat_id: string;
  chat_group_id: string;
  status: HumeChatStatus;
  start_timestamp: number;
  end_timestamp?: number | null;
  total_events: number;
  events: IHumeChatEvent[];
  emotions_summary?: {
    dominant_emotions: Array<{
      name: string;
      average_score: number;
      occurrence_count: number;
    }>;
    emotion_timeline: Array<{
      timestamp: number;
      emotions: Array<{
        name: string;
        score: number;
      }>;
    }>;
  };
  metadata?: any;
  config?: IHumeChatConfig | null;
  fetched_at: Date;
}