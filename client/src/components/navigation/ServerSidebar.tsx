import React from 'react';
import { useServer } from '../../context/ServerContext';
import { Plus, Compass, Zap } from 'lucide-react';

interface ServerSidebarProps {
  onOpenCreateServer: () => void;
  onOpenJoinServer?: () => void;
  onOpenExploreServers?: () => void;
  activeView?: 'server' | 'dm';
  setActiveView?: (view: 'server' | 'dm') => void;
}

export const ServerSidebar: React.FC<ServerSidebarProps> = ({
  onOpenCreateServer,
  onOpenJoinServer,
  onOpenExploreServers,
  activeView = 'server',
  setActiveView,
}) => {
  const { servers, activeServer, selectServer } = useServer();

  return (
    <div className="w-[72px] min-w-[72px] max-w-[72px] bg-cyber-base flex flex-col items-center py-3 space-y-2 select-none flex-shrink-0 border-r border-cyber-border z-20">
      {/* App Home Button */}
      <div className="relative group flex items-center justify-center w-full">
        <div
          className={`absolute left-0 w-1 bg-gradient-to-b from-cyber-violet to-cyber-cyan rounded-r-full transition-all duration-300 ${
            activeView === 'dm' ? 'h-8 opacity-100 shadow-glow-violet' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-70'
          }`}
        />

        <button
          onClick={() => setActiveView?.('dm')}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-glow-violet transition-all duration-300 hover:rounded-xl group-hover:scale-105 ${
            activeView === 'dm' ? 'bg-aurora-gradient rounded-xl' : 'bg-cyber-panel border border-white/5 text-cyber-text hover:bg-cyber-hover'
          }`}
        >
          <Zap className="w-6 h-6 fill-white stroke-none" />
        </button>
      </div>

      <div className="w-8 h-[2px] bg-cyber-border rounded-full my-1" />

      {/* Server List */}
      <div className="flex-1 w-full space-y-2.5 overflow-y-auto no-scrollbar flex flex-col items-center px-2">
        {servers.map((server) => {
          const isActive = activeView === 'server' && activeServer?.id === server.id;

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Active Indicator Bar */}
              <div
                className={`absolute left-0 w-1 bg-gradient-to-b from-cyber-violet to-cyber-cyan rounded-r-full transition-all duration-300 ${
                  isActive
                    ? 'h-8 opacity-100 shadow-glow-violet'
                    : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-70'
                }`}
              />

              <button
                onClick={() => {
                  selectServer(server.id);
                  setActiveView?.('server');
                }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm transition-all duration-300 hover:rounded-xl group-hover:scale-105 overflow-hidden ${
                  isActive
                    ? 'bg-aurora-gradient rounded-xl shadow-glow-violet'
                    : 'bg-cyber-panel border border-white/5 text-cyber-text hover:bg-cyber-hover'
                }`}
              >
                {server.icon ? (
                  <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{server.name.substring(0, 2).toUpperCase()}</span>
                )}
              </button>

              {/* Tooltip */}
              <div className="absolute left-[80px] bg-cyber-input border border-cyber-border text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 animate-fade-in">
                {server.name}
              </div>
            </div>
          );
        })}

        {/* Create Server Button inside rail */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          <button
            onClick={onOpenCreateServer}
            className="w-12 h-12 rounded-2xl bg-cyber-panel border border-cyber-border flex items-center justify-center text-cyber-emerald hover:bg-cyber-emerald hover:text-white hover:border-cyber-emerald transition-all duration-300 hover:rounded-xl group-hover:scale-105 shadow-glow-emerald"
            title="Create a Server"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div className="absolute left-[80px] bg-cyber-input border border-cyber-border text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 animate-fade-in">
            Create Server
          </div>
        </div>

        {/* Explore Servers inside rail */}
        {onOpenExploreServers && (
          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={onOpenExploreServers}
              className="w-12 h-12 rounded-2xl bg-cyber-panel border border-cyber-border flex items-center justify-center text-cyber-cyan hover:bg-cyber-cyan hover:text-white hover:border-cyber-cyan transition-all duration-300 hover:rounded-xl group-hover:scale-105 shadow-glow-cyan"
              title="Explore Public Servers"
            >
              <Compass className="w-5 h-5" />
            </button>
            <div className="absolute left-[80px] bg-cyber-input border border-cyber-border text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 animate-fade-in">
              Explore Servers
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
