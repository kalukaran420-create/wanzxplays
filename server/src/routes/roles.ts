import { Router } from 'express';
import { getServerRoles, createRole, assignRoleToMember } from '../controllers/roleController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/server/:serverId', getServerRoles);
router.post('/', createRole);
router.post('/assign', assignRoleToMember);

export default router;
