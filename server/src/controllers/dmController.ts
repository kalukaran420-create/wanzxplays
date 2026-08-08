import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { io } from '../index';

export const getDMConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversations = await prisma.dMConversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                status: true,
                customStatus: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ conversations });
  } catch (error: any) {
    console.error('GetDMConversations Error:', error);
    return res.status(500).json({ error: 'Failed to fetch DM conversations' });
  }
};

export const getOrCreateDMConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user?.userId;

    if (!userId || !targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    // Check if 1:1 conversation already exists
    const existingConv = await prisma.dMConversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                status: true,
                customStatus: true,
              },
            },
          },
        },
      },
    });

    if (existingConv) {
      return res.json({ conversation: existingConv });
    }

    // Create new 1:1 conversation
    const newConv = await prisma.dMConversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                status: true,
                customStatus: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({ conversation: newConv });
  } catch (error: any) {
    console.error('GetOrCreateDM Error:', error);
    return res.status(500).json({ error: 'Failed to initiate DM conversation' });
  }
};

export const getDMMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messages = await prisma.directMessage.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ messages });
  } catch (error: any) {
    console.error('GetDMMessages Error:', error);
    return res.status(500).json({ error: 'Failed to fetch DM messages' });
  }
};

export const sendDirectMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user?.userId;

    if (!senderId) {
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

    const message = await prisma.directMessage.create({
      data: {
        content: content || '',
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        conversationId,
        senderId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    // Touch conversation updated timestamp
    await prisma.dMConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Broadcast to DM socket room `dm:conversationId`
    io.to(`dm:${conversationId}`).emit('dm:new', message);

    return res.status(201).json({ message });
  } catch (error: any) {
    console.error('SendDirectMessage Error:', error);
    return res.status(500).json({ error: 'Failed to send direct message' });
  }
};
