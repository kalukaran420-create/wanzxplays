import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId, name } = req.body;
    const userId = req.user?.userId;

    if (!serverId || !name) {
      return res.status(400).json({ error: 'Server ID and category name are required' });
    }

    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: userId! },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this server' });
    }

    const categoryCount = await prisma.category.count({ where: { serverId } });

    const category = await prisma.category.create({
      data: {
        name,
        serverId,
        position: categoryCount,
      },
      include: {
        channels: true,
      },
    });

    return res.status(201).json({ category });
  } catch (error: any) {
    console.error('CreateCategory Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create category' });
  }
};

export const createChannel = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId, categoryId, name, type, topic } = req.body;
    const userId = req.user?.userId;

    if (!serverId || !name) {
      return res.status(400).json({ error: 'Server ID and channel name are required' });
    }

    const member = await prisma.serverMember.findFirst({
      where: { serverId, userId: userId! },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this server' });
    }

    let targetCategoryId = categoryId || null;

    if (!targetCategoryId) {
      const categoryKeyword = type === 'VOICE' ? 'VOICE' : 'TEXT';
      const matchedCat = await prisma.category.findFirst({
        where: {
          serverId,
          name: { contains: categoryKeyword },
        },
      });
      if (matchedCat) {
        targetCategoryId = matchedCat.id;
      }
    }

    const formattedName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || name.trim();
    const channelCount = await prisma.channel.count({ where: { serverId, categoryId: targetCategoryId } });

    const channel = await prisma.channel.create({
      data: {
        name: formattedName,
        type: type || 'TEXT',
        topic: topic || null,
        serverId,
        categoryId: targetCategoryId,
        position: channelCount,
      },
    });

    return res.status(201).json({ channel });
  } catch (error: any) {
    console.error('CreateChannel Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create channel' });
  }
};

export const updateChannel = async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const { name, topic, position, categoryId } = req.body;

    const formattedName = name ? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : undefined;

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(formattedName && { name: formattedName }),
        ...(topic !== undefined && { topic }),
        ...(position !== undefined && { position }),
        ...(categoryId !== undefined && { categoryId }),
      },
    });

    return res.json({ channel });
  } catch (error: any) {
    console.error('UpdateChannel Error:', error);
    return res.status(500).json({ error: 'Failed to update channel' });
  }
};

export const deleteChannel = async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;

    await prisma.channel.delete({
      where: { id: channelId },
    });

    return res.json({ message: 'Channel deleted successfully' });
  } catch (error: any) {
    console.error('DeleteChannel Error:', error);
    return res.status(500).json({ error: 'Failed to delete channel' });
  }
};
