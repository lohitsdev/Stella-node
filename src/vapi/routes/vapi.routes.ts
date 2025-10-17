import { Router } from 'express';

import { vapiController } from '../controllers/vapi.controller.js';
import { memoryController } from '../controllers/memory.controller.js';

const router = Router();

// Health check
router.get('/health', vapiController.health.bind(vapiController));

// Main webhook endpoint (VAPI will call this with real-time updates)
router.post('/webhook', vapiController.webhook.bind(vapiController));

// Session management
router.post('/session/start', vapiController.startSession.bind(vapiController));
router.post('/session/end', vapiController.endSession.bind(vapiController));
router.get('/session/:sessionId', vapiController.getSession.bind(vapiController));
router.get('/sessions/:email', vapiController.getUserSessions.bind(vapiController));

// Memory endpoints
router.post('/memory/search', memoryController.searchMemory.bind(memoryController));
router.post('/memory/recent', memoryController.getRecentMemory.bind(memoryController));

// VAPI tool endpoint for memory recall
router.post('/tools/memory-recall', memoryController.memoryRecallTool.bind(memoryController));

export { router as vapiRoutes };

