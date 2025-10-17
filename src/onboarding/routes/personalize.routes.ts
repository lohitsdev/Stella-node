/**
 * Personalization routes for onboarding webhook
 */

import express from 'express';

import { personalizeController } from '../controllers/personalize.controller.js';

const router = express.Router();

/**
 * Personalization webhook endpoint
 * POST /api/onboarding/personalize
 *
 * @swagger
 * /api/onboarding/personalize:
 *   post:
 *     summary: Process personalization onboarding data
 *     tags: [Onboarding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - step7
 *             properties:
 *               userId:
 *                 type: string
 *                 nullable: true
 *                 description: User ID (null for pre-auth)
 *               sessionId:
 *                 type: string
 *                 description: Session identifier
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Request timestamp
 *               isPreAuth:
 *                 type: boolean
 *                 description: Pre-authentication flag
 *               step2:
 *                 type: object
 *                 properties:
 *                   selectedHelpAreas:
 *                     type: array
 *                     items:
 *                       type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *               step3:
 *                 type: object
 *                 properties:
 *                   anxietyFrequencyIndex:
 *                     type: number
 *                   anxietyFrequencyLabel:
 *                     type: string
 *                   anxietyFrequencyDescription:
 *                     type: string
 *                   anxietyFrequencyEmoji:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *               step5:
 *                 type: object
 *                 properties:
 *                   smartCheckInsEnabled:
 *                     type: boolean
 *                   voiceConversationEnabled:
 *                     type: boolean
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *               step6:
 *                 type: object
 *                 properties:
 *                   improveWithDataEnabled:
 *                     type: boolean
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *               step7:
 *                 type: object
 *                 required:
 *                   - userName
 *                   - personalizedResultsRequested
 *                 properties:
 *                   userName:
 *                     type: string
 *                   personalizedResultsRequested:
 *                     type: boolean
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       200:
 *         description: Personalization processed successfully
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
 *                     userId:
 *                       type: string
 *                     sessionId:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     personalizedInsights:
 *                       type: object
 *                       properties:
 *                         anxietyLevel:
 *                           type: object
 *                           properties:
 *                             percentage:
 *                               type: number
 *                             level:
 *                               type: string
 *                             description:
 *                               type: string
 *                         weeklyFrequency:
 *                           type: object
 *                           properties:
 *                             sessionsPerWeek:
 *                               type: number
 *                             recommendedFrequency:
 *                               type: number
 *                             description:
 *                               type: string
 *                         copingTools:
 *                           type: object
 *                           properties:
 *                             primary:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             secondary:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             personalized:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             description:
 *                               type: string
 *                         emotionalScore:
 *                           type: object
 *                           properties:
 *                             current:
 *                               type: number
 *                             baseline:
 *                               type: number
 *                             trend:
 *                               type: string
 *                             description:
 *                               type: string
 *                         reflectionPrompt:
 *                           type: object
 *                           properties:
 *                             daily:
 *                               type: string
 *                             weekly:
 *                               type: string
 *                             personalized:
 *                               type: string
 *                             description:
 *                               type: string
 *                         personalGoal:
 *                           type: object
 *                           properties:
 *                             shortTerm:
 *                               type: string
 *                             longTerm:
 *                               type: string
 *                             milestones:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             description:
 *                               type: string
 *                         recommendations:
 *                           type: object
 *                           properties:
 *                             immediate:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             weekly:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             monthly:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             description:
 *                               type: string
 *                     aiAnalysis:
 *                       type: object
 *                       properties:
 *                         insights:
 *                           type: array
 *                           items:
 *                             type: string
 *                         patterns:
 *                           type: array
 *                           items:
 *                             type: string
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: string
 *                         confidence:
 *                           type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/personalize', personalizeController.processPersonalization.bind(personalizeController));

/**
 * Health check endpoint
 * GET /api/onboarding/personalize/health
 */
router.get('/personalize/health', personalizeController.getHealth.bind(personalizeController));

export { router as personalizeRoutes };
