import { Router, json } from 'express';
import * as interventionController from '../controllers/intervention.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { interventionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(requireAuth);

router.get('/categories', interventionController.categories);
router.post('/', interventionLimiter, interventionController.create);

// Only this route carries audio, so the larger body cap is scoped to it rather
// than raised globally.
router.post(
  '/voice',
  interventionLimiter,
  json({ limit: '6mb' }),
  interventionController.createFromVoice
);

export default router;
