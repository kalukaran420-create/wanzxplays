import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma database seeding...');

  // Clean existing data in reverse dependency order
  await prisma.reaction.deleteMany().catch(() => {});
  await prisma.message.deleteMany().catch(() => {});
  await prisma.channel.deleteMany().catch(() => {});
  await prisma.category.deleteMany().catch(() => {});
  await prisma.role.deleteMany().catch(() => {});
  await prisma.serverMember.deleteMany().catch(() => {});
  await prisma.server.deleteMany().catch(() => {});
  await prisma.directMessage.deleteMany().catch(() => {});
  await prisma.dMParticipant.deleteMany().catch(() => {});
  await prisma.dMConversation.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});

  console.log('🔒 Hashing passwords with bcryptjs...');
  const karanPassword = await bcrypt.hash('karan123', 10);
  const shravanPassword = await bcrypt.hash('shravan123', 10);
  const test1Password = await bcrypt.hash('test123', 10);
  const test2Password = await bcrypt.hash('test123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  // User 1: karan
  const karan = await prisma.user.create({
    data: {
      username: 'karan',
      email: 'karan@pulsecord.io',
      displayName: 'Karan',
      password: karanPassword,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=karan',
      status: 'online',
      customStatus: '🚀 PulseCord Creator',
    },
  });

  // User 2: shravan
  const shravan = await prisma.user.create({
    data: {
      username: 'shravan',
      email: 'shravan@pulsecord.io',
      displayName: 'Shravan',
      password: shravanPassword,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=shravan',
      status: 'online',
      customStatus: '⚡ Ready to talk',
    },
  });

  // User 3: testuser1
  const testuser1 = await prisma.user.create({
    data: {
      username: 'testuser1',
      email: 'testuser1@pulsecord.io',
      displayName: 'Test User 1',
      password: test1Password,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=testuser1',
      status: 'idle',
      customStatus: '🧪 Testing text chat',
    },
  });

  // User 4: testuser2
  const testuser2 = await prisma.user.create({
    data: {
      username: 'testuser2',
      email: 'testuser2@pulsecord.io',
      displayName: 'Test User 2',
      password: test2Password,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=testuser2',
      status: 'dnd',
      customStatus: '🎮 Gaming session',
    },
  });

  // User 5: admin
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@pulsecord.io',
      displayName: 'System Admin',
      password: adminPassword,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
      status: 'online',
      customStatus: '🛡️ Server Administrator',
    },
  });

  console.log('✅ Created 5 test users with hashed passwords:');
  console.log('   1. karan     | email: karan@pulsecord.io     | password: karan123');
  console.log('   2. shravan   | email: shravan@pulsecord.io   | password: shravan123');
  console.log('   3. testuser1 | email: testuser1@pulsecord.io | password: test123');
  console.log('   4. testuser2 | email: testuser2@pulsecord.io | password: test123');
  console.log('   5. admin     | email: admin@pulsecord.io     | password: admin123');

  // Create PulseCord HQ Server
  const mainServer = await prisma.server.create({
    data: {
      name: 'PulseCord HQ',
      description: 'Official test & development server for Karan & team',
      icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=PulseCordHQ',
      inviteCode: 'PULSECORD1',
      ownerId: karan.id,
      members: {
        create: [
          { userId: karan.id },
          { userId: shravan.id },
          { userId: testuser1.id },
          { userId: testuser2.id },
          { userId: admin.id },
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

  const catWelcome = await prisma.category.create({
    data: { name: 'WELCOME', position: 0, serverId: mainServer.id },
  });
  const catChannels = await prisma.category.create({
    data: { name: 'TEXT & VOICE', position: 1, serverId: mainServer.id },
  });

  await prisma.channel.createMany({
    data: [
      { name: 'welcome', type: 'TEXT', topic: 'Welcome to PulseCord!', position: 0, serverId: mainServer.id, categoryId: catWelcome.id },
      { name: 'general', type: 'TEXT', topic: 'General community discussion', position: 0, serverId: mainServer.id, categoryId: catChannels.id },
      { name: 'testing', type: 'TEXT', topic: 'Multi-device communication test channel', position: 1, serverId: mainServer.id, categoryId: catChannels.id },
      { name: 'voice-lounge', type: 'VOICE', topic: 'Active WebRTC voice & screen share', position: 2, serverId: mainServer.id, categoryId: catChannels.id },
    ],
  });

  // Create Gaming Lounge Server
  const gamingServer = await prisma.server.create({
    data: {
      name: 'Gaming Lounge',
      description: 'Hangout and gaming server',
      icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=GamingLounge',
      inviteCode: 'GAMING777',
      ownerId: shravan.id,
      members: {
        create: [
          { userId: shravan.id },
          { userId: karan.id },
          { userId: testuser1.id },
          { userId: testuser2.id },
        ],
      },
    },
  });

  const gamingCat = await prisma.category.create({
    data: { name: 'CHANNELS', position: 0, serverId: gamingServer.id },
  });

  await prisma.channel.createMany({
    data: [
      { name: 'general', type: 'TEXT', topic: 'Gaming discussion', position: 0, serverId: gamingServer.id, categoryId: gamingCat.id },
      { name: 'voice-lounge', type: 'VOICE', topic: 'Game voice channel', position: 1, serverId: gamingServer.id, categoryId: gamingCat.id },
    ],
  });

  console.log(`✅ Default test servers created:`);
  console.log(`   - ${mainServer.name} (Invite: PULSECORD1)`);
  console.log(`   - ${gamingServer.name} (Invite: GAMING777)`);
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
