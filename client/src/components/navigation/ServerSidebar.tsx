import React, { useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { Sparkles, Plus, Compass, MessageSquare } from 'lucide-react';

interface ServerSidebarProps {
  onOpenCreateServer: () => void;
  onOpenJoinServer: () => void;
  activeView: 'server' | 'dm';
  setActiveView: (view: 'server' | 'dm') => void;
}

export const ServerSidebar: React.FC<ServerSidebarProps> = ({
  onOpenCreateServer,
  onOpenJoinServer,
  activeView,
  setActiveView,
}) => {
  const { servers, activeServer, selectServer } = useServer();

  return (
    <div className="w-[72px] bg-discord-tertiary flex flex-col items-center py-3 space-y-2 border-r border-black/20 flex-shrink-0 select-none z-20">
      {/* Direct Messages / Home Button */}
      <div className="relative group flex items-center justify-center w-full">
        <div
          className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
            activeView === 'dm' ? 'h-10' : 'h-0 group-hover:h-5'
          }`}
        />
        <button
          onClick={() => setActiveView('dm')}
          className={`w-12 h-12 rounded-3xl group-hover:rounded-2xl flex items-center justify-center transition-all duration-200 ${
            activeView === 'dm'
              ? 'bg-discord-brand text-white rounded-2xl shadow-lg shadow-discord-brand/40'
              : 'bg-discord-primary text-discord-text group-hover:bg-discord-brand group-hover:text-white'
          }`}
          title="Direct Messages"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      <div className="w-8 h-[2px] bg-white/10 rounded my-1" />

      {/* Server List */}
      <div className="flex-1 w-full space-y-2 overflow-y-auto no-scrollbar flex flex-col items-center">
        {servers.map((server) => {
          const isActive = activeView === 'server' && activeServer?.id === server.id;
          const initials = server.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 3)
            .toUpperCase();

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Active / Hover Indicator Pill */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
                  isActive ? 'h-10' : 'h-0 group-hover:h-5'
                }`}
              />

              <button
                onClick={() => {
                  setActiveView('server');
                  selectServer(server.id);
                }}
                className={`w-12 h-12 rounded-3xl group-hover:rounded-2xl flex items-center justify-center transition-all duration-200 overflow-hidden ${
                  isActive
                    ? 'bg-discord-brand text-white rounded-2xl shadow-lg shadow-discord-brand/40'
                    : 'bg-discord-primary text-discord-text group-hover:bg-discord-brand group-hover:text-white'
                }`}
                title={server.name}
              >
                {server.icon ? (
                  <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-sm tracking-wider">{initials}</span>
                )}
              </button>
            </div>
          );
        })}

        {/* Add Server Button */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          <button
            onClick={onOpenCreateServer}
            className="w-12 h-12 rounded-3xl hover:rounded-2xl bg-discord-primary hover:bg-discord-green text-discord-green hover:text-white flex items-center justify-center transition-all duration-200 group-hover:shadow-lg group-hover:shadow-discord-green/30"
            title="Add a Server"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Join Public Server Invite Button */}
        <div className="relative group flex items-center justify-center w-full">
          <button
            onClick={onOpenJoinServer}
            className="w-12 h-12 rounded-3xl hover:rounded-2xl bg-discord-primary hover:bg-discord-brand text-discord-text hover:text-white flex items-center justify-center transition-all duration-200"
            title="Join Server with Invite Link"
          >
            <Compass className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
