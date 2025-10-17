import express from 'express';

import { authMiddleware } from '../../auth/middleware/auth.middleware.js';
import { chatController } from '../controllers/chat.controller.js';
import { summaryController } from '../controllers/summary.controller.js';

const router = express.Router();

/**
 * Chat routes
 */

// Public webhook endpoint
router.post('/end', chatController.endChatSession.bind(chatController));

// Public endpoint for testing (remove in production)
router.get('/session/:chatId/public', chatController.getChatSession.bind(chatController));

// Protected routes (require authentication)
router.get('/sessions/:email', authMiddleware, chatController.getUserChatSessions.bind(chatController));
router.get('/chatids/:email', chatController.getUserChatIds.bind(chatController));
router.get('/session/:chatId', authMiddleware, chatController.getChatSession.bind(chatController));

// Summary routes
router.get('/summary/:chatId', summaryController.getSummary.bind(summaryController));
router.get('/summaries/:email', authMiddleware, summaryController.getUserSummaries.bind(summaryController));

export { router as chatRoutes };
