import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { io } from '../index';

export const sendGift = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, giftType, giftName, giftIcon, messageId, channelId } = req.body;
    const senderId = req.user?.userId;

    if (!senderId || !receiverId || !giftType || !giftName || !giftIcon) {
      return res.status(400).json({ error: 'Missing required gift fields' });
    }

    const gift = await prisma.gift.create({
      data: {
        giftType,
        giftName,
        giftIcon,
        messageId: messageId || null,
        senderId,
        receiverId,
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        receiver: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    if (channelId) {
      console.log(`[Socket] Broadcasting gift:new to channel:${channelId}`);
      io.to(`channel:${channelId}`).emit('gift:new', gift);
    }

    return res.status(201).json({ gift });
  } catch (error: any) {
    console.error('SendGift Error:', error);
    return res.status(500).json({ error: 'Failed to send gift' });
  }
};

export const getUserGifts = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const gifts = await prisma.gift.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ gifts });
  } catch (error: any) {
    console.error('GetUserGifts Error:', error);
    return res.status(500).json({ error: 'Failed to fetch user gifts' });
  }
};
