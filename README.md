# ⚡ PulseCord - Real-Time Chat & Communities Application

A full-stack, dark-themed, Discord-inspired real-time chat application built with **React**, **TypeScript**, **Tailwind CSS**, **Node.js**, **Express**, **Socket.io**, **Prisma ORM**, and **PostgreSQL/SQLite**.

---

## 🌟 Key Features

1. **User Authentication & Profiles**
   - Register & Login with JWT Bearer Token Authentication
   - Password hashing with `bcryptjs`
   - Custom User Statuses (`Online`, `Idle`, `Do Not Disturb`, `Offline/Invisible`) & Custom Status Messages
   - Avatar image upload (Multer local disk storage) + DiceBear default fallback avatars

2. **Servers (Guilds) & Invite System**
   - Create, join, and leave servers
   - Unique server invite codes (`joinServerByInvite`)
   - Server name, icon, description customization
   - Automatic default channel & category creation

3. **Categories & Channels**
   - Text Channels (`# general`, `# announcements`, etc.)
   - Voice Channels (`🔊 voice-lounge`) with active WebRTC voice connection preview banner
   - Channel categories with collapse/expand toggles and custom position ordering
   - Create and delete channels with modal dialogs

4. **Real-Time Messaging & Rich Features (Socket.io)**
   - Instant bi-directional messaging with zero page refreshes
   - Rich Markdown formatting:
     - **Bold text** (`**text**`)
     - *Italics text* (`*text*`)
     - Inline code (` `code` `)
     - Code blocks (` ```code``` `)
   - Image & File attachments via Multer file uploads (`/uploads`)
   - Message editing and message deletion
   - Emoji reactions with live counter badges (👍, ❤️, 🔥, 😂, 🚀, 🎉, 👀, 💯)
   - Real-time typing indicators (`"Alex is typing..."`)

5. **Direct Messages (DMs)**
   - 1:1 Direct Messaging between users
   - Real-time socket room channels for private conversations

6. **Role-Based Access Control (RBAC)**
   - Server owner and custom role assignments with permission flags (`ADMIN`, `MANAGE_SERVER`, `MANAGE_CHANNELS`, `SEND_MESSAGES`)
   - Member sidebar grouped by status & role ownership crowns (👑)

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios, Socket.io-client
- **Backend**: Node.js, Express, TypeScript, Socket.io, JWT, bcryptjs, Multer
- **Database & ORM**: Prisma ORM with dual PostgreSQL / SQLite dev database support

---

## 🚀 Quick Setup & Installation

### Prerequisites
- Node.js (v18+)
- npm or yarn

### 1. Clone & Install Dependencies
```bash
# Install root monorepo dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Database Setup & Seeding
```bash
cd server

# Sync Prisma Schema (creates dev.db SQLite database)
npm run prisma:push

# Generate Prisma Client
npm run prisma:generate

# Seed initial test users and sample servers
npm run prisma:seed
```

### 3. Run Development Server
From the project root:
```bash
npm run dev
```
- **Frontend Client**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:5000`

---

## 🔑 Seed Test Accounts

| User | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Alex** | `alex@pulsecord.io` | `password123` | Dev Lead (Owner of *Developers Hub*) |
| **Sarah** | `sarah@pulsecord.io` | `password123` | Pro Gamer (Owner of *Gaming Lounge*) |
| **Bob** | `bob@pulsecord.io` | `password123` | Bob The Builder |

---

## 🐳 Docker Setup (Optional for PostgreSQL)

To run PostgreSQL via Docker Compose:
```bash
docker-compose up -d
```
Update `server/.env`:
```env
DATABASE_URL="postgresql://pulsecord:pulsecordpass@localhost:5432/pulsecord_db?schema=public"
```

---

## 📂 Project Structure

```
d:/Discord by Karan&team/
├── docker-compose.yml
├── README.md
├── package.json
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/ (LoginPage, RegisterPage, ProtectedRoute)
│   │   │   ├── navigation/ (ServerSidebar, ChannelSidebar, MemberSidebar, UserFooter)
│   │   │   ├── chat/ (ChatArea, MessageItem)
│   │   │   ├── dm/ (DMList, DMChat)
│   │   │   └── modals/ (CreateServerModal, CreateChannelModal, JoinServerModal, InviteModal, UserSettingsModal)
│   │   ├── context/ (AuthContext, ServerContext, SocketContext)
│   │   ├── services/ (api.ts)
│   │   └── App.tsx
└── server/
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    ├── src/
    │   ├── controllers/ (authController, serverController, channelController, messageController, dmController, roleController)
    │   ├── middleware/ (authMiddleware, uploadMiddleware)
    │   ├── socket/ (socketHandler.ts)
    │   └── index.ts
    ├── .env
    └── .env.example
```
