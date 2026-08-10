import React, { useState, useEffect, useRef } from 'react';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { DMConversation, DirectMessage } from '../../types';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { MessageSquare, Paperclip, Send, X, FileText, Download } from 'lucide-react';

interface DMChatProps {
  conversation: DMConversation | null;
}

export const DMChat: React.FC<DMChatProps> = ({ conversation }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherUser = conversation?.participants?.find((p) => p.userId !== user?.id)?.user;

  useEffect(() => {
    if (!conversation) return;

    const fetchDMMessages = async () => {
      try {
        const res = await api.get(`/dms/conversations/${conversation.id}/messages`);
        setMessages(res.data.messages);
      } catch (err) {
        console.error('Failed to fetch DM messages:', err);
      }
    };

    fetchDMMessages();

    if (socket) {
      socket.emit('dm:join', conversation.id);

      const handleNewDM = (newMsg: DirectMessage) => {
        if (newMsg.conversationId === conversation.id) {
          setMessages((prev) => [...prev, newMsg]);
        }
      };

      socket.on('dm:new', handleNewDM);

      return () => {
        socket.off('dm:new', handleNewDM);
      };
    }
  }, [conversation, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;
    if (!conversation) return;

    const formData = new FormData();
    formData.append('conversationId', conversation.id);
    if (inputText.trim()) formData.append('content', inputText.trim());
    if (attachment) formData.append('attachment', attachment);

    setInputText('');
    setAttachment(null);
    setAttachmentPreview(null);

    try {
      await api.post('/dms/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error('Failed to send direct message:', err);
    }
  };

  if (!conversation || !otherUser) {
    return (
      <div className="flex-1 bg-discord-primary flex flex-col items-center justify-center text-discord-muted p-8 text-center">
        <MessageSquare className="w-16 h-16 text-discord-brand/40 mb-3" />
        <h3 className="text-xl font-bold text-white mb-1">Your Direct Messages</h3>
        <p className="text-xs max-w-sm">Select a friend from the list or start a new conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-discord-primary flex flex-col h-full overflow-hidden">
      {/* DM Header */}
      <div className="h-12 border-b border-black/20 px-4 flex items-center space-x-3 shadow-sm bg-discord-primary z-10">
        <img
          src={resolveMediaUrl(otherUser.avatar) || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.username}`}
          alt={otherUser.username}
          className="w-7 h-7 rounded-full bg-discord-tertiary object-cover"
        />
        <span className="font-bold text-white text-base truncate">{otherUser.displayName || otherUser.username}</span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-4 space-y-3">
        <div className="mb-6">
          <img
            src={resolveMediaUrl(otherUser.avatar) || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.username}`}
            alt={otherUser.username}
            className="w-20 h-20 rounded-full bg-discord-secondary object-cover mb-2"
          />
          <h1 className="text-2xl font-bold text-white">{otherUser.displayName || otherUser.username}</h1>
          <p className="text-xs text-discord-muted mt-1">
            This is the beginning of your direct message history with @{otherUser.username}.
          </p>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className="flex space-x-3 group">
            <img
              src={resolveMediaUrl(msg.sender?.avatar) || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender?.username}`}
              alt={msg.sender?.username}
              className="w-10 h-10 rounded-full bg-discord-tertiary object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2">
                <span className="font-bold text-sm text-white">{msg.sender?.displayName || msg.sender?.username}</span>
                <span className="text-[11px] text-discord-muted">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-discord-text mt-0.5">{msg.content}</div>

              {msg.fileUrl && (
                <div className="mt-2">
                  {msg.fileType === 'image' ? (
                    <img src={msg.fileUrl} alt="DM attachment" className="max-w-xs rounded-lg border border-white/10" />
                  ) : (
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-2 bg-discord-tertiary p-2 rounded text-xs text-discord-brand"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Download Attachment</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* DM Message Input */}
      <form onSubmit={handleSendDM} className="px-4 pb-6 pt-1">
        <div className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center space-x-3 border border-transparent focus-within:border-discord-brand shadow-inner">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message @${otherUser.username}`}
            className="flex-1 bg-transparent text-white placeholder-discord-muted outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 bg-discord-brand hover:bg-discord-brand-hover text-white rounded-md transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
