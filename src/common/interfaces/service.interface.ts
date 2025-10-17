/**
 * Interface for service response wrapper
 */
export interface IServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string | undefined;
  metadata?: any;
  timestamp: Date;
}

/**
 * Interface for paginated response
 */
export interface IPaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Interface for pagination parameters
 */
export interface IPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for validation service
 */
export interface IValidationService {
  validateDto<T>(dto: any, dtoClass: new () => T): Promise<IServiceResponse<T>>;
  validateRequired(fields: Record<string, any>): IServiceResponse<void>;
}

/**
 * Interface for health check service
 */
export interface IHealthService {
  checkHealth(): Promise<
    IServiceResponse<{
      status: 'healthy' | 'unhealthy';
      services: {
        mongodb: boolean;
        pinecone: boolean;
      };
      uptime: number;
      timestamp: Date;
    }>
  >;
}
