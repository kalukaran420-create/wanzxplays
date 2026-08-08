import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getServerEmojis = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const emojis = await prisma.customEmoji.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ emojis });
  } catch (error: any) {
    console.error('GetServerEmojis Error:', error);
    return res.status(500).json({ error: 'Failed to fetch emojis' });
  }
};

export const createCustomEmoji = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const { name } = req.body;
    const userId = req.user?.userId;

    if (!userId || !name) {
      return res.status(400).json({ error: 'Emoji name and user authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Emoji image or GIF file is required' });
    }

    // Verify user is server owner or admin
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const cleanName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const emojiUrl = `/uploads/${req.file.filename}`;
    const isAnimated = req.file.mimetype === 'image/gif' || req.file.originalname.toLowerCase().endsWith('.gif');

    const emoji = await prisma.customEmoji.create({
      data: {
        name: cleanName,
        url: emojiUrl,
        isAnimated,
        serverId,
      },
    });

    return res.status(201).json({ emoji });
  } catch (error: any) {
    console.error('CreateCustomEmoji Error:', error);
    return res.status(500).json({ error: 'Failed to create custom emoji' });
  }
};

export const deleteCustomEmoji = async (req: AuthRequest, res: Response) => {
  try {
    const { emojiId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.customEmoji.delete({
      where: { id: emojiId },
    });

    return res.json({ message: 'Emoji deleted successfully' });
  } catch (error: any) {
    console.error('DeleteCustomEmoji Error:', error);
    return res.status(500).json({ error: 'Failed to delete emoji' });
  }
};
