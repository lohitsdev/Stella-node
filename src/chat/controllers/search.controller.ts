import type { Request, Response } from 'express';
import { searchService } from '../services/search.service.js';

export class SearchController {

  /**
   * Search conversations by semantic similarity
   * 
   * @swagger
   * /api/chat/search:
   *   get:
   *     summary: Search conversation summaries by semantic similarity
   *     tags: [Chat Search]
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Search query text
   *       - in: query
   *         name: email
   *         schema:
   *           type: string
   *         description: Filter by user email (optional)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 20
   *           default: 5
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: Search results
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
   *                     query:
   *                       type: string
   *                     results:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           chat_id:
   *                             type: string
   *                           email:
   *                             type: string
   *                           summary:
   *                             type: string
   *                           score:
   *                             type: number
   *                           created_at:
   *                             type: string
   *                     total_found:
   *                       type: integer
   *                     search_time_ms:
   *                       type: integer
   *       400:
   *         description: Bad request - missing query
   *       500:
   *         description: Internal server error
   */
  async searchConversations(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, email, limit = 5 } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required',
          timestamp: new Date()
        });
        return;
      }

      const topK = Math.min(Math.max(parseInt(limit as string) || 5, 1), 20);
      
      const result = await searchService.searchConversations(
        query, 
        email as string | undefined, 
        topK
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error: any) {
      console.error('❌ Search endpoint error:', error);
      res.status(500).json({
        success: false,
        error: `Search failed: ${error.message}`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get all conversations for a specific user
   * 
   * @swagger
   * /api/chat/search/user/{email}:
   *   get:
   *     summary: Get all conversations for a specific user
   *     tags: [Chat Search]
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *         description: User email
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *         description: Optional search query within user's conversations
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: User conversations
   *       400:
   *         description: Bad request - invalid email
   *       500:
   *         description: Internal server error
   */
  async getUserConversations(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;
      const { q: query, limit = 10 } = req.query;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const topK = Math.min(Math.max(parseInt(limit as string) || 10, 1), 50);
      
      const result = await searchService.searchUserConversations(
        email, 
        query as string | undefined, 
        topK
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error: any) {
      console.error('❌ User search endpoint error:', error);
      res.status(500).json({
        success: false,
        error: `User search failed: ${error.message}`,
        timestamp: new Date()
      });
    }
  }
}

export const searchController = new SearchController();