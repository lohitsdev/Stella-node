import { IsString, IsArray, IsNumber, IsOptional, IsObject, IsNotEmpty, ArrayMinSize, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import 'reflect-metadata';

/**
 * DTO for creating a vector entry
 */
export class CreateVectorDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Values array cannot be empty' })
  @IsNumber({}, { each: true, message: 'Each value must be a number' })
  values!: number[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for vector query
 */
export class VectorQueryDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Query vector cannot be empty' })
  @IsNumber({}, { each: true, message: 'Each value must be a number' })
  vector!: number[];

  @IsNumber()
  @Min(1, { message: 'topK must be at least 1' })
  @Max(100, { message: 'topK cannot exceed 100' })
  @Type(() => Number)
  topK!: number;

  @IsOptional()
  includeMetadata?: boolean;
}

/**
 * DTO for vector search results
 */
export class VectorSearchResultDto {
  @IsString()
  id!: string;

  @IsNumber()
  score!: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for storing document with vector
 */
export class StoreDocumentVectorDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  message!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Embedding vector cannot be empty' })
  @IsNumber({}, { each: true, message: 'Each embedding value must be a number' })
  embedding!: number[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}