import { Router } from 'express';
import * as educationController from '../controllers/education.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/:categoryCode', educationController.read);

export default router;
