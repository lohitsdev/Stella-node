import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { HttpStatus } from '../../common/enums/app.enum.js';

/**
 * Extended Request interface to include user data
 */
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Authentication middleware to protect routes
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: 'Access token is required',
        timestamp: new Date()
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const result = await authService.validateToken(token);

    if (!result.success) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date()
      });
      return;
    }

    // Add user data to request object
    req.user = {
      userId: result.data!.userId,
      email: result.data!.email,
      role: result.data!.role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Authentication error',
      timestamp: new Date()
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date()
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date()
      });
      return;
    }

    next();
  };
};

export type { AuthenticatedRequest };