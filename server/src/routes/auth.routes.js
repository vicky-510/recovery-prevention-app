import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

export default router;
