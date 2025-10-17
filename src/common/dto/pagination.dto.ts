import { Type, Transform } from 'class-transformer';
import { IsOptional, IsNumber, IsString, IsEnum, Min, Max } from 'class-validator';

import { SortOrder } from '../enums/app.enum.js';

/**
 * DTO for pagination parameters
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

/**
 * DTO for search parameters
 */
export class SearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  query?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  filter?: string;
}
