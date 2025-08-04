import { Router } from 'express';
import { toolController } from '../controllers/tool.controller.js';

const router = Router();

// POST /api/tool - Process a query
router.post('/', toolController.processQuery);

// GET /api/tool/history/:email - Get query history for a user
router.get('/history/:email', toolController.getQueryHistory);

// GET /api/tool/result/:queryId - Get a specific query result
router.get('/result/:queryId', toolController.getQueryResult);

export default router;