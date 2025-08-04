import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import 'reflect-metadata';
import { UserRole } from '../enums/auth.enum.js';

/**
 * DTO for user signup
 */
export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name!: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase())
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

/**
 * DTO for user login
 */
export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase())
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

/**
 * DTO for password reset request
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase())
  email!: string;
}

/**
 * DTO for password reset
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword!: string;
}