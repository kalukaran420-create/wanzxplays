import React, { createContext, useContext, useState, useEffect } from 'react';
import { Server, Channel, Category } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface ServerContextType {
  servers: Server[];
  activeServer: Server | null;
  activeChannel: Channel | null;
  connectedVoiceChannel: Channel | null;
  loading: boolean;
  selectServer: (serverId: string) => Promise<void>;
  selectChannel: (channel: Channel) => void;
  setConnectedVoiceChannel: (channel: Channel | null) => void;
  refreshServers: () => Promise<void>;
  createServer: (name: string, description?: string, icon?: string) => Promise<Server>;
  joinServer: (inviteCode: string) => Promise<string>;
  createCategory: (serverId: string, name: string) => Promise<Category>;
  createChannel: (serverId: string, name: string, type: 'TEXT' | 'VOICE', categoryId?: string, topic?: string) => Promise<Channel>;
  deleteChannel: (channelId: string) => Promise<void>;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [connectedVoiceChannel, setConnectedVoiceChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshServers = async () => {
    if (!user) return;
    try {
      const res = await api.get('/servers');
      setServers(res.data.servers);

      // Maintain active server reference if exists
      if (activeServer) {
        const updatedActive = res.data.servers.find((s: Server) => s.id === activeServer.id);
        if (updatedActive) {
          fetchServerDetails(updatedActive.id);
        }
      } else if (res.data.servers.length > 0) {
        fetchServerDetails(res.data.servers[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch user servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServerDetails = async (serverId: string) => {
    try {
      const res = await api.get(`/servers/${serverId}`);
      const serverDetails: Server = res.data.server;
      setActiveServer(serverDetails);

      // Select default text channel if active channel is not set or not in this server
      if (!activeChannel || activeChannel.serverId !== serverId) {
        const allChannels = serverDetails.channels || [];
        const textChannel = allChannels.find((c) => c.type === 'TEXT') || allChannels[0];
        setActiveChannel(textChannel || null);
      }
    } catch (err) {
      console.error('Failed to fetch server details:', err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshServers();
    } else {
      setServers([]);
      setActiveServer(null);
      setActiveChannel(null);
      setLoading(false);
    }
  }, [user]);

  const selectServer = async (serverId: string) => {
    await fetchServerDetails(serverId);
  };

  const selectChannel = (channel: Channel) => {
    setActiveChannel(channel);
  };

  const createServer = async (name: string, description?: string, icon?: string): Promise<Server> => {
    const res = await api.post('/servers', { name, description, icon });
    const newServer = res.data.server;
    await refreshServers();
    await fetchServerDetails(newServer.id);
    return newServer;
  };

  const joinServer = async (inviteCode: string): Promise<string> => {
    const res = await api.post('/servers/join', { inviteCode });
    const joinedServerId = res.data.serverId;
    await refreshServers();
    await fetchServerDetails(joinedServerId);
    return joinedServerId;
  };

  const createCategory = async (serverId: string, name: string): Promise<Category> => {
    const res = await api.post('/channels/categories', { serverId, name });
    await fetchServerDetails(serverId);
    return res.data.category;
  };

  const createChannel = async (
    serverId: string,
    name: string,
    type: 'TEXT' | 'VOICE',
    categoryId?: string,
    topic?: string
  ): Promise<Channel> => {
    const res = await api.post('/channels', { serverId, name, type, categoryId, topic });
    const newChannel = res.data.channel;
    await fetchServerDetails(serverId);
    if (type === 'TEXT') {
      setActiveChannel(newChannel);
    }
    return newChannel;
  };

  const deleteChannel = async (channelId: string) => {
    await api.delete(`/channels/${channelId}`);
    if (activeServer) {
      await fetchServerDetails(activeServer.id);
    }
  };

  return (
    <ServerContext.Provider
      value={{
        servers,
        activeServer,
        activeChannel,
        connectedVoiceChannel,
        loading,
        selectServer,
        selectChannel,
        setConnectedVoiceChannel,
        refreshServers,
        createServer,
        joinServer,
        createCategory,
        createChannel,
        deleteChannel,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
};
