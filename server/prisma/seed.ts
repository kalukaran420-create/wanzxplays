import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma database seeding...');

  // Clean existing data
  await prisma.reaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.category.deleteMany();
  await prisma.role.deleteMany();
  await prisma.serverMember.deleteMany();
  await prisma.server.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.dMParticipant.deleteMany();
  await prisma.dMConversation.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Users
  const alex = await prisma.user.create({
    data: {
      email: 'alex@pulsecord.io',
      username: 'alexdev',
      displayName: 'Alex (Dev Lead)',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alexdev',
      status: 'online',
      customStatus: '🚀 Building PulseCord',
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah@pulsecord.io',
      username: 'sarahgamer',
      displayName: 'Sarah (Pro Gamer)',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sarahgamer',
      status: 'idle',
      customStatus: '🎮 Playing Cyberpunk 2077',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@pulsecord.io',
      username: 'bobbuilder',
      displayName: 'Bob The Builder',
      password: hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bobbuilder',
      status: 'dnd',
      customStatus: '⛔ In a meeting',
    },
  });

  // Create Dev Server
  const devServer = await prisma.server.create({
    data: {
      name: 'Developers Hub',
      description: 'The official community for software engineers & tech enthusiasts',
      icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=DevelopersHub',
      inviteCode: 'DEVHUB123',
      ownerId: alex.id,
      members: {
        create: [
          { userId: alex.id },
          { userId: sarah.id },
          { userId: bob.id },
        ],
      },
      roles: {
        create: [
          { name: 'Owner', color: '#e91e63', position: 0, permissions: JSON.stringify(['ADMIN', 'MANAGE_SERVER']) },
          { name: 'Admin', color: '#3498db', position: 1, permissions: JSON.stringify(['MANAGE_CHANNELS']) },
        ],
      },
    },
  });

  // Create Categories & Channels for Dev Server
  const devCat1 = await prisma.category.create({
    data: { name: 'WELCOME & RULES', position: 0, serverId: devServer.id },
  });
  const devCat2 = await prisma.category.create({
    data: { name: 'DISCUSSION', position: 1, serverId: devServer.id },
  });

  await prisma.channel.createMany({
    data: [
      { name: 'welcome', type: 'TEXT', topic: 'Welcome all new developers!', position: 0, serverId: devServer.id, categoryId: devCat1.id },
      { name: 'announcements', type: 'TEXT', topic: 'Important community updates', position: 1, serverId: devServer.id, categoryId: devCat1.id },
      { name: 'general', type: 'TEXT', topic: 'General tech discussion', position: 0, serverId: devServer.id, categoryId: devCat2.id },
      { name: 'frontend-dev', type: 'TEXT', topic: 'React, Tailwind, Vite & UI design', position: 1, serverId: devServer.id, categoryId: devCat2.id },
      { name: 'backend-dev', type: 'TEXT', topic: 'Node.js, Express, Databases & APIs', position: 2, serverId: devServer.id, categoryId: devCat2.id },
      { name: 'voice-lounge', type: 'VOICE', topic: 'Hangout voice channel', position: 3, serverId: devServer.id, categoryId: devCat2.id },
    ],
  });

  // Create Gaming Server
  const gamingServer = await prisma.server.create({
    data: {
      name: 'Gaming Lounge',
      description: 'Casual & Competitive gaming chat',
      icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=GamingLounge',
      inviteCode: 'GAMING777',
      ownerId: sarah.id,
      members: {
        create: [
          { userId: sarah.id },
          { userId: alex.id },
        ],
      },
    },
  });

  const gamingCat = await prisma.category.create({
    data: { name: 'TEXT CHANNELS', position: 0, serverId: gamingServer.id },
  });

  await prisma.channel.createMany({
    data: [
      { name: 'general', type: 'TEXT', topic: 'Talk about your favorite games', position: 0, serverId: gamingServer.id, categoryId: gamingCat.id },
      { name: 'clips-and-highlights', type: 'TEXT', topic: 'Share gameplay clips!', position: 1, serverId: gamingServer.id, categoryId: gamingCat.id },
      { name: 'squad-finder', type: 'TEXT', topic: 'Find players to team up with', position: 2, serverId: gamingServer.id, categoryId: gamingCat.id },
      { name: 'gaming-voice', type: 'VOICE', topic: 'Live game audio', position: 3, serverId: gamingServer.id, categoryId: gamingCat.id },
    ],
  });

  console.log('✅ Created initial test servers and channels:');
  console.log(` - ${devServer.name} (Invite: DEVHUB123)`);
  console.log(` - ${gamingServer.name} (Invite: GAMING777)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
