import React, { useState } from 'react';
import { Message, MessageReaction, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Smile, Edit2, Trash2, FileText, Download, Check, Copy, Code2 } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenProfile?: (user: User) => void;
  onOpenImage?: (imageUrl: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onOpenProfile,
  onOpenImage,
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isAuthor = user?.id === message.authorId;

  // Format timestamp (e.g. "Today at 2:30 PM" or "08/08/2026")
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleCopyCodeText = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Enhanced Markdown & Code Parser
  const renderFormattedContent = (content: string) => {
    if (!content) return null;

    // Code blocks ```code```
    if (content.startsWith('```') && content.endsWith('```')) {
      const codeText = content.slice(3, -3).trim();
      return (
        <div className="my-2 rounded-xl overflow-hidden border border-white/10 bg-[#1e1f22] shadow-lg">
          <div className="bg-[#2b2d31] px-3 py-1.5 flex items-center justify-between border-b border-black/20 text-[11px] text-discord-muted font-mono">
            <div className="flex items-center space-x-1.5 text-discord-brand font-semibold">
              <Code2 className="w-3.5 h-3.5" />
              <span>code snippet</span>
            </div>
            <button
              onClick={() => handleCopyCodeText(codeText)}
              className="flex items-center space-x-1 hover:text-white transition-colors"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-discord-green" />
                  <span className="text-discord-green font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
            <code>{codeText}</code>
          </pre>
        </div>
      );
    }

    // Process inline markdown
    const parts = content.split('\n').map((line, i) => {
      // Bold **text**
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
      // Italics *text*
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em class="italic text-discord-text">$1</em>');
      // Inline code `code`
      formattedLine = formattedLine.replace(/`(.*?)`/g, '<code class="bg-[#1e1f22] px-1.5 py-0.5 rounded text-discord-brand text-xs font-mono border border-white/5">$1</code>');

      return (
        <span
          key={i}
          dangerouslySetInnerHTML={{ __html: formattedLine }}
          className="block"
        />
      );
    });

    return <div className="space-y-0.5">{parts}</div>;
  };

  // Group reactions by emoji
  const groupedReactions = (message.reactions || []).reduce((acc: { [emoji: string]: MessageReaction[] }, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});

  const commonEmojis = ['👍', '❤️', '🔥', '😂', '🚀', '🎉', '👀', '💯'];

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editContent.trim()) {
      onEditMessage(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className="group relative flex space-x-3 px-4 py-1.5 hover:bg-black/10 transition-colors">
      {/* Floating Action Menu on Hover */}
      <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-discord-floating rounded-lg border border-white/10 shadow-xl px-1 py-0.5 space-x-1 z-10">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 hover:bg-white/10 rounded text-discord-muted hover:text-white transition-colors"
          title="Add Reaction"
        >
          <Smile className="w-4 h-4" />
        </button>

        {isAuthor && (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-white/10 rounded text-discord-muted hover:text-white transition-colors"
              title="Edit Message"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteMessage(message.id)}
              className="p-1.5 hover:bg-white/10 rounded text-discord-red transition-colors"
              title="Delete Message"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Quick Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute right-4 top-6 bg-discord-floating p-2 rounded-xl shadow-2xl border border-white/10 z-20 flex space-x-1 animate-fade-in">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onToggleReaction(message.id, emoji);
                setShowEmojiPicker(false);
              }}
              className="p-1.5 hover:bg-white/10 rounded text-base transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Author Avatar with profile click handler */}
      <img
        src={message.author?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${message.author?.username}`}
        alt={message.author?.username}
        onClick={() => message.author && onOpenProfile?.(message.author)}
        className="w-10 h-10 rounded-full bg-discord-tertiary object-cover flex-shrink-0 mt-0.5 cursor-pointer hover:opacity-90 transition-opacity"
      />

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline space-x-2">
          <span
            onClick={() => message.author && onOpenProfile?.(message.author)}
            className="font-bold text-sm text-white hover:underline cursor-pointer"
          >
            {message.author?.displayName || message.author?.username}
          </span>
          <span className="text-[11px] text-discord-muted">{formatTimestamp(message.createdAt)}</span>
        </div>

        {/* Message Text / Edit Mode */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="mt-1">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-1.5 bg-discord-tertiary text-white rounded outline-none border border-discord-brand text-sm"
              autoFocus
            />
            <div className="text-[11px] text-discord-muted mt-1 flex space-x-2">
              <span>escape to <button type="button" onClick={() => setIsEditing(false)} className="text-discord-brand hover:underline">cancel</button></span>
              <span>•</span>
              <span>enter to <button type="submit" className="text-discord-brand hover:underline">save</button></span>
            </div>
          </form>
        ) : (
          <div className="text-sm text-discord-text leading-relaxed mt-0.5">
            {renderFormattedContent(message.content)}
          </div>
        )}

        {/* Image / File Attachment Preview */}
        {message.fileUrl && (
          <div className="mt-2">
            {message.fileType === 'image' ? (
              <img
                src={message.fileUrl}
                alt="Attachment"
                onClick={() => onOpenImage?.(message.fileUrl!)}
                className="max-w-md max-h-80 rounded-xl object-cover border border-white/10 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
              />
            ) : (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-3 bg-discord-tertiary p-3 rounded-xl border border-white/5 hover:border-discord-brand/40 transition-all max-w-sm"
              >
                <FileText className="w-8 h-8 text-discord-brand flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">Attachment File</div>
                  <div className="text-[10px] text-discord-muted">Click to download</div>
                </div>
                <Download className="w-4 h-4 text-discord-muted ml-auto flex-shrink-0" />
              </a>
            )}
          </div>
        )}

        {/* Reaction Badges */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => {
              const hasReacted = reactions.some((r) => r.userId === user?.id);

              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(message.id, emoji)}
                  className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all ${
                    hasReacted
                      ? 'bg-discord-brand/20 border-discord-brand text-discord-brand'
                      : 'bg-discord-tertiary border-white/5 text-discord-muted hover:bg-discord-hover'
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
    </div>
  );
};
