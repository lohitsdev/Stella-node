import { Transform, Type } from 'class-transformer';
import { IsString, IsBoolean, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';

export class UpdateEnvironmentDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
}

export class EnvironmentVariableDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  isSecret!: boolean;

  @IsEnum(['database', 'api', 'app', 'security', 'other'])
  category!: 'database' | 'api' | 'app' | 'security' | 'other';
}

export class BulkUpdateEnvironmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateEnvironmentDto)
  variables!: UpdateEnvironmentDto[];
}

export class SystemStatusDto {
  @IsString()
  status!: string;

  @IsString()
  environment!: string;

  @IsString()
  version!: string;

  @Transform(({ value }) => new Date(value))
  startTime!: Date;

  @Transform(({ value }) => parseFloat(value))
  uptime!: number;
}
