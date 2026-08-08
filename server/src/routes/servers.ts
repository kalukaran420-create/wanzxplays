import { Router } from 'express';
import {
  createServer,
  getUserServers,
  getServerDetails,
  joinServerByInvite,
  updateServer,
  deleteServer,
  removeServerMember,
  uploadServerIcon,
} from '../controllers/serverController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createServer);
router.get('/', getUserServers);
router.post('/join', joinServerByInvite);
router.get('/:serverId', getServerDetails);
router.patch('/:serverId', updateServer);
router.delete('/:serverId', deleteServer);
router.delete('/:serverId/members/:memberId', removeServerMember);
router.post('/:serverId/icon', upload.single('icon'), uploadServerIcon);

export default router;
