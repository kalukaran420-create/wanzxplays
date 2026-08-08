import { Router } from 'express';
import { getCustomSounds, uploadCustomSound } from '../controllers/soundController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.get('/', authenticateToken, getCustomSounds);
router.post('/upload', authenticateToken, upload.single('sound'), uploadCustomSound);

export default router;
