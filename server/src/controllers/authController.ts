import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/authMiddleware';

const USER_SELECT_FIELDS = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  googleId: true,
  avatar: true,
  banner: true,
  profileColor: true,
  profileEffect: true,
  customTag: true,
  status: true,
  customStatus: true,
  createdAt: true,
  updatedAt: true,
};

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { email, username, displayName, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: displayName || username,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
        status: 'online',
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online' },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      message: 'Login successful',
      token,
      user: { ...userWithoutPassword, status: 'online' },
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Server error during login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: USER_SELECT_FIELDS,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error: any) {
    console.error('GetMe Error:', error);
    return res.status(500).json({ error: 'Server error fetching user profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { displayName, status, customStatus, banner, profileColor, profileEffect, customTag } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(status !== undefined && { status }),
        ...(customStatus !== undefined && { customStatus }),
        ...(banner !== undefined && { banner }),
        ...(profileColor !== undefined && { profileColor }),
        ...(profileEffect !== undefined && { profileEffect }),
        ...(customTag !== undefined && { customTag }),
      },
      select: USER_SELECT_FIELDS,
    });

    return res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error: any) {
    console.error('UpdateProfile Error:', error);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No avatar image uploaded' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { avatar: avatarUrl },
      select: USER_SELECT_FIELDS,
    });

    return res.json({ message: 'Avatar uploaded successfully', user: updatedUser });
  } catch (error: any) {
    console.error('UploadAvatar Error:', error);
    return res.status(500).json({ error: 'Server error uploading avatar' });
  }
};

export const uploadBanner = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No banner image uploaded' });
    }

    const bannerUrl = `/uploads/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { banner: bannerUrl },
      select: USER_SELECT_FIELDS,
    });

    return res.json({ message: 'Banner uploaded successfully', user: updatedUser });
  } catch (error: any) {
    console.error('UploadBanner Error:', error);
    return res.status(500).json({ error: 'Server error uploading banner' });
  }
};

export const googleLogin = async (req: AuthRequest, res: Response) => {
  try {
    const { credential, idToken, googleProfile } = req.body;
    const tokenToVerify = credential || idToken;

    let googleUser: { sub: string; email: string; name?: string; picture?: string } | null = null;

    if (tokenToVerify) {
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`);
        if (response.ok) {
          const payload = await response.json() as any;
          if (payload.email && payload.sub) {
            googleUser = {
              sub: payload.sub,
              email: payload.email,
              name: payload.name || payload.given_name || payload.email.split('@')[0],
              picture: payload.picture,
            };
          }
        }
      } catch (verifyErr) {
        console.error('Failed to verify Google ID token with tokeninfo:', verifyErr);
      }
    }

    if (!googleUser && googleProfile) {
      const { sub, email, name, picture } = googleProfile;
      if (sub && email) {
        googleUser = { sub, email, name, picture };
      }
    }

    if (!googleUser) {
      return res.status(400).json({ error: 'Invalid or expired Google credential' });
    }

    const { sub: googleId, email, name, picture } = googleUser;

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatar: user.avatar || picture || undefined,
            status: 'online',
          },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'online' },
        });
      }
    } else {
      const baseUsername = (name || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 15) || 'user';
      let uniqueUsername = baseUsername;
      let counter = 1;

      while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
        uniqueUsername = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email,
          username: uniqueUsername,
          displayName: name || uniqueUsername,
          googleId,
          avatar: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uniqueUsername)}`,
          status: 'online',
        },
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: 'Google authentication successful',
      token,
      user: { ...userWithoutPassword, status: 'online' },
    });
  } catch (error: any) {
    console.error('Google Login Error:', error);
    return res.status(500).json({ error: 'Server error during Google authentication' });
  }
};
