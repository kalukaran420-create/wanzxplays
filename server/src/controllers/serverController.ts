import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createServer = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, icon } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Server name is required' });
    }

    // 1. Create server
    const server = await prisma.server.create({
      data: {
        name,
        description: description || null,
        icon: icon || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
        ownerId: userId,
        members: {
          create: {
            userId,
          },
        },
        roles: {
          create: {
            name: 'Owner',
            color: '#e91e63',
            position: 0,
            permissions: JSON.stringify(['ADMIN', 'MANAGE_SERVER', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'SEND_MESSAGES']),
          },
        },
      },
    });

    // 2. Create default category & channel
    const defaultCat = await prisma.category.create({
      data: {
        name: 'TEXT CHANNELS',
        position: 0,
        serverId: server.id,
      },
    });

    await prisma.channel.create({
      data: {
        name: 'general',
        type: 'TEXT',
        topic: 'Welcome to the general text channel!',
        position: 0,
        serverId: server.id,
        categoryId: defaultCat.id,
      },
    });

    // 3. Return complete server structure
    const fullServer = await prisma.server.findUnique({
      where: { id: server.id },
      include: {
        categories: {
          include: {
            channels: { orderBy: { position: 'asc' } },
          },
          orderBy: { position: 'asc' },
        },
        channels: { orderBy: { position: 'asc' } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({ server: fullServer });
  } catch (error: any) {
    console.error('CreateServer Error:', error);
    return res.status(500).json({ error: 'Failed to create server' });
  }
};

export const getUserServers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const servers = await prisma.server.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        categories: {
          include: {
            channels: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
        channels: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ servers });
  } catch (error: any) {
    console.error('GetUserServers Error:', error);
    return res.status(500).json({ error: 'Failed to fetch servers' });
  }
};

export const getServerDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const server = await prisma.server.findFirst({
      where: {
        id: serverId,
        members: {
          some: { userId },
        },
      },
      include: {
        categories: {
          include: {
            channels: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
        channels: {
          orderBy: { position: 'asc' },
        },
        roles: true,
        members: {
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
            roles: true,
          },
        },
      },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found or access denied' });
    }

    return res.json({ server });
  } catch (error: any) {
    console.error('GetServerDetails Error:', error);
    return res.status(500).json({ error: 'Failed to fetch server details' });
  }
};

export const joinServerByInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const server = await prisma.server.findUnique({
      where: { inviteCode },
    });

    if (!server) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }

    const existingMember = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId: server.id,
          userId,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this server', serverId: server.id });
    }

    await prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId,
      },
    });

    return res.json({ message: 'Successfully joined server', serverId: server.id });
  } catch (error: any) {
    console.error('JoinServer Error:', error);
    return res.status(500).json({ error: 'Failed to join server' });
  }
};

export const updateServer = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const { name, description, icon } = req.body;
    const userId = req.user?.userId;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server || server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the server owner can update server settings' });
    }

    const updatedServer = await prisma.server.update({
      where: { id: serverId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
      },
    });

    return res.json({ message: 'Server updated successfully', server: updatedServer });
  } catch (error: any) {
    console.error('UpdateServer Error:', error);
    return res.status(500).json({ error: 'Failed to update server' });
  }
};

export const deleteServer = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.userId;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server || server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the server owner can delete this server' });
    }

    await prisma.server.delete({
      where: { id: serverId },
    });

    return res.json({ message: 'Server deleted successfully' });
  } catch (error: any) {
    console.error('DeleteServer Error:', error);
    return res.status(500).json({ error: 'Failed to delete server' });
  }
};
