import type { Request, Response } from 'express';
import { summaryService } from '../services/summary.service.js';
import { HttpStatus } from '../../common/enums/app.enum.js';

/**
 * Summary controller for handling conversation summary operations
 */
export class SummaryController {

  /**
   * @swagger
   * /api/chat/summary/{chatId}:
   *   get:
   *     summary: Get conversation summary by chat ID
   *     tags: [Summaries]
   *     parameters:
   *       - in: path
   *         name: chatId
   *         required: true
   *         schema:
   *           type: string
   *         description: Chat session ID
   *     responses:
   *       200:
   *         description: Summary retrieved successfully
   *       404:
   *         description: Summary not found
   *       500:
   *         description: Internal server error
   */
  async getSummary(req: Request, res: Response): Promise<void> {
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

      const summary = await summaryService.getSummary(chatId);

      if (!summary) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: 'Summary not found for this chat',
          timestamp: new Date()
        });
        return;
      }

      res.status(HttpStatus.OK).json({
        success: true,
        data: summary,
        message: 'Summary retrieved successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get summary error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/chat/summaries/{email}:
   *   get:
   *     summary: Get all conversation summaries for a user
   *     tags: [Summaries]
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
   *         description: User summaries retrieved successfully
   *       404:
   *         description: No summaries found
   *       500:
   *         description: Internal server error
   */
  async getUserSummaries(req: Request, res: Response): Promise<void> {
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

      const summaries = await summaryService.getUserSummaries(email);

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          summaries,
          count: summaries.length
        },
        message: 'User summaries retrieved successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get user summaries error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }
}

export const summaryController = new SummaryController();