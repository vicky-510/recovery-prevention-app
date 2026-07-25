import { Router } from 'express';
import * as interventionController from '../controllers/intervention.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { interventionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(requireAuth);

router.get('/categories', interventionController.categories);
router.post('/', interventionLimiter, interventionController.create);

export default router;
