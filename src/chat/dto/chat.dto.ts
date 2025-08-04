import { IsString, IsNotEmpty, IsNumber, IsEmail, IsUUID, IsOptional, IsObject } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import 'reflect-metadata';

/**
 * DTO for chat end webhook
 */
export class ChatEndWebhookDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase())
  email!: string;

  @IsString()
  @IsNotEmpty()
  chat_id!: string;

  @IsNumber()
  @Type(() => Number)
  timestamp!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for chat session creation
 */
export class CreateChatSessionDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase())
  email!: string;

  @IsString()
  @IsNotEmpty()
  chat_id!: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for chat message
 */
export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  chat_id!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsNotEmpty()
  sender!: 'user' | 'assistant';

  @IsNumber()
  @Type(() => Number)
  timestamp!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}