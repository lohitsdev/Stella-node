import type { Request, Response } from 'express';
import { chatService } from '../services/chat.service.js';
import { HttpStatus } from '../../common/enums/app.enum.js';
import type { ChatEndWebhookDto, CreateChatSessionDto, ChatMessageDto } from '../dto/chat.dto.js';

/**
 * Chat controller for handling chat-related operations
 */
export class ChatController {

  /**
   * @swagger
   * /api/chat/end:
   *   post:
   *     summary: Webhook endpoint for ending chat sessions
   *     tags: [Chat]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "bunty1@gmail.com"
   *               chat_id:
   *                 type: string
   *                 example: "1cfe5332-8357-453c-adff-fdd42c0cb89d"
   *               timestamp:
   *                 type: number
   *                 example: 1754139871
   *               metadata:
   *                 type: object
   *                 additionalProperties: true
   *             required:
   *               - email
   *               - chat_id
   *               - timestamp
   *     responses:
   *       200:
   *         description: Chat session ended successfully
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
   *                         chat_id:
   *                           type: string
   *                         email:
   *                           type: string
   *                         status:
   *                           type: string
   *                         started_at:
   *                           type: string
   *                           format: date-time
   *                         ended_at:
   *                           type: string
   *                           format: date-time
   *                         duration:
   *                           type: number
   *       400:
   *         description: Validation error
   *       500:
   *         description: Internal server error
   */
  async endChatWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookData: ChatEndWebhookDto = req.body;

      console.log('📞 Received chat end webhook:', {
        email: webhookData.email,
        chat_id: webhookData.chat_id,
        timestamp: webhookData.timestamp,
        readable_time: new Date(webhookData.timestamp * 1000).toISOString()
      });

      // Validate chat_id - reject 'unknown' or invalid UUIDs
      if (!webhookData.chat_id || 
          webhookData.chat_id === 'unknown' || 
          webhookData.chat_id.length < 10) {
        console.warn(`❌ Rejecting webhook with invalid chat_id: "${webhookData.chat_id}"`);
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Invalid chat_id provided',
          timestamp: new Date()
        });
        return;
      }

      const result = await chatService.processEndWebhook(webhookData);

      if (!result.success) {
        let statusCode = HttpStatus.BAD_REQUEST;
        
        if (result.error?.includes('Internal server error')) {
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        res.status(statusCode).json(result);
        return;
      }

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error('Chat end webhook controller error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/chat/sessions/{email}:
   *   get:
   *     summary: Get all chat sessions for a user
   *     tags: [Chat]
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *           format: email
   *         description: User email
   *     responses:
   *       200:
   *         description: User chat sessions retrieved successfully
   *       404:
   *         description: No sessions found
   *       500:
   *         description: Internal server error
   */
  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Email parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const sessions = await chatService.getUserSessions(email);

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          sessions,
          count: sessions.length
        },
        message: 'User sessions retrieved successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get user sessions error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/chat/chatids/{email}:
   *   get:
   *     summary: Get only chat IDs for a user (lightweight)
   *     tags: [Chat]
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *           format: email
   *         description: User email
   *     responses:
   *       200:
   *         description: Chat IDs retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     chats:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           chat_id:
   *                             type: string
   *                           created_at:
   *                             type: string
   *                             format: date-time
   *                           started_at:
   *                             type: string
   *                             format: date-time
   *                     count:
   *                       type: integer
   *                 message:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *       400:
   *         description: Validation error
   *       500:
   *         description: Internal server error
   */
  async getUserChatIds(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Email parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const chatData = await chatService.getUserChatIdsWithTimestamps(email);

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          chats: chatData,
          count: chatData.length
        },
        message: 'Chat IDs with timestamps retrieved successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get user chat IDs error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/chat/session/{chatId}:
   *   get:
   *     summary: Get a specific chat session by ID
   *     tags: [Chat]
   *     parameters:
   *       - in: path
   *         name: chatId
   *         required: true
   *         schema:
   *           type: string
   *         description: Chat session ID
   *     responses:
   *       200:
   *         description: Chat session retrieved successfully
   *       404:
   *         description: Session not found
   *       500:
   *         description: Internal server error
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;

      if (!chatId) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Chat ID parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const session = await chatService.getSession(chatId);

      if (!session) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: 'Chat session not found',
          timestamp: new Date()
        });
        return;
      }

      res.status(HttpStatus.OK).json({
        success: true,
        data: session,
        message: 'Chat session retrieved successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }
}

export const chatController = new ChatController();