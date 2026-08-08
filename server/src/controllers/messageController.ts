import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { io } from '../index';

export const getChannelMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messages = await prisma.message.findMany({
      where: { channelId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            status: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ messages });
  } catch (error: any) {
    console.error('GetChannelMessages Error:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { channelId, content } = req.body;
    const authorId = req.user?.userId;

    if (!authorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let fileUrl: string | undefined = undefined;
    let fileType: string | undefined = undefined;

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
    }

    if (!content && !fileUrl) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    const message = await prisma.message.create({
      data: {
        content: content || '',
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        channelId,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            status: true,
          },
        },
        reactions: true,
      },
    });

    // Broadcast message to Socket room `channel:channelId`
    io.to(`channel:${channelId}`).emit('message:new', message);

    return res.status(201).json({ message });
  } catch (error: any) {
    console.error('SendMessage Error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

export const editMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage || existingMessage.authorId !== userId) {
      return res.status(403).json({ error: 'Only the message author can edit this message' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            status: true,
          },
        },
        reactions: true,
      },
    });

    io.to(`channel:${updatedMessage.channelId}`).emit('message:update', updatedMessage);

    return res.json({ message: updatedMessage });
  } catch (error: any) {
    console.error('EditMessage Error:', error);
    return res.status(500).json({ error: 'Failed to edit message' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage || existingMessage.authorId !== userId) {
      return res.status(403).json({ error: 'Only the message author can delete this message' });
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    io.to(`channel:${existingMessage.channelId}`).emit('message:delete', { messageId, channelId: existingMessage.channelId });

    return res.json({ message: 'Message deleted' });
  } catch (error: any) {
    console.error('DeleteMessage Error:', error);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
};

export const toggleReaction = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.userId;

    if (!userId || !emoji) {
      return res.status(400).json({ error: 'Emoji and user authentication required' });
    }

    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existingReaction) {
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      await prisma.reaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
      });
    }

    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, username: true, displayName: true } },
          },
        },
      },
    });

    if (updatedMessage) {
      io.to(`channel:${updatedMessage.channelId}`).emit('message:update', updatedMessage);
    }

    return res.json({ message: updatedMessage });
  } catch (error: any) {
    console.error('ToggleReaction Error:', error);
    return res.status(500).json({ error: 'Failed to toggle reaction' });
  }
};
