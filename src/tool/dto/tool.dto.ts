import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for tool query request
 */
export class ToolQueryDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for tool response
 */
export class ToolResponseDto {
  query!: string;
  email!: string;
  result?: any;
  processed_at!: Date;
  metadata?: Record<string, any>;
}
