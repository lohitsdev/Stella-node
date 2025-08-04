import type { IDocument, ICreateDocument, IUpdateDocument, IDocumentQuery } from '../../documents/interfaces/document.interface.js';
import type { IVector, IVectorQuery, IVectorQueryResult } from '../../vectors/interfaces/vector.interface.js';
import type { CreateDocumentDto, UpdateDocumentDto, DocumentResponseDto } from '../../documents/dto/document.dto.js';
import type { CreateVectorDto, VectorQueryDto, VectorSearchResultDto, StoreDocumentVectorDto } from '../../vectors/dto/vector.dto.js';

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
 * Interface for document service operations
 */
export interface IDocumentService {
  create(dto: CreateDocumentDto): Promise<IServiceResponse<DocumentResponseDto>>;
  findById(id: string): Promise<IServiceResponse<DocumentResponseDto>>;
  findAll(query?: IDocumentQuery, pagination?: IPaginationParams): Promise<IServiceResponse<IPaginatedResponse<DocumentResponseDto>>>;
  update(id: string, dto: UpdateDocumentDto): Promise<IServiceResponse<DocumentResponseDto>>;
  delete(id: string): Promise<IServiceResponse<void>>;
  search(searchTerm: string, pagination?: IPaginationParams): Promise<IServiceResponse<IPaginatedResponse<DocumentResponseDto>>>;
}

/**
 * Interface for vector service operations
 */
export interface IVectorService {
  upsert(dto: CreateVectorDto): Promise<IServiceResponse<void>>;
  query(dto: VectorQueryDto): Promise<IServiceResponse<VectorSearchResultDto[]>>;
  delete(id: string): Promise<IServiceResponse<void>>;
  getStats(): Promise<IServiceResponse<any>>;
}

/**
 * Interface for vector search service operations
 */
export interface IVectorSearchService {
  storeDocumentWithVector(dto: StoreDocumentVectorDto): Promise<IServiceResponse<{ documentId: string; vectorId: string }>>;
  searchSimilarDocuments(dto: VectorQueryDto): Promise<IServiceResponse<DocumentResponseDto[]>>;
  deleteDocument(id: string): Promise<IServiceResponse<void>>;
  generateEmbedding(text: string): Promise<IServiceResponse<number[]>>;
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
  checkHealth(): Promise<IServiceResponse<{
    status: 'healthy' | 'unhealthy';
    services: {
      mongodb: boolean;
      pinecone: boolean;
    };
    uptime: number;
    timestamp: Date;
  }>>;
}