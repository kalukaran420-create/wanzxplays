import { Router } from 'express';
import { register, login, googleLogin, getMe, updateProfile, uploadAvatar, uploadBanner } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authenticateToken, getMe);
router.patch('/profile', authenticateToken, updateProfile);
router.post('/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);
router.post('/banner', authenticateToken, upload.single('banner'), uploadBanner);

export default router;
