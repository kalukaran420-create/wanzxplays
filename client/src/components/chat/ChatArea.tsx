import React, { useState, useEffect, useRef } from 'react';
import { useServer } from '../../context/ServerContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { MessageItem } from './MessageItem';
import { VoiceChannelView } from './VoiceChannelView';
import { Message, User } from '../../types';
import { api } from '../../services/api';
import { UserProfileModal } from '../modals/UserProfileModal';
import { ImageLightboxModal } from '../modals/ImageLightboxModal';
import { QuickSwitcherModal } from '../modals/QuickSwitcherModal';
import { Hash, Volume2, Users, Paperclip, Send, Search, X, Sparkles } from 'lucide-react';

interface ChatAreaProps {
  onToggleMembers: () => void;
  showMembers: boolean;
  onOpenQuickSwitcher?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onToggleMembers, showMembers, onOpenQuickSwitcher }) => {
  const { activeServer, activeChannel } = useServer();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal triggers
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [selectedImageForLightbox, setSelectedImageForLightbox] = useState<string | null>(null);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch channel message history & setup socket room for TEXT channels
  useEffect(() => {
    if (!activeChannel || activeChannel.type === 'VOICE') return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/messages/channel/${activeChannel.id}`);
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error('Failed to fetch channel messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    if (socket) {
      // Emit room join event aliases for 100% compatibility
      socket.emit('join:channel', activeChannel.id);
      socket.emit('channel:join', activeChannel.id);

      const handleNewMessage = (newMessage: Message) => {
        if (newMessage.channelId === activeChannel.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          scrollToBottom();
        }
      };

      const handleUpdateMessage = (updatedMessage: Message) => {
        if (updatedMessage.channelId === activeChannel.id) {
          setMessages((prev) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)));
        }
      };

      const handleDeleteMessage = ({ messageId }: { messageId: string }) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      };

      const handleTypingStart = ({ username, channelId }: { username: string; channelId: string }) => {
        if (channelId === activeChannel.id && username !== user?.username) {
          setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
        }
      };

      const handleTypingStop = ({ username, channelId }: { username: string; channelId: string }) => {
        if (channelId === activeChannel.id) {
          setTypingUsers((prev) => prev.filter((u) => u !== username));
        }
      };

      socket.on('message:new', handleNewMessage);
      socket.on('message:update', handleUpdateMessage);
      socket.on('message:delete', handleDeleteMessage);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);

      return () => {
        socket.emit('leave:channel', activeChannel.id);
        socket.emit('channel:leave', activeChannel.id);
        socket.off('message:new', handleNewMessage);
        socket.off('message:update', handleUpdateMessage);
        socket.off('message:delete', handleDeleteMessage);
        socket.off('typing:start', handleTypingStart);
        socket.off('typing:stop', handleTypingStop);
      };
    }
  }, [activeChannel, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (socket && activeChannel) {
      socket.emit('typing:start', { channelId: activeChannel.id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { channelId: activeChannel.id });
      }, 2000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachment(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setAttachmentPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;
    if (!activeChannel) return;

    const formData = new FormData();
    formData.append('channelId', activeChannel.id);
    if (inputText.trim()) formData.append('content', inputText.trim());
    if (attachment) formData.append('attachment', attachment);

    setInputText('');
    clearAttachment();

    try {
      const res = await api.post('/messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.message.id)) return prev;
          return [...prev, res.data.message];
        });
        scrollToBottom();
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await api.patch(`/messages/${messageId}`, { content: newContent });
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await api.delete(`/messages/${messageId}`);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await api.post(`/messages/${messageId}/reactions`, { emoji });
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 bg-cyber-chat flex flex-col items-center justify-center text-cyber-muted p-8 select-none">
        <div className="w-16 h-16 rounded-3xl bg-cyber-input flex items-center justify-center mb-4 border border-cyber-border">
          <Hash className="w-8 h-8 text-cyber-violet" />
        </div>
        <h3 className="text-lg font-extrabold text-white mb-1">Select a channel to start messaging</h3>
        <p className="text-xs text-cyber-muted">Choose a text or voice channel from the left sidebar.</p>
      </div>
    );
  }

  if (activeChannel.type === 'VOICE') {
    return <VoiceChannelView channel={activeChannel} />;
  }

  return (
    <div className="flex-1 bg-cyber-chat flex flex-col h-full overflow-hidden relative">
      {/* Channel Header Bar */}
      <div className="h-14 border-b border-cyber-border px-6 flex items-center justify-between shadow-sm bg-cyber-chat/80 backdrop-blur-md z-10 select-none">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Hash className="w-5 h-5 text-cyber-muted flex-shrink-0" />
          <span className="font-extrabold text-white text-base truncate">{activeChannel.name}</span>
          {activeChannel.topic && (
            <span className="text-xs text-cyber-muted border-l border-cyber-border pl-3 truncate max-w-md hidden md:inline">
              {activeChannel.topic}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            onClick={() => {
              if (onOpenQuickSwitcher) onOpenQuickSwitcher();
              else setIsQuickSwitcherOpen(true);
            }}
            className="p-2 text-cyber-muted hover:text-white rounded-xl bg-cyber-input border border-cyber-border transition-colors hidden sm:flex items-center space-x-1 text-xs font-bold"
            title="Quick Switcher (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-cyber-cyan" />
            <span className="text-[10px] text-cyber-muted font-mono bg-cyber-base px-1.5 py-0.5 rounded">Ctrl+K</span>
          </button>

          <button
            onClick={onToggleMembers}
            className={`p-2 rounded-xl border transition-colors ${
              showMembers
                ? 'bg-cyber-violet/20 text-cyber-violet border-cyber-violet/40'
                : 'bg-cyber-input text-cyber-muted hover:text-white border-cyber-border'
            }`}
            title="Toggle Member List"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Feed */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {loading && messages.length === 0 ? (
          <div className="p-8 text-center text-xs text-cyber-muted font-bold flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyber-violet animate-spin" />
            <span>Loading channel history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-cyber-muted my-auto select-none">
            <div className="w-16 h-16 rounded-3xl bg-cyber-input flex items-center justify-center mx-auto mb-3 border border-cyber-border">
              <Hash className="w-8 h-8 text-cyber-cyan" />
            </div>
            <h3 className="text-base font-extrabold text-white">Welcome to #{activeChannel.name}!</h3>
            <p className="text-xs text-cyber-muted mt-1">This is the start of the #{activeChannel.name} channel.</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              onOpenProfile={(u) => setSelectedUserForProfile(u)}
              onOpenImage={(url) => setSelectedImageForLightbox(url)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1 text-[11px] text-cyber-cyan font-bold italic animate-pulse">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Message Input Box & Attachment Bar */}
      <div className="p-4 pt-1 bg-cyber-chat select-none">
        {/* File attachment preview badge */}
        {attachment && (
          <div className="mb-2 p-2 px-3 bg-cyber-input border border-cyber-border rounded-2xl flex items-center justify-between max-w-sm shadow-md animate-fade-in">
            <div className="flex items-center space-x-2.5 min-w-0">
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="Preview" className="w-9 h-9 rounded-xl object-cover border border-white/10" />
              ) : (
                <Paperclip className="w-5 h-5 text-cyber-cyan flex-shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{attachment.name}</div>
                <div className="text-[10px] text-cyber-muted font-mono">{(attachment.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <button onClick={clearAttachment} className="p-1 text-cyber-muted hover:text-white rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-3.5 p-2 text-cyber-muted hover:text-cyber-cyan rounded-xl transition-colors z-10"
            title="Attach file (up to 50MB)"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message #${activeChannel.name}`}
            className="w-full pl-12 pr-14 py-3.5 bg-cyber-input text-white rounded-2xl outline-none border border-cyber-border focus:border-cyber-violet text-sm transition-all shadow-inner"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && !attachment}
            className="absolute right-3 p-2 bg-aurora-gradient hover:bg-aurora-hover text-white rounded-xl shadow-glow-violet transition-all disabled:opacity-30 disabled:shadow-none"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Modals */}
      <UserProfileModal
        user={selectedUserForProfile}
        isOpen={!!selectedUserForProfile}
        onClose={() => setSelectedUserForProfile(null)}
      />

      <ImageLightboxModal
        imageUrl={selectedImageForLightbox}
        isOpen={!!selectedImageForLightbox}
        onClose={() => setSelectedImageForLightbox(null)}
      />

      <QuickSwitcherModal
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
      />
    </div>
  );
};
