import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { mongodb } from '../../database/mongodb.js';
import { configService } from '../../services/config.service.js';
import { validationService } from '../../services/validation.service.js';
import type { IUser, ICreateUser, IAuthTokens, IJWTPayload, IAuthService } from '../interfaces/auth.interface.js';
import type { IServiceResponse } from '../../common/interfaces/service.interface.js';
import { SignupDto, LoginDto } from '../dto/signup.dto.js';
import { UserRole, AuthStatus, TokenType, AuthProvider } from '../enums/auth.enum.js';
import { HttpStatus } from '../../common/enums/app.enum.js';

export class AuthService implements IAuthService {
  private readonly JWT_SECRET: string = process.env.JWT_SECRET || 'stella-dev-secret-key';
  private readonly JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '24h';
  private readonly REFRESH_TOKEN_EXPIRES_IN: string | number = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  /**
   * User signup
   */
  async signup(signupData: SignupDto): Promise<IServiceResponse<{ user: Omit<IUser, 'password'>; tokens: IAuthTokens }>> {
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
      await collection.updateOne(
        { _id: result.insertedId },
        { $push: { refreshTokens: tokens.refreshToken } as any }
      );

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
   * User login
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

        // Lock account after 5 failed attempts
        if (loginAttempts >= 5) {
          updateData.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await collection.updateOne(
          { _id: user._id },
          { $set: updateData }
        );

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
            lockUntil: ""
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
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<IServiceResponse<IAuthTokens>> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as IJWTPayload;
      
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
   * Logout user
   */
  async logout(userId: string, refreshToken: string): Promise<IServiceResponse<void>> {
    try {
      const collection = mongodb.getCollection<IUser>('users');
      
      await collection.updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { refreshTokens: refreshToken } as any }
      );

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
   * Validate JWT token
   */
  async validateToken(token: string): Promise<IServiceResponse<IJWTPayload>> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as IJWTPayload;
      
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
   * Generate JWT tokens
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
      expiresIn: this.JWT_EXPIRES_IN as any
    };
    const refreshOptions: jwt.SignOptions = { 
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN as any
    };

    const accessToken = jwt.sign(accessPayload, this.JWT_SECRET, accessOptions);
    const refreshToken = jwt.sign(refreshPayload, this.JWT_SECRET, refreshOptions);

    return {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      tokenType: 'Bearer'
    };
  }

  // Placeholder methods to satisfy interface
  async forgotPassword(email: string): Promise<void> {
    // TODO: Implement forgot password logic
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // TODO: Implement reset password logic
  }

  async verifyEmail(token: string): Promise<void> {
    // TODO: Implement email verification logic
  }
}

export const authService = new AuthService();