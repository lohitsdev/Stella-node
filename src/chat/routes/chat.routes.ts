import express from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { summaryController } from '../controllers/summary.controller.js';
import { authMiddleware } from '../../auth/middleware/auth.middleware.js';

const router = express.Router();

/**
 * Chat routes
 */

// Public webhook endpoint
router.post('/end', chatController.endChatWebhook.bind(chatController));

// Public endpoint for testing (remove in production)
router.get('/session/:chatId/public', chatController.getSession.bind(chatController));

// Protected routes (require authentication)
router.get('/sessions/:email', authMiddleware, chatController.getUserSessions.bind(chatController));
router.get('/session/:chatId', authMiddleware, chatController.getSession.bind(chatController));

// Summary routes
router.get('/summary/:chatId', summaryController.getSummary.bind(summaryController));
router.get('/summaries/:email', authMiddleware, summaryController.getUserSummaries.bind(summaryController));

export default router;