import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';

const router = Router();

// Search conversations by semantic similarity
router.get('/search', searchController.searchConversations);

// Get all conversations for a specific user (with optional search)
router.get('/search/user/:email', searchController.getUserConversations);

export { router as searchRoutes };