import { Router } from 'express';
import {
  createServer,
  getUserServers,
  getServerDetails,
  joinServerByInvite,
  updateServer,
  deleteServer,
} from '../controllers/serverController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createServer);
router.get('/', getUserServers);
router.post('/join', joinServerByInvite);
router.get('/:serverId', getServerDetails);
router.patch('/:serverId', updateServer);
router.delete('/:serverId', deleteServer);

export default router;
