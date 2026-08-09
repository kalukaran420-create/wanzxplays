import React, { useState, useEffect, useRef } from 'react';
import { useServer } from '../../context/ServerContext';
import { Plus, Compass, Zap } from 'lucide-react';

interface ServerSidebarProps {
  onOpenCreateServer: () => void;
  onOpenJoinServer?: () => void;
  onOpenExploreServers?: () => void;
  activeView?: 'server' | 'dm';
  setActiveView?: (view: 'server' | 'dm') => void;
}

const MIN_WIDTH = 56;
const MAX_WIDTH = 140;
const DEFAULT_WIDTH = 72;

export const ServerSidebar: React.FC<ServerSidebarProps> = ({
  onOpenCreateServer,
  onOpenJoinServer,
  onOpenExploreServers,
  activeView = 'server',
  setActiveView,
}) => {
  const { servers, activeServer, selectServer } = useServer();

  const [railWidth, setRailWidth] = useState<number>(() => {
    const saved = localStorage.getItem('pulsecord_server_rail_width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        return parsed;
      }
    }
    return DEFAULT_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: DEFAULT_WIDTH });

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startWidth: railWidth };
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragRef.current.startWidth + deltaX));
      setRailWidth(newWidth);
      localStorage.setItem('pulsecord_server_rail_width', newWidth.toString());
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      style={{ width: `${railWidth}px`, minWidth: `${railWidth}px`, maxWidth: `${railWidth}px` }}
      className={`bg-cyber-base flex flex-col items-center py-3 space-y-2 select-none flex-shrink-0 border-r border-cyber-border z-20 relative ${
        isResizing ? 'select-none' : ''
      }`}
    >
      {/* Active Drag Global Overlay */}
      {isResizing && <div className="fixed inset-0 cursor-col-resize z-50 select-none" />}

      {/* Resize Handle on Right Edge (Server Rail <-> Channel List) */}
      <div
        onMouseDown={startResizing}
        className={`absolute top-0 -right-2 w-4 h-full cursor-col-resize hover:bg-cyber-violet/60 transition-colors z-40 ${
          isResizing ? 'bg-cyber-violet' : ''
        }`}
        title="Drag to resize server rail"
      />
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
