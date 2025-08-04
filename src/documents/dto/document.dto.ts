import { IsString, IsDate, IsOptional, IsObject, IsNotEmpty, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import 'reflect-metadata';

/**
 * DTO for creating a new document
 */
export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Message cannot be empty' })
  message!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => value || new Date())
  @IsOptional()
  timestamp?: Date;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a document
 */
export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Message cannot be empty' })
  message?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  timestamp?: Date;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for document response
 */
export class DocumentResponseDto {
  @IsString()
  id!: string;

  @IsString()
  message!: string;

  @IsString()
  type!: string;

  @IsDate()
  @Type(() => Date)
  timestamp!: Date;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}