import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import path from 'path';
import fs from 'fs';

export const getCustomSounds = async (_req: AuthRequest, res: Response) => {
  try {
    const sounds = await prisma.customSound.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ sounds });
  } catch (error: any) {
    console.error('GetCustomSounds Error:', error);
    return res.status(500).json({ error: 'Failed to fetch sounds' });
  }
};

export const uploadCustomSound = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, icon, serverId } = req.body;

    if (!userId || !req.file) {
      return res.status(400).json({ error: 'Sound file and user authentication required' });
    }

    const soundUrl = `/uploads/${req.file.filename}`;
    const sound = await prisma.customSound.create({
      data: {
        name: name || req.file.originalname,
        icon: icon || '🎵',
        url: soundUrl,
        serverId: serverId || null,
        uploaderId: userId,
      },
    });

    return res.status(201).json({ sound });
  } catch (error: any) {
    console.error('UploadCustomSound Error:', error);
    return res.status(500).json({ error: 'Failed to upload sound' });
  }
};

export const deleteCustomSound = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sound = await prisma.customSound.findUnique({
      where: { id },
    });

    if (!sound) {
      return res.status(404).json({ error: 'Sound not found' });
    }

    // Permission check: uploader or server owner
    let isAuthorized = sound.uploaderId === userId;
    if (!isAuthorized && sound.serverId) {
      const server = await prisma.server.findUnique({ where: { id: sound.serverId } });
      if (server && server.ownerId === userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Only the uploader or server owner can delete this sound' });
    }

    // Remove file from disk if relative /uploads/ path
    if (sound.url && sound.url.startsWith('/uploads/')) {
      const filename = path.basename(sound.url);
      const filePath = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.warn('[DeleteCustomSound] File unlink error:', unlinkErr);
        }
      }
    }

    await prisma.customSound.delete({
      where: { id },
    });

    return res.json({ message: 'Sound deleted successfully', id });
  } catch (error: any) {
    console.error('DeleteCustomSound Error:', error);
    return res.status(500).json({ error: 'Failed to delete sound' });
  }
};
