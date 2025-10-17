/**
 * Personalization controller for onboarding webhook
 */

import type { Request, Response } from 'express';

import { HttpStatus } from '../../common/enums/app.enum.js';
import type { PersonalizeRequestDto, PersonalizeResponseDto } from '../dto/personalize.dto.js';
import { personalizeService } from '../services/personalize.service.js';

export class PersonalizeController {
  /**
   * Process personalization webhook
   * POST /api/onboarding/personalize
   */
  async processPersonalization(req: Request, res: Response): Promise<void> {
    try {
      const personalizationData: PersonalizeRequestDto = req.body;

      // Validate required fields
      if (!personalizationData.sessionId) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!personalizationData.step7.userName) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'User name is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Process personalization with OpenAI
      const personalizedInsights = (await personalizeService.processPersonalization(personalizationData)) as any;

      // Generate AI analysis
      const aiAnalysis = await personalizeService.generateAIAnalysis(personalizationData, personalizedInsights);

      // Create response
      const response: PersonalizeResponseDto = {
        success: true,
        data: {
          userId: personalizationData.userId || undefined,
          sessionId: personalizationData.sessionId,
          timestamp: new Date().toISOString(),
          personalizedInsights,
          aiAnalysis
        },
        timestamp: new Date().toISOString()
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      console.error('Personalization processing error:', error);

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to process personalization',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Health check for personalization service
   * GET /api/onboarding/personalize/health
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          service: 'personalization',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          features: [
            'anxiety_level_analysis',
            'weekly_frequency_recommendations',
            'coping_tools_suggestions',
            'emotional_score_calculation',
            'reflection_prompts',
            'personal_goal_setting',
            'ai_insights_generation'
          ]
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Personalization health check error:', error);

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Export singleton instance
export const personalizeController = new PersonalizeController();
