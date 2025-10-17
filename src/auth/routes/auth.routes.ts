import express from 'express';

import { authController } from '../controllers/auth.controller.js';
import { profileController } from '../controllers/profile.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Authentication routes
 */

// Public routes
router.post('/signup', authController.createUser.bind(authController));
router.post('/login', authController.authenticateUser.bind(authController));
router.post('/refresh', authController.refreshUserToken.bind(authController));

// Protected routes
router.post('/logout', authMiddleware, authController.logoutUser.bind(authController));

// Profile routes
router.get('/profile/:email', profileController.getProfile.bind(profileController));

export { router as authRoutes };
