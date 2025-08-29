import type { Request, Response } from 'express';
import { profileService } from '../services/profile.service.js';
import { HttpStatus } from '../../common/enums/app.enum.js';

export class ProfileController {
  /**
   * @swagger
   * /api/auth/profile/{email}:
   *   get:
   *     summary: Get user profile by email
   *     tags: [Profile]
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *           format: email
   *         description: User email
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
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
   *                     name:
   *                       type: string
   *                     email:
   *                       type: string
   *                     role:
   *                       type: string
   *                     status:
   *                       type: string
   *                     provider:
   *                       type: string
   *                     emailVerified:
   *                       type: boolean
   *                     lastLogin:
   *                       type: string
   *                       format: date-time
   *                     profile:
   *                       type: object
   *                       properties:
   *                         avatar:
   *                           type: string
   *                         bio:
   *                           type: string
   *                         phone:
   *                           type: string
   *                         timezone:
   *                           type: string
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *                 message:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid email format
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Email parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const result = await profileService.getProfileByEmail(email);

      if (!result.success) {
        res.status(HttpStatus.NOT_FOUND).json(result);
        return;
      }

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error('Get profile controller error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }
}

// Export singleton instance
export const profileController = new ProfileController();
