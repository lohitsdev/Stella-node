import type { Request, Response } from 'express';

import { validationService } from '../../services/validation.service.js';
import { ToolQueryDto } from '../dto/tool.dto.js';
import { toolService } from '../services/tool.service.js';

/**
 * Controller for tool endpoints
 */
export class ToolController {
  /**
   * @swagger
   * /api/tool:
   *   post:
   *     summary: Process a tool query
   *     tags: [Tool]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - query
   *               - email
   *             properties:
   *               query:
   *                 type: string
   *                 description: The query to process
   *                 example: "Find all conversations about passwords"
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address
   *                 example: "user@example.com"
   *               metadata:
   *                 type: object
   *                 description: Optional metadata
   *     responses:
   *       200:
   *         description: Query processed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                 message:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *       400:
   *         description: Invalid request data
   *       500:
   *         description: Internal server error
   */
  public async processQuery(req: Request, res: Response): Promise<void> {
    try {
      console.log(`🔧 POST /api/tool - Processing query from ${req.ip}`);

      // Validate request body
      const validationResult = await validationService.validateDto(req.body, ToolQueryDto);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: validationResult.error || 'Validation failed',
          timestamp: new Date()
        });
        return;
      }

      const queryData = validationResult.data as ToolQueryDto;

      // Process the query
      const result = await toolService.processQuery(queryData);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Tool query processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during tool query processing',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/tool/history/{email}:
   *   get:
   *     summary: Get query history for a user
   *     tags: [Tool]
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *           format: email
   *         description: User's email address
   *     responses:
   *       200:
   *         description: Query history retrieved successfully
   *       400:
   *         description: Invalid email format
   *       500:
   *         description: Internal server error
   */
  public async getQueryHistory(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;
      console.log(`📋 GET /api/tool/history/${email}`);

      if (!email?.includes('@')) {
        res.status(400).json({
          success: false,
          error: 'Valid email address is required',
          timestamp: new Date()
        });
        return;
      }

      const result = await toolService.getQueryHistory(email);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Query history error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching query history',
        timestamp: new Date()
      });
    }
  }

  /**
   * @swagger
   * /api/tool/result/{queryId}:
   *   get:
   *     summary: Get a specific query result
   *     tags: [Tool]
   *     parameters:
   *       - in: path
   *         name: queryId
   *         required: true
   *         schema:
   *           type: string
   *         description: Query ID
   *     responses:
   *       200:
   *         description: Query result retrieved successfully
   *       400:
   *         description: Invalid query ID
   *       404:
   *         description: Query not found
   *       500:
   *         description: Internal server error
   */
  public async getQueryResult(req: Request, res: Response): Promise<void> {
    try {
      const { queryId } = req.params;
      console.log(`🔍 GET /api/tool/result/${queryId}`);

      if (!queryId) {
        res.status(400).json({
          success: false,
          error: 'Query ID is required',
          timestamp: new Date()
        });
        return;
      }

      const result = await toolService.getQueryResult(queryId);

      if (!result.success) {
        const statusCode = result.error?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Query result error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching query result',
        timestamp: new Date()
      });
    }
  }
}

// Export singleton instance
export const toolController = new ToolController();
