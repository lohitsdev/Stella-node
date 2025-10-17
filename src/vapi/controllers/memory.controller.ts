import type { Request, Response } from 'express';

import { HttpStatus } from '../../common/enums/app.enum.js';
import { memoryService } from '../services/memory.service.js';

export class MemoryController {
  /**
   * POST /api/vapi/memory/search
   * Tool endpoint for VAPI to search user's conversation memory
   */
  async searchMemory(req: Request, res: Response): Promise<void> {
    try {
      const { email, query, limit } = req.body;

      if (!email || !query) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Email and query are required',
          timestamp: new Date()
        });
        return;
      }

      const result = await memoryService.searchMemory({
        email,
        query,
        limit: limit || 5
      });

      res.status(result.success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR).json(result);
    } catch (error: any) {
      console.error('❌ Memory search error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to search memory',
        timestamp: new Date()
      });
    }
  }

  /**
   * POST /api/vapi/memory/recent
   * Get recent conversations for context injection
   */
  async getRecentMemory(req: Request, res: Response): Promise<void> {
    try {
      const { email, limit } = req.body;

      if (!email) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Email is required',
          timestamp: new Date()
        });
        return;
      }

      const result = await memoryService.getRecentConversations(email, limit || 3);

      if (result.success && result.data) {
        // Format for VAPI context
        const contextText = memoryService.formatMemoriesForContext(result.data);
        
        res.status(HttpStatus.OK).json({
          success: true,
          data: {
            memories: result.data,
            contextText
          },
          timestamp: new Date()
        });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(result);
      }
    } catch (error: any) {
      console.error('❌ Error getting recent memory:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get recent memory',
        timestamp: new Date()
      });
    }
  }

  /**
   * POST /api/vapi/tools/memory-recall
   * VAPI function/tool calling endpoint
   * This is called by VAPI during conversations
   */
  async memoryRecallTool(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 VAPI Tool Call: memory-recall');
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      const message = req.body.message || req.body;
      
      // Handle direct parameter format (flat body)
      if (req.body.email && req.body.query) {
        const email = req.body.email;
        const query = req.body.query;
        const limit = req.body.limit || 3;

        console.log(`🧠 Direct format - Searching memory for ${email}: "${query}"`);

        const memoryResult = await memoryService.searchMemory({
          email,
          query,
          limit
        });

        if (memoryResult.success && memoryResult.data) {
          const contextText = memoryService.formatMemoriesForContext(memoryResult.data);
          
          res.status(HttpStatus.OK).json({
            results: [{
              name: 'memory-recall',
              toolCallId: message.toolCallId || 'direct',
              result: JSON.stringify({
                success: true,
                memories: memoryResult.data,
                contextText,
                message: `Found ${memoryResult.data.length} relevant past conversations`
              })
            }]
          });
        } else {
          res.status(HttpStatus.OK).json({
            results: [{
              name: 'memory-recall',
              toolCallId: message.toolCallId || 'direct',
              result: JSON.stringify({
                success: true,
                message: 'No relevant past conversations found',
                contextText: 'This is our first conversation.',
                memories: []
              })
            }]
          });
        }
        return;
      }

      // Handle VAPI tool call format (nested structure)
      const toolCalls = message.toolWithToolCallList || message.toolCallList || [];

      if (!toolCalls || toolCalls.length === 0) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'No tool calls or direct parameters found in request',
          timestamp: new Date()
        });
        return;
      }

      const results = [];

      for (const toolCall of toolCalls) {
        const tool = toolCall.tool || toolCall;
        const params = tool.parameters || toolCall.toolCall?.parameters || {};
        
        const email = params.email || message.call?.metadata?.email;
        const query = params.query || params.question || '';

        if (!email || !query) {
          results.push({
            name: 'memory-recall',
            toolCallId: toolCall.id || toolCall.toolCall?.id,
            result: JSON.stringify({
              error: 'Missing email or query parameters',
              success: false
            })
          });
          continue;
        }

        console.log(`🧠 Tool call format - Searching memory for ${email}: "${query}"`);

        // Search memory
        const memoryResult = await memoryService.searchMemory({
          email,
          query,
          limit: params.limit || 3
        });

        if (memoryResult.success && memoryResult.data) {
          const contextText = memoryService.formatMemoriesForContext(memoryResult.data);
          
          results.push({
            name: 'memory-recall',
            toolCallId: toolCall.id || toolCall.toolCall?.id,
            result: JSON.stringify({
              success: true,
              memories: memoryResult.data,
              contextText,
              message: `Found ${memoryResult.data.length} relevant past conversations`
            })
          });
        } else {
          results.push({
            name: 'memory-recall',
            toolCallId: toolCall.id || toolCall.toolCall?.id,
            result: JSON.stringify({
              success: true,
              message: 'No relevant past conversations found',
              contextText: 'This is our first conversation.',
              memories: []
            })
          });
        }
      }

      res.status(HttpStatus.OK).json({ results });
    } catch (error: any) {
      console.error('❌ Memory recall tool error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        results: [{
          name: 'memory-recall',
          toolCallId: 'error',
          result: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        }]
      });
    }
  }
}

export const memoryController = new MemoryController();

