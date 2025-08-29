import { mongodb } from '../../database/mongodb.js';
import type { IUser } from '../interfaces/auth.interface.js';
import type { IServiceResponse } from '../../common/interfaces/service.interface.js';

export interface IUserProfile {
  name: string;
  email: string;
  role: string;
  status: string;
  provider: string;
  emailVerified: boolean;
  lastLogin?: Date;
  profile?: {
    avatar?: string;
    bio?: string;
    phone?: string;
    timezone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class ProfileService {
  /**
   * Get user profile by email
   */
  async getProfileByEmail(email: string): Promise<IServiceResponse<IUserProfile>> {
    try {
      const collection = mongodb.getCollection<IUser>('users');
      
      // Use projection to exclude sensitive fields
      const user = await collection.findOne(
        { email },
        { 
          projection: {
            password: 0,
            refreshTokens: 0,
            emailVerificationToken: 0,
            passwordResetToken: 0,
            passwordResetExpires: 0,
            loginAttempts: 0,
            lockUntil: 0,
            _id: 0
          }
        }
      );

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date()
        };
      }

      return {
        success: true,
        data: user as IUserProfile,
        message: 'Profile retrieved successfully',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        error: 'Failed to retrieve profile',
        timestamp: new Date()
      };
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService();
