import React, { useState, useEffect, useRef } from 'react';
import { useServer } from '../../context/ServerContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { MessageItem } from './MessageItem';
import { Message, User } from '../../types';
import { api } from '../../services/api';
import { UserProfileModal } from '../modals/UserProfileModal';
import { ImageLightboxModal } from '../modals/ImageLightboxModal';
import { QuickSwitcherModal } from '../modals/QuickSwitcherModal';
import { Hash, Volume2, Users, Paperclip, Send, Search, X } from 'lucide-react';

interface ChatAreaProps {
  onToggleMembers: () => void;
  showMembers: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onToggleMembers, showMembers }) => {
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

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch channel message history & setup socket room
  useEffect(() => {
    if (!activeChannel) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/messages/channel/${activeChannel.id}`);
        setMessages(res.data.messages);
      } catch (err) {
        console.error('Failed to fetch channel messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    if (socket) {
      socket.emit('channel:join', activeChannel.id);

      const handleNewMessage = (newMessage: Message) => {
        if (newMessage.channelId === activeChannel.id) {
          setMessages((prev) => [...prev, newMessage]);
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

  // Handle typing indicator emission
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (socket && activeChannel) {
      socket.emit('typing:start', { channelId: activeChannel.id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { channelId: activeChannel.id });
      }, 2500);
    }
  };

  // Attachment select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachment(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachmentPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
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
    setAttachment(null);
    setAttachmentPreview(null);

    if (socket && activeChannel) {
      socket.emit('typing:stop', { channelId: activeChannel.id });
    }

    try {
      await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
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
      <div className="flex-1 bg-discord-primary flex items-center justify-center text-discord-muted">
        Select a channel to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 bg-discord-primary flex flex-col h-full overflow-hidden relative">
      {/* Header Bar */}
      <div className="h-12 border-b border-black/20 px-4 flex items-center justify-between shadow-sm bg-discord-primary z-10">
        <div className="flex items-center space-x-2 min-w-0">
          {activeChannel.type === 'VOICE' ? (
            <Volume2 className="w-5 h-5 text-discord-muted flex-shrink-0" />
          ) : (
            <Hash className="w-5 h-5 text-discord-muted flex-shrink-0" />
          )}
          <span className="font-bold text-white text-base truncate">{activeChannel.name}</span>
          {activeChannel.topic && (
            <>
              <div className="w-px h-4 bg-white/10 mx-2" />
              <span className="text-xs text-discord-muted truncate font-normal">{activeChannel.topic}</span>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsQuickSwitcherOpen(true)}
            className="hidden md:flex items-center space-x-2 bg-discord-tertiary px-3 py-1 rounded-md text-xs text-discord-muted hover:text-discord-text transition-colors border border-white/5"
            title="Quick Switcher (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-discord-brand" />
            <span>Search channels...</span>
            <kbd className="px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-mono text-discord-muted">Ctrl K</kbd>
          </button>

          <button
            onClick={onToggleMembers}
            className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
              showMembers ? 'text-white' : 'text-discord-muted hover:text-white'
            }`}
            title="Toggle Member List"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Feed */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {/* Welcome Channel Banner */}
        <div className="px-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-discord-secondary flex items-center justify-center mb-2 shadow-lg">
            <Hash className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to #{activeChannel.name}!</h1>
          <p className="text-xs text-discord-muted mt-1">
            This is the start of the #{activeChannel.name} channel in {activeServer?.name}.
          </p>
        </div>

        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onToggleReaction={handleToggleReaction}
            onOpenProfile={(author) => setSelectedUserForProfile(author)}
            onOpenImage={(url) => setSelectedImageForLightbox(url)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-discord-muted font-medium flex items-center space-x-1 animate-pulse">
          <span className="font-bold text-white">{typingUsers.join(', ')}</span>
          <span>{typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
        </div>
      )}

      {/* File Attachment Preview */}
      {attachment && (
        <div className="mx-4 mb-2 p-2 bg-discord-secondary rounded-xl border border-white/10 flex items-center justify-between w-max max-w-xs shadow-lg">
          <div className="flex items-center space-x-2 min-w-0">
            {attachmentPreview ? (
              <img src={attachmentPreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <Paperclip className="w-6 h-6 text-discord-brand" />
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{attachment.name}</div>
              <div className="text-[10px] text-discord-muted">{(attachment.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
          <button
            onClick={() => {
              setAttachment(null);
              setAttachmentPreview(null);
            }}
            className="p-1 text-discord-muted hover:text-discord-red rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Input Box */}
      <form onSubmit={handleSendMessage} className="px-4 pb-6 pt-1">
        <div className="bg-[#383a40] rounded-xl px-4 py-2.5 flex items-center space-x-3 border border-transparent focus-within:border-discord-brand transition-colors shadow-inner">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-full bg-discord-muted/20 hover:bg-discord-brand hover:text-white text-discord-muted transition-colors flex-shrink-0"
            title="Upload File or Image"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message #${activeChannel.name}`}
            className="flex-1 bg-transparent text-white placeholder-discord-muted outline-none text-sm font-normal"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && !attachment}
            className="p-1.5 bg-discord-brand hover:bg-discord-brand-hover text-white rounded-md transition-colors disabled:opacity-40 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Modals */}
      <UserProfileModal
        user={selectedUserForProfile}
        isOpen={Boolean(selectedUserForProfile)}
        onClose={() => setSelectedUserForProfile(null)}
      />
      <ImageLightboxModal
        imageUrl={selectedImageForLightbox}
        isOpen={Boolean(selectedImageForLightbox)}
        onClose={() => setSelectedImageForLightbox(null)}
      />
      <QuickSwitcherModal
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
      />
    </div>
  );
};
