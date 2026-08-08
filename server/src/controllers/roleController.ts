import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getServerRoles = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;

    const roles = await prisma.role.findMany({
      where: { serverId },
      orderBy: { position: 'asc' },
    });

    return res.json({ roles });
  } catch (error: any) {
    console.error('GetServerRoles Error:', error);
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

export const createRole = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId, name, color, permissions } = req.body;
    const userId = req.user?.userId;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server || server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the server owner can create roles' });
    }

    const roleCount = await prisma.role.count({ where: { serverId } });

    const role = await prisma.role.create({
      data: {
        name,
        color: color || '#99aab5',
        position: roleCount + 1,
        permissions: JSON.stringify(permissions || ['SEND_MESSAGES']),
        serverId,
      },
    });

    return res.status(201).json({ role });
  } catch (error: any) {
    console.error('CreateRole Error:', error);
    return res.status(500).json({ error: 'Failed to create role' });
  }
};

export const assignRoleToMember = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId, memberId, roleId } = req.body;
    const userId = req.user?.userId;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server || server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the server owner can manage roles' });
    }

    await prisma.serverMember.update({
      where: { id: memberId },
      data: {
        roleId: roleId || null,
      },
    });

    return res.json({ message: 'Role assigned successfully' });
  } catch (error: any) {
    console.error('AssignRole Error:', error);
    return res.status(500).json({ error: 'Failed to assign role' });
  }
};
