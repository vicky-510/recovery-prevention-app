import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', userController.me);
router.put('/safe-contact', userController.updateSafeContact);

export default router;
