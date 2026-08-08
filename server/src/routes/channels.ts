import { Router } from 'express';
import {
  createCategory,
  createChannel,
  updateChannel,
  deleteChannel,
} from '../controllers/channelController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/categories', createCategory);
router.post('/', createChannel);
router.patch('/:channelId', updateChannel);
router.delete('/:channelId', deleteChannel);

export default router;
