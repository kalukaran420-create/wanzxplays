import React, { useState } from 'react';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { Message, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SendGiftModal } from '../modals/SendGiftModal';
import { Smile, Edit2, Trash2, Gift as GiftIcon, FileText, Download } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenProfile: (user: User) => void;
  onOpenImage: (url: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🚀', '🎉'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onOpenProfile,
  onOpenImage,
}) => {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  const isAuthor = currentUser?.id === message.authorId;
  const isMyMessage = isAuthor;
  const alignRight = !isMyMessage;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`relative group px-6 py-2 hover:bg-cyber-hover/50 transition-all duration-200 rounded-2xl flex items-start space-x-3.5 select-text ${alignRight ? 'flex-row-reverse space-x-reverse text-right' : ''}`}>
      {/* Floating Action Toolbar on Hover */}
      <div className={`absolute ${alignRight ? 'left-6' : 'right-6'} -top-3 hidden group-hover:flex items-center space-x-1 bg-cyber-input border border-cyber-border rounded-xl p-1 shadow-2xl z-20 animate-fade-in`}>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 text-cyber-muted hover:text-cyber-cyan hover:bg-white/10 rounded-lg transition-all"
          title="Add Reaction"
        >
          <Smile className="w-4 h-4" />
        </button>

        {!isAuthor && (
          <button
            onClick={() => setIsGiftModalOpen(true)}
            className="p-1.5 text-cyber-muted hover:text-cyber-violet hover:bg-white/10 rounded-lg transition-all"
            title="Send Gift to Author"
          >
            <GiftIcon className="w-4 h-4" />
          </button>
        )}

        {isAuthor && (
          <>
            {Date.now() - new Date(message.createdAt).getTime() < 5 * 60 * 1000 && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-1.5 text-cyber-muted hover:text-cyber-violet hover:bg-white/10 rounded-lg transition-all"
                title="Edit Message"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onDeleteMessage(message.id)}
              className="p-1.5 text-cyber-muted hover:text-cyber-rose hover:bg-cyber-rose/10 rounded-lg transition-all"
              title="Delete Message"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Floating Quick Emoji Picker */}
      {showEmojiPicker && (
        <div className={`absolute ${alignRight ? 'left-6' : 'right-6'} top-8 bg-cyber-input border border-cyber-border rounded-2xl p-2 shadow-2xl z-30 flex items-center space-x-1 animate-fade-in`}>
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onToggleReaction(message.id, emoji);
                setShowEmojiPicker(false);
              }}
              className="p-1.5 text-base hover:bg-white/10 rounded-xl transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Author Avatar (GIF supported) */}
      <button
        onClick={() => message.author && onOpenProfile(message.author)}
        className="relative flex-shrink-0 mt-0.5"
      >
        <img
          src={resolveMediaUrl(message.author?.avatar) || `https://api.dicebear.com/7.x/bottts/svg?seed=${message.author?.username}`}
          alt={message.author?.username}
          className="w-10 h-10 rounded-full bg-cyber-input object-cover border border-white/10 hover:border-cyber-cyan transition-colors shadow-md"
        />
      </button>

      {/* Message Content Container */}
      <div className={`flex-1 min-w-0 ${alignRight ? 'flex flex-col items-end text-right' : ''}`}>
        <div className={`flex items-baseline space-x-2 ${alignRight ? 'justify-end flex-row-reverse space-x-reverse' : ''}`}>
          <button
            onClick={() => message.author && onOpenProfile(message.author)}
            className="font-bold text-sm text-white hover:underline hover:text-cyber-cyan transition-colors flex items-center space-x-1.5"
          >
            <span>{message.author?.displayName || message.author?.username || 'Unknown User'}</span>
            {message.author?.customTag && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyber-violet/20 border border-cyber-violet/40 text-cyber-violet font-extrabold no-underline">
                {message.author.customTag}
              </span>
            )}
          </button>
          <span className="text-[11px] text-cyber-muted font-medium">{formattedTime}</span>
        </div>

        {/* Message Content or Edit Form */}
        {isEditing ? (
          <div className="mt-1">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-cyber-input text-white border border-cyber-violet rounded-xl px-3 py-1.5 text-sm outline-none shadow-glow-violet"
              autoFocus
            />
            <div className="flex items-center space-x-2 text-[11px] text-cyber-muted mt-1">
              <span>escape to cancel • enter to save</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-cyber-text font-normal mt-0.5 leading-relaxed break-words">
            {message.content}
          </div>
        )}

        {/* File Attachment */}
        {message.fileUrl && (
          <div className={`mt-2.5 flex ${alignRight ? 'justify-end' : ''}`}>
            {message.fileType === 'image' ? (
              <img
                src={resolveMediaUrl(message.fileUrl)}
                alt="Attachment"
                onClick={() => onOpenImage(message.fileUrl!)}
                className="max-w-sm max-h-72 rounded-2xl border border-white/10 cursor-pointer object-cover shadow-xl hover:opacity-95 hover:border-cyber-cyan/50 transition-all"
              />
            ) : (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-3 p-3 bg-cyber-input rounded-2xl border border-cyber-border w-max max-w-xs hover:border-cyber-cyan/40 transition-all shadow-md group/file"
              >
                <div className="p-2 rounded-xl bg-cyber-violet/20 text-cyber-violet group-hover/file:bg-cyber-violet group-hover/file:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Attachment File</div>
                  <div className="text-[10px] text-cyber-muted flex items-center space-x-1">
                    <Download className="w-3 h-3" />
                    <span>Click to download</span>
                  </div>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Emoji Reactions List */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 mt-2 ${alignRight ? 'justify-end' : ''}`}>
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = acc[r.emoji] || [];
                acc[r.emoji].push(r);
                return acc;
              }, {} as { [emoji: string]: typeof message.reactions })
            ).map(([emoji, reactions]) => {
              const hasReacted = reactions.some((r) => r.userId === currentUser?.id);

              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(message.id, emoji)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 ${
                    hasReacted
                      ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 shadow-glow-cyan'
                      : 'bg-cyber-input text-cyber-muted hover:bg-cyber-hover hover:text-white border border-white/5'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{reactions.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SendGiftModal
        receiver={message.author}
        channelId={message.channelId}
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
      />
    </div>
  );
};
