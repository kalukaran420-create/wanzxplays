import { Router } from 'express';
import { getServerEmojis, createCustomEmoji, deleteCustomEmoji } from '../controllers/emojiController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.get('/server/:serverId', authenticateToken, getServerEmojis);
router.post('/server/:serverId', authenticateToken, upload.single('emoji'), createCustomEmoji);
router.delete('/:emojiId', authenticateToken, deleteCustomEmoji);

export default router;
