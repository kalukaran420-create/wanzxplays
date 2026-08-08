import { Router } from 'express';
import { sendGift, getUserGifts } from '../controllers/giftController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/send', authenticateToken, sendGift);
router.get('/user/:userId', authenticateToken, getUserGifts);

export default router;
