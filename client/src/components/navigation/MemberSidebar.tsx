import React from 'react';
import { useServer } from '../../context/ServerContext';
import { Crown, ShieldCheck } from 'lucide-react';
import { UserStatus } from '../../types';

export const MemberSidebar: React.FC = () => {
  const { activeServer } = useServer();

  if (!activeServer || !activeServer.members) return null;

  const getStatusColor = (status?: UserStatus) => {
    switch (status) {
      case 'online': return 'bg-cyber-emerald shadow-glow-emerald';
      case 'idle': return 'bg-cyber-amber';
      case 'dnd': return 'bg-cyber-rose';
      case 'offline': default: return 'bg-cyber-muted';
    }
  };

  const onlineMembers = activeServer.members.filter((m) => m.user?.status !== 'offline');
  const offlineMembers = activeServer.members.filter((m) => m.user?.status === 'offline');

  return (
    <div className="w-60 bg-cyber-panel border-l border-cyber-border flex flex-col select-none flex-shrink-0 z-10">
      <div className="p-3 text-xs font-extrabold uppercase tracking-wider text-cyber-muted border-b border-cyber-border">
        Members — {activeServer.members.length}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Online Members Section */}
        <div className="space-y-1">
          <div className="text-[11px] font-extrabold text-cyber-muted uppercase px-2 tracking-wider">
            Online — {onlineMembers.length}
          </div>

          {onlineMembers.map((member) => {
            const isOwner = activeServer.ownerId === member.userId;
            const isAdmin = member.roles?.some((r) => r.name.toLowerCase() === 'admin');

            return (
              <div
                key={member.id}
                className="flex items-center space-x-2.5 px-2 py-2 rounded-xl hover:bg-cyber-hover transition-all duration-200 cursor-pointer group"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={member.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user?.username}`}
                    alt={member.user?.username}
                    className="w-9 h-9 rounded-full bg-cyber-input object-cover border border-white/5 group-hover:border-cyber-cyan/40 transition-colors"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-cyber-panel ${getStatusColor(
                      member.user?.status
                    )}`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1 font-semibold text-xs text-cyber-text group-hover:text-white truncate">
                    <span className="truncate">{member.user?.displayName || member.user?.username}</span>
                    {isOwner && (
                      <span title="Server Owner">
                        <Crown className="w-3.5 h-3.5 text-cyber-amber flex-shrink-0" />
                      </span>
                    )}
                    {isAdmin && !isOwner && (
                      <span title="Server Admin">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyber-cyan flex-shrink-0" />
                      </span>
                    )}
                  </div>
                  {member.user?.customStatus && (
                    <div className="text-[10px] text-cyber-muted truncate">{member.user.customStatus}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Offline Members Section */}
        {offlineMembers.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold text-cyber-muted uppercase px-2 tracking-wider">
              Offline — {offlineMembers.length}
            </div>

            {offlineMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-2.5 px-2 py-2 rounded-xl hover:bg-cyber-hover transition-all duration-200 cursor-pointer opacity-60 hover:opacity-100 group"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={member.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user?.username}`}
                    alt={member.user?.username}
                    className="w-9 h-9 rounded-full bg-cyber-input object-cover border border-white/5"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-cyber-panel bg-cyber-muted" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-cyber-muted group-hover:text-white truncate">
                    {member.user?.displayName || member.user?.username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
