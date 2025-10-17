import type { Request, Response } from 'express';

import { HttpStatus } from '../../common/enums/app.enum.js';
import { vapiService } from '../services/vapi.service.js';

export class VAPIController {
  /**
   * POST /api/vapi/webhook
   * Main webhook endpoint for VAPI to send real-time messages
   * This is the GLOBAL webhook URL configured in VAPI Dashboard
   */
  async webhook(req: Request, res: Response): Promise<void> {
    try {
      const message = req.body.message || req.body;
      
      console.log(`📞 VAPI Webhook received: ${message.type || 'unknown'}`);

      if (!message.type) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Invalid message format - missing type',
          timestamp: new Date()
        });
        return;
      }

      // Extract email from message metadata (passed from frontend)
      const email = message.call?.metadata?.email || 
                    message.assistant?.metadata?.email ||
                    message.customer?.email;

      // Process the webhook message
      const result = await vapiService.processWebhookMessage(message, email);

      res.status(result.success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR).json(result);
    } catch (error: any) {
      console.error('❌ VAPI webhook error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error processing webhook',
        timestamp: new Date()
      });
    }
  }

  /**
   * POST /api/vapi/session/start
   * Start a new VAPI session
   */
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const { email, userId, sessionId, phoneNumber, metadata } = req.body;

      if (!email) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Email is required',
          timestamp: new Date()
        });
        return;
      }

      if (!sessionId) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date()
        });
        return;
      }

      const result = await vapiService.startSession(
        {
          email,
          userId,
          phoneNumber,
          metadata
        },
        sessionId
      );

      res.status(result.success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR).json(result);
    } catch (error: any) {
      console.error('❌ Error starting VAPI session:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error starting session',
        timestamp: new Date()
      });
    }
  }

  /**
   * GET /api/vapi/session/:sessionId
   * Get session details
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date()
        });
        return;
      }

      const result = await vapiService.getSession(sessionId);

      res.status(result.success ? HttpStatus.OK : HttpStatus.NOT_FOUND).json(result);
    } catch (error: any) {
      console.error('❌ Error getting session:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error getting session',
        timestamp: new Date()
      });
    }
  }

  /**
   * GET /api/vapi/sessions/:email
   * Get all sessions for a user
   */
  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!email) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Email is required',
          timestamp: new Date()
        });
        return;
      }

      const result = await vapiService.getUserSessions(email, limit);

      res.status(result.success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR).json(result);
    } catch (error: any) {
      console.error('❌ Error getting user sessions:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error getting sessions',
        timestamp: new Date()
      });
    }
  }

  /**
   * GET /api/vapi/health
   * Health check
   */
  async health(_req: Request, res: Response): Promise<void> {
    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        service: 'VAPI Integration',
        status: 'healthy',
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }
}

export const vapiController = new VAPIController();

