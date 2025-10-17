import type { Document, ObjectId } from 'mongodb';

import type { UserRole, AuthStatus, TokenType, AuthProvider } from '../enums/auth.enum.js';

/**
 * Interface for user entity
 */
export interface IUser extends Document {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: AuthStatus;
  provider: AuthProvider;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    avatar?: string;
    bio?: string;
    phone?: string;
    timezone?: string;
  };
}

/**
 * Interface for user creation (without auto-generated fields)
 */
export interface ICreateUser {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  provider?: AuthProvider;
}

/**
 * Interface for user update
 */
export interface IUpdateUser {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: AuthStatus;
  emailVerified?: boolean;
  profile?: {
    avatar?: string;
    bio?: string;
    phone?: string;
    timezone?: string;
  };
}

/**
 * Interface for authentication tokens
 */
export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Interface for JWT payload
 */
export interface IJWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenType: TokenType;
  iat?: number;
  exp?: number;
}

/**
 * Interface for authentication service operations
 */
export interface IAuthService {
  signup(userData: any): Promise<any>;
  login(loginData: any): Promise<any>;
  refreshToken(refreshToken: string): Promise<any>;
  logout(userId: string, refreshToken: string): Promise<any>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  validateToken(token: string): Promise<any>;
}

/**
 * Interface for password service operations
 */
export interface IPasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
  generateResetToken(): string;
  validateResetToken(token: string, user: IUser): boolean;
}
