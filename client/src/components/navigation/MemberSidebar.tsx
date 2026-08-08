import React, { useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { Crown, ShieldCheck } from 'lucide-react';
import { UserStatus, User } from '../../types';
import { UserProfileModal } from '../modals/UserProfileModal';

export const MemberSidebar: React.FC = () => {
  const { activeServer } = useServer();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  if (!activeServer || !activeServer.members) return null;

  const getStatusColor = (status?: UserStatus) => {
    switch (status) {
      case 'online': return 'bg-discord-green';
      case 'idle': return 'bg-discord-yellow';
      case 'dnd': return 'bg-discord-red';
      case 'offline': default: return 'bg-discord-gray';
    }
  };

  const onlineMembers = activeServer.members.filter((m) => m.user?.status && m.user.status !== 'offline');
  const offlineMembers = activeServer.members.filter((m) => !m.user?.status || m.user.status === 'offline');

  return (
    <div className="w-60 bg-discord-secondary flex flex-col border-l border-black/20 select-none flex-shrink-0">
      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        {/* Online Section */}
        {onlineMembers.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-discord-muted uppercase tracking-wider mb-2 px-1">
              Online — {onlineMembers.length}
            </div>

            <div className="space-y-1">
              {onlineMembers.map((member) => {
                const isOwner = member.userId === activeServer.ownerId;
                const user = member.user;

                return (
                  <div
                    key={member.id}
                    onClick={() => user && setSelectedUser(user)}
                    className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-discord-hover transition-colors cursor-pointer group"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
                        alt={user?.username}
                        className="w-8 h-8 rounded-full bg-discord-tertiary object-cover"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-secondary ${getStatusColor(
                          user?.status
                        )}`}
                      />
                    </div>

                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold text-xs text-discord-text group-hover:text-white truncate">
                          {member.nickname || user?.displayName || user?.username}
                        </span>
                        {isOwner && (
                          <span title="Server Owner">
                            <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                      {user?.customStatus && (
                        <div className="text-[10px] text-discord-muted truncate">{user.customStatus}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Offline Section */}
        {offlineMembers.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-discord-muted uppercase tracking-wider mb-2 px-1">
              Offline — {offlineMembers.length}
            </div>

            <div className="space-y-1">
              {offlineMembers.map((member) => {
                const isOwner = member.userId === activeServer.ownerId;
                const user = member.user;

                return (
                  <div
                    key={member.id}
                    onClick={() => user && setSelectedUser(user)}
                    className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-discord-hover transition-colors cursor-pointer opacity-70 hover:opacity-100 group"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
                        alt={user?.username}
                        className="w-8 h-8 rounded-full bg-discord-tertiary object-cover grayscale"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-secondary bg-discord-gray" />
                    </div>

                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold text-xs text-discord-muted group-hover:text-white truncate">
                          {member.nickname || user?.displayName || user?.username}
                        </span>
                        {isOwner && (
                          <span title="Server Owner">
                            <Crown className="w-3.5 h-3.5 text-yellow-400/70 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <UserProfileModal
        user={selectedUser}
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
};
