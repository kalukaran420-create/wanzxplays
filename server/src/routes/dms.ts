import { Router } from 'express';
import {
  getDMConversations,
  getOrCreateDMConversation,
  getDMMessages,
  sendDirectMessage,
} from '../controllers/dmController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/conversations', getDMConversations);
router.post('/conversations', getOrCreateDMConversation);
router.get('/conversations/:conversationId/messages', getDMMessages);
router.post('/messages', upload.single('attachment'), sendDirectMessage);

export default router;
