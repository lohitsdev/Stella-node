import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { HttpStatus } from '../../common/enums/app.enum.js';
import type { SignupDto, LoginDto } from '../dto/signup.dto.js';

/**
 * Authentication controller with proper error codes for frontend
 */
export class AuthController {

  /**
   * @swagger
   * /api/auth/signup:
   *   post:
   *     summary: Register a new user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SignupDto'
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ServiceResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       properties:
   *                         user:
   *                           type: object
   *                           properties:
   *                             _id:
   *                               type: string
   *                             name:
   *                               type: string
   *                             email:
   *                               type: string
   *                             role:
   *                               type: string
   *                         tokens:
   *                           type: object
   *                           properties:
   *                             accessToken:
   *                               type: string
   *                             refreshToken:
   *                               type: string
   *                             expiresIn:
   *                               type: number
   *                             tokenType:
   *                               type: string
   *       400:
   *         description: Validation error or user already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ServiceResponse'
   *             examples:
   *               validation_error:
   *                 summary: Validation Error
   *                 value:
   *                   success: false
   *                   error: "Validation failed: email must be a valid email"
   *                   timestamp: "2024-01-01T00:00:00.000Z"
   *               user_exists:
   *                 summary: User Already Exists
   *                 value:
   *                   success: false
   *                   error: "User already exists with this email"
   *                   timestamp: "2024-01-01T00:00:00.000Z"
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ServiceResponse'
   */
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const signupData: SignupDto = req.body;

      const result = await authService.signup(signupData);

      if (!result.success) {
        // Determine appropriate status code based on error
        let statusCode = HttpStatus.BAD_REQUEST;
        
        if (result.error?.includes('Internal server error')) {
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        } else if (result.error?.includes('already exists')) {
          statusCode = HttpStatus.CONFLICT;
        }

        res.status(statusCode).json(result);
        return;
      }

      res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      console.error('Signup controller error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginDto'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ServiceResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       properties:
   *                         user:
   *                           type: object
   *                           properties:
   *                             _id:
   *                               type: string
   *                             name:
   *                               type: string
   *                             email:
   *                               type: string
   *                             role:
   *                               type: string
   *                         tokens:
   *                           type: object
   *                           properties:
   *                             accessToken:
   *                               type: string
   *                             refreshToken:
   *                               type: string
   *                             expiresIn:
   *                               type: number
   *                             tokenType:
   *                               type: string
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ServiceResponse'
   *             examples:
   *               validation_error:
   *                 summary: Validation Error
   *                 value:
   *                   success: false
   *                   error: "Validation failed: email must be a valid email"
   *                   timestamp: "2024-01-01T00:00:00.000Z"
   *       401:
   *         description: Authentication failed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ServiceResponse'
   *             examples:
   *               invalid_credentials:
   *                 summary: Invalid Credentials
   *                 value:
   *                   success: false
   *                   error: "Invalid email or password"
   *                   timestamp: "2024-01-01T00:00:00.000Z"
   *               account_locked:
   *                 summary: Account Locked
   *                 value:
   *                   success: false
   *                   error: "Account is temporarily locked. Please try again later."
   *                   timestamp: "2024-01-01T00:00:00.000Z"
   *       403:
   *         description: Account suspended or blocked
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ServiceResponse'
   *             examples:
   *               account_suspended:
   *                 summary: Account Suspended
   *                 value:
   *                   success: false
   *                   error: "Account is suspended. Please contact support."
   *                   timestamp: "2024-01-01T00:00:00.000Z"
   *       500:
   *         description: Internal server error
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginDto = req.body;

      const result = await authService.login(loginData);

      if (!result.success) {
        // Determine appropriate status code based on error
        let statusCode = HttpStatus.BAD_REQUEST;
        
        if (result.error?.includes('Internal server error')) {
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        } else if (result.error?.includes('Invalid email or password')) {
          statusCode = HttpStatus.UNAUTHORIZED;
        } else if (result.error?.includes('locked') || result.error?.includes('suspended') || result.error?.includes('blocked')) {
          statusCode = result.error.includes('suspended') || result.error.includes('blocked') 
            ? HttpStatus.FORBIDDEN 
            : HttpStatus.UNAUTHORIZED;
        }

        res.status(statusCode).json(result);
        return;
      }

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error('Login controller error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               refreshToken:
   *                 type: string
   *                 description: Refresh token
   *             required:
   *               - refreshToken
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *       401:
   *         description: Invalid refresh token
   *       500:
   *         description: Internal server error
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Refresh token is required',
          timestamp: new Date()
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      if (!result.success) {
        res.status(HttpStatus.UNAUTHORIZED).json(result);
        return;
      }

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error('Refresh token controller error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Logout user
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               refreshToken:
   *                 type: string
   *                 description: Refresh token to invalidate
   *             required:
   *               - refreshToken
   *     responses:
   *       200:
   *         description: Logout successful
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = (req as any).user?.userId; // From auth middleware

      if (!refreshToken) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Refresh token is required',
          timestamp: new Date()
        });
        return;
      }

      if (!userId) {
        res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          error: 'User not authenticated',
          timestamp: new Date()
        });
        return;
      }

      const result = await authService.logout(userId, refreshToken);

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error('Logout controller error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }
}

export const authController = new AuthController();