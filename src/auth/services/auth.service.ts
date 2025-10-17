import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

import { HttpStatus } from '../../common/enums/app.enum.js';
import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import { mongodb } from '../../database/mongodb.js';
import { configService } from '../../services/config.service.js';
import { validationService } from '../../services/validation.service.js';
import { SignupDto, LoginDto } from '../dto/signup.dto.js';
import { UserRole, AuthStatus, TokenType, AuthProvider } from '../enums/auth.enum.js';
import type { IUser, ICreateUser, IAuthTokens, IJWTPayload, IAuthService } from '../interfaces/auth.interface.js';

export class AuthService implements IAuthService {
  private readonly authConfig = configService.get('auth');

  /**
   * Register a new user account
   * @param signupData - User registration data including email, password, and name
   * @returns Promise resolving to service response with user data and auth tokens
   */
  async signup(
    signupData: SignupDto
  ): Promise<IServiceResponse<{ user: Omit<IUser, 'password'>; tokens: IAuthTokens }>> {
    try {
      // Validate DTO
      const validation = await validationService.validateDto(signupData, SignupDto);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error,
          timestamp: new Date()
        };
      }

      const userData = validation.data!;
      const collection = mongodb.getCollection<IUser>('users');

      // Check if user already exists
      const existingUser = await collection.findOne({ email: userData.email });
      if (existingUser) {
        return {
          success: false,
          error: 'User already exists with this email',
          timestamp: new Date()
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user object
      const newUser: ICreateUser = {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role || UserRole.USER,
        provider: AuthProvider.LOCAL
      };

      // Create full user document
      const userDocument: Omit<IUser, '_id'> = {
        ...newUser,
        status: AuthStatus.VERIFIED, // Auto-verify for now
        emailVerified: true,
        loginAttempts: 0,
        refreshTokens: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save user to database
      const result = await collection.insertOne(userDocument as IUser);
      const userId = result.insertedId.toString();

      // Generate tokens
      const tokens = await this.generateTokens(userId, userData.email, newUser.role || UserRole.USER);

      // Update user with refresh token
      await collection.updateOne({ _id: result.insertedId }, { $push: { refreshTokens: tokens.refreshToken } as any });

      // Return user without password
      const { password, ...userResponse } = userDocument;
      const responseUser = {
        ...userResponse,
        _id: result.insertedId
      };

      return {
        success: true,
        data: {
          user: responseUser,
          tokens
        },
        message: 'User created successfully',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: 'Internal server error during signup',
        timestamp: new Date()
      };
    }
  }

  /**
   * Authenticate user and generate access tokens
   * @param loginData - User login credentials including email and password
   * @returns Promise resolving to service response with user data and auth tokens
   */
  async login(loginData: LoginDto): Promise<IServiceResponse<{ user: Omit<IUser, 'password'>; tokens: IAuthTokens }>> {
    try {
      // Validate DTO
      const validation = await validationService.validateDto(loginData, LoginDto);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error,
          timestamp: new Date()
        };
      }

      const { email, password } = validation.data!;
      const collection = mongodb.getCollection<IUser>('users');

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
          timestamp: new Date()
        };
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > new Date()) {
        return {
          success: false,
          error: 'Account is temporarily locked. Please try again later.',
          timestamp: new Date()
        };
      }

      // Check if account is suspended or blocked
      if (user.status === AuthStatus.SUSPENDED) {
        return {
          success: false,
          error: 'Account is suspended. Please contact support.',
          timestamp: new Date()
        };
      }

      if (user.status === AuthStatus.BLOCKED) {
        return {
          success: false,
          error: 'Account is blocked. Please contact support.',
          timestamp: new Date()
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Increment login attempts
        const loginAttempts = (user.loginAttempts || 0) + 1;
        const updateData: any = {
          loginAttempts,
          updatedAt: new Date()
        };

        // Lock account after max failed attempts
        if (loginAttempts >= this.authConfig.maxLoginAttempts) {
          updateData.lockUntil = new Date(Date.now() + this.authConfig.lockoutDurationMs);
        }

        await collection.updateOne({ _id: user._id }, { $set: updateData });

        return {
          success: false,
          error: 'Invalid email or password',
          timestamp: new Date()
        };
      }

      // Generate tokens
      const tokens = await this.generateTokens(user._id!.toString(), user.email, user.role);

      // Update user login info
      await collection.updateOne(
        { _id: user._id },
        {
          $set: {
            lastLogin: new Date(),
            loginAttempts: 0,
            updatedAt: new Date()
          },
          $unset: {
            lockUntil: ''
          },
          $push: { refreshTokens: tokens.refreshToken } as any
        }
      );

      // Return user without password
      const { password: _, ...userResponse } = user;

      return {
        success: true,
        data: {
          user: userResponse,
          tokens
        },
        message: 'Login successful',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Internal server error during login',
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate new access and refresh tokens using a valid refresh token
   * @param refreshToken - Valid refresh token to be exchanged for new tokens
   * @returns Promise resolving to service response with new auth tokens
   */
  async refreshToken(refreshToken: string): Promise<IServiceResponse<IAuthTokens>> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.authConfig.jwtSecret) as IJWTPayload;

      if (decoded.tokenType !== TokenType.REFRESH) {
        return {
          success: false,
          error: 'Invalid token type',
          timestamp: new Date()
        };
      }

      const collection = mongodb.getCollection<IUser>('users');
      const user = await collection.findOne({
        _id: new ObjectId(decoded.userId),
        refreshTokens: refreshToken
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid refresh token',
          timestamp: new Date()
        };
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user._id!.toString(), user.email, user.role);

      // Update refresh tokens in database
      await collection.updateOne(
        { _id: user._id },
        {
          $pull: { refreshTokens: refreshToken } as any,
          $push: { refreshTokens: tokens.refreshToken } as any
        }
      );

      return {
        success: true,
        data: tokens,
        message: 'Token refreshed successfully',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid or expired refresh token',
        timestamp: new Date()
      };
    }
  }

  /**
   * Invalidate user session by removing refresh token
   * @param userId - The user ID to logout
   * @param refreshToken - The refresh token to invalidate
   * @returns Promise resolving to service response indicating logout success
   */
  async logout(userId: string, refreshToken: string): Promise<IServiceResponse<void>> {
    try {
      const collection = mongodb.getCollection<IUser>('users');

      await collection.updateOne({ _id: new ObjectId(userId) }, { $pull: { refreshTokens: refreshToken } as any });

      return {
        success: true,
        message: 'Logout successful',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error during logout',
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate JWT access token and extract payload
   * @param token - JWT access token to validate
   * @returns Promise resolving to service response with token payload
   */
  async validateToken(token: string): Promise<IServiceResponse<IJWTPayload>> {
    try {
      const decoded = jwt.verify(token, this.authConfig.jwtSecret) as IJWTPayload;

      if (decoded.tokenType !== TokenType.ACCESS) {
        return {
          success: false,
          error: 'Invalid token type',
          timestamp: new Date()
        };
      }

      return {
        success: true,
        data: decoded,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate JWT access and refresh tokens for a user
   * @param userId - The user ID
   * @param email - The user email
   * @param role - The user role
   * @returns Promise resolving to auth tokens object with access and refresh tokens
   */
  private async generateTokens(userId: string, email: string, role: UserRole): Promise<IAuthTokens> {
    const accessPayload: IJWTPayload = {
      userId,
      email,
      role,
      tokenType: TokenType.ACCESS
    };

    const refreshPayload: IJWTPayload = {
      userId,
      email,
      role,
      tokenType: TokenType.REFRESH
    };

    const accessOptions: jwt.SignOptions = {
      expiresIn: this.authConfig.jwtExpiresIn as any
    };
    const refreshOptions: jwt.SignOptions = {
      expiresIn: this.authConfig.refreshTokenExpiresIn as any
    };

    const accessToken = jwt.sign(accessPayload, this.authConfig.jwtSecret, accessOptions);
    const refreshToken = jwt.sign(refreshPayload, this.authConfig.jwtSecret, refreshOptions);

    return {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      tokenType: 'Bearer'
    };
  }

  /**
   * Send password reset email to user
   * @param email - User email address for password reset
   */
  async forgotPassword(email: string): Promise<void> {
    // TODO: Implement forgot password logic with email sending
  }

  /**
   * Reset user password using valid reset token
   * @param token - Password reset token
   * @param newPassword - New password to set
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // TODO: Implement reset password logic with token validation
  }

  /**
   * Verify user email address using verification token
   * @param token - Email verification token
   */
  async verifyEmail(token: string): Promise<void> {
    // TODO: Implement email verification logic with token validation
  }
}

export const authService = new AuthService();
