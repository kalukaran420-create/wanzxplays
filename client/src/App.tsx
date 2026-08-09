import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ServerProvider } from './context/ServerContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ServerSidebar } from './components/navigation/ServerSidebar';
import { ChannelSidebar } from './components/navigation/ChannelSidebar';
import { MemberSidebar } from './components/navigation/MemberSidebar';
import { ChatArea } from './components/chat/ChatArea';
import { DMList } from './components/dm/DMList';
import { DMChat } from './components/dm/DMChat';
import { CreateServerModal } from './components/modals/CreateServerModal';
import { JoinServerModal } from './components/modals/JoinServerModal';
import { CreateChannelModal } from './components/modals/CreateChannelModal';
import { CreateCategoryModal } from './components/modals/CreateCategoryModal';
import { InviteModal } from './components/modals/InviteModal';
import { UserSettingsModal } from './components/modals/UserSettingsModal';
import { QuickSwitcherModal } from './components/modals/QuickSwitcherModal';
import { ServerSettingsModal } from './components/modals/ServerSettingsModal';
import { DMConversation } from './types';

const MainLayout: React.FC = () => {
  const [activeView, setActiveView] = useState<'server' | 'dm'>('server');
  const [showMembers, setShowMembers] = useState(true);
  const [activeDMConversation, setActiveDMConversation] = useState<DMConversation | null>(null);

  // Modals state
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [isJoinServerOpen, setIsJoinServerOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>(undefined);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);

  // Global keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSwitcherOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden bg-discord-tertiary select-none">
      {/* 1. Leftmost Server Bar */}
      <ServerSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenCreateServer={() => setIsCreateServerOpen(true)}
        onOpenJoinServer={() => setIsJoinServerOpen(true)}
      />

      {/* 2. Content Area depending on activeView (Server vs DM) */}
      {activeView === 'server' ? (
        <>
          {/* Channel Sidebar (Column 2) */}
          <ChannelSidebar
            onOpenCreateChannel={(catId) => {
              setDefaultCategoryId(catId);
              setIsCreateChannelOpen(true);
            }}
            onOpenCreateCategory={() => setIsCreateCategoryOpen(true)}
            onOpenServerSettings={() => setIsServerSettingsOpen(true)}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
            onOpenUserSettings={() => setIsUserSettingsOpen(true)}
          />

          {/* Main Chat Feed */}
          <ChatArea
            showMembers={showMembers}
            onToggleMembers={() => setShowMembers(!showMembers)}
            onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
          />

          {/* Right Member Sidebar */}
          {showMembers && <MemberSidebar />}
        </>
      ) : (
        <>
          {/* DM Conversation List */}
          <DMList
            activeConversation={activeDMConversation}
            onSelectConversation={(conv) => setActiveDMConversation(conv)}
            onOpenUserSettings={() => setIsUserSettingsOpen(true)}
          />

          {/* DM Chat Feed */}
          <DMChat conversation={activeDMConversation} />
        </>
      )}

      {/* Modals */}
      <CreateServerModal
        isOpen={isCreateServerOpen}
        onClose={() => setIsCreateServerOpen(false)}
        onOpenJoinServer={() => setIsJoinServerOpen(true)}
      />
      <JoinServerModal isOpen={isJoinServerOpen} onClose={() => setIsJoinServerOpen(false)} />
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        defaultCategoryId={defaultCategoryId}
      />
      <CreateCategoryModal isOpen={isCreateCategoryOpen} onClose={() => setIsCreateCategoryOpen(false)} />
      <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      <UserSettingsModal isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} />
      <ServerSettingsModal isOpen={isServerSettingsOpen} onClose={() => setIsServerSettingsOpen(false)} />
      <QuickSwitcherModal isOpen={isQuickSwitcherOpen} onClose={() => setIsQuickSwitcherOpen(false)} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ServerProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </ServerProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
