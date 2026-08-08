import { Router } from 'express';
import {
  getChannelMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
} from '../controllers/messageController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/channel/:channelId', getChannelMessages);
router.post('/', upload.single('attachment'), sendMessage);
router.post('/send', upload.single('attachment'), sendMessage);
router.patch('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/reactions', toggleReaction);

export default router;
