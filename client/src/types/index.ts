export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  banner?: string;
  profileColor?: string;
  profileEffect?: string;
  customTag?: string;
  status: UserStatus;
  customStatus?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: string[];
  serverId: string;
}

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  user: User;
  nickname?: string;
  joinedAt: string;
  roleId?: string;
  role?: Role;
  roles?: Role[];
}

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  topic?: string;
  position: number;
  serverId: string;
  categoryId?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  position: number;
  serverId: string;
  channels: Channel[];
}

export interface CustomEmoji {
  id: string;
  name: string;
  url: string;
  isAnimated: boolean;
  serverId: string;
  createdAt: string;
}

export interface Gift {
  id: string;
  giftType: string;
  giftName: string;
  giftIcon: string;
  messageId?: string;
  senderId: string;
  sender?: User;
  receiverId: string;
  receiver?: User;
  createdAt: string;
}

export interface Server {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  inviteCode: string;
  ownerId: string;
  members?: ServerMember[];
  categories?: Category[];
  channels?: Channel[];
  roles?: Role[];
  emojis?: CustomEmoji[];
  createdAt: string;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
  user?: Partial<User>;
}

export interface Message {
  id: string;
  content: string;
  fileUrl?: string;
  fileType?: string;
  channelId: string;
  authorId: string;
  author: User;
  reactions?: MessageReaction[];
  gifts?: Gift[];
  deleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DMParticipant {
  id: string;
  conversationId: string;
  userId: string;
  user: User;
}

export interface DMConversation {
  id: string;
  isGroup: boolean;
  name?: string;
  participants: DMParticipant[];
  lastMessage?: DirectMessage;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  content: string;
  fileUrl?: string;
  fileType?: string;
  conversationId: string;
  senderId: string;
  sender: User;
  createdAt: string;
}
