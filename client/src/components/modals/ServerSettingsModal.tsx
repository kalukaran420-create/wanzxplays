import React, { useState, useEffect, useRef } from 'react';
import { useServer } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ImageCropModal } from './ImageCropModal';
import {
  X,
  Shield,
  Hash,
  Volume2,
  Trash2,
  Check,
  Sparkles,
  Image,
  Settings,
  Plus,
  UserCheck,
  UserX,
  Save,
  Edit3,
  Upload,
  Camera,
} from 'lucide-react';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({ isOpen, onClose }) => {
  const { activeServer, refreshServers, selectServer } = useServer();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'channels'>('overview');

  // Overview Tab State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');

  // Crop Modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Roles Tab State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#00f2fe');
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Channel Edit State
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingChannelName, setEditingChannelName] = useState('');
  const [editingChannelTopic, setEditingChannelTopic] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (activeServer) {
      setName(activeServer.name || '');
      setDescription(activeServer.description || '');
      setIcon(activeServer.icon || '');
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [activeServer, isOpen]);

  if (!isOpen || !activeServer) return null;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg('');
  };

  // Image Selection Handler for Server Icon
  const handleIconFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropFile(file);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset file input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  // Save Cropped Image & Upload to Server
  const handleSaveIconCrop = async (croppedFile: File) => {
    setCropModalOpen(false);
    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('icon', croppedFile);

    try {
      const res = await api.post(`/servers/${activeServer.id}/icon`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data.iconUrl;
      setIcon(uploadedUrl);
      await refreshServers();
      await selectServer(activeServer.id);
      showSuccess('Server icon uploaded & updated successfully!');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to upload server icon image');
    } finally {
      setLoading(false);
    }
  };

  // 1. SAVE OVERVIEW (Server Name, Description, Icon)
  const handleSaveOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Server name is required');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await api.patch(`/servers/${activeServer.id}`, {
        name: name.trim(),
        description: description.trim(),
        icon: icon.trim(),
      });
      await refreshServers();
      await selectServer(activeServer.id);
      showSuccess('Server overview updated successfully!');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to update server overview');
    } finally {
      setLoading(false);
    }
  };

  // 2. CREATE NEW ROLE
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setLoading(true);
    try {
      await api.post('/roles', {
        serverId: activeServer.id,
        name: newRoleName.trim(),
        color: newRoleColor,
      });
      setNewRoleName('');
      setIsCreatingRole(false);
      await selectServer(activeServer.id);
      showSuccess('Role created successfully!');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  // 3. ASSIGN ROLE TO MEMBER
  const handleAssignRole = async (memberId: string, roleId: string) => {
    setLoading(true);
    try {
      await api.post('/roles/assign', {
        serverId: activeServer.id,
        memberId,
        roleId: roleId || null,
      });
      await selectServer(activeServer.id);
      showSuccess('Member role updated!');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  // 4. KICK MEMBER
  const handleKickMember = async (memberId: string, username: string) => {
    if (!confirm(`Are you sure you want to kick @${username} from ${activeServer.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/servers/${activeServer.id}/members/${memberId}`);
      await selectServer(activeServer.id);
      showSuccess(`@${username} has been removed from the server.`);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  // 5. SAVE CHANNEL EDITS (Rename & Topic)
  const handleSaveChannel = async (channelId: string) => {
    if (!editingChannelName.trim()) return;

    setLoading(true);
    try {
      await api.patch(`/channels/${channelId}`, {
        name: editingChannelName.trim(),
        topic: editingChannelTopic.trim(),
      });
      setEditingChannelId(null);
      await selectServer(activeServer.id);
      showSuccess('Channel updated successfully!');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to update channel');
    } finally {
      setLoading(false);
    }
  };

  // 6. DELETE CHANNEL
  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`Are you sure you want to delete #${channelName}?`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/channels/${channelId}`);
      await selectServer(activeServer.id);
      showSuccess(`Channel #${channelName} deleted.`);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to delete channel');
    } finally {
      setLoading(false);
    }
  };

  // 7. DELETE SERVER
  const handleDeleteServer = async () => {
    if (!confirm(`Are you sure you want to delete "${activeServer.name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/servers/${activeServer.id}`);
      await refreshServers();
      onClose();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to delete server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
        <div className="bg-discord-secondary w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative flex flex-col md:flex-row h-[600px]">
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-56 bg-cyber-panel p-4 border-b md:border-b-0 md:border-r border-cyber-border flex flex-col justify-between flex-shrink-0">
            <div className="space-y-1">
              <div className="text-[11px] font-extrabold text-cyber-muted uppercase px-2 py-1 tracking-wider mb-2 truncate flex items-center space-x-1.5 border-b border-cyber-border/50 pb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyber-cyan flex-shrink-0" />
                <span className="truncate">{activeServer.name}</span>
              </div>

              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeTab === 'overview'
                    ? 'bg-aurora-gradient text-white shadow-glow-violet'
                    : 'text-cyber-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('roles')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeTab === 'roles'
                    ? 'bg-aurora-gradient text-white shadow-glow-violet'
                    : 'text-cyber-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Roles & Members</span>
              </button>

              <button
                onClick={() => setActiveTab('channels')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeTab === 'channels'
                    ? 'bg-aurora-gradient text-white shadow-glow-violet'
                    : 'text-cyber-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <Hash className="w-4 h-4" />
                <span>Channels ({activeServer.channels?.length || 0})</span>
              </button>
            </div>

            <button
              onClick={handleDeleteServer}
              disabled={loading}
              className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold text-cyber-rose hover:bg-cyber-rose/10 transition-all text-left mt-4 border border-cyber-rose/20 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Server</span>
            </button>
          </div>

          {/* Right Main Panel */}
          <div className="flex-1 p-6 overflow-y-auto relative flex flex-col justify-between bg-[#0e0f19]">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-cyber-muted hover:text-white bg-cyber-input rounded-full transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 overflow-y-auto pr-1">
              {/* Header */}
              <h2 className="text-xl font-extrabold text-white mb-1 tracking-tight">
                {activeTab === 'overview' && 'Server Overview'}
                {activeTab === 'roles' && 'Roles & Member Management'}
                {activeTab === 'channels' && 'Channels & Categories Management'}
              </h2>
              <p className="text-xs text-cyber-muted mb-5">
                Customize server identity, manage member roles, and structure channels.
              </p>

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-cyber-emerald/10 border border-cyber-emerald/30 text-cyber-emerald text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose text-xs font-semibold animate-fade-in">
                  {errorMsg}
                </div>
              )}

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <form onSubmit={handleSaveOverview} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-cyber-muted uppercase tracking-wider mb-1.5">
                      Server Name <span className="text-cyber-rose">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="e.g. Gaming Lounge"
                      className="w-full bg-cyber-input text-white border border-cyber-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-cyber-cyan focus:shadow-glow-cyan transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-cyber-muted uppercase tracking-wider mb-1.5">
                      Server Description
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your server community..."
                      className="w-full bg-cyber-input text-white border border-cyber-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-cyber-cyan transition-all resize-none"
                    />
                  </div>

                  {/* Server Icon Section */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-cyber-muted uppercase tracking-wider mb-1.5">
                      Server Icon
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                      {/* Icon Preview */}
                      <div className="w-16 h-16 rounded-2xl bg-cyber-panel border border-cyber-border overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg relative group">
                        {icon ? (
                          <img src={icon} alt="Server Icon" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-7 h-7 text-cyber-muted" />
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[9px] font-bold"
                        >
                          <Camera className="w-4 h-4 mb-0.5" />
                          Change
                        </button>
                      </div>

                      <div className="flex-1 w-full space-y-2">
                        {/* Hidden Native File Input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/gif"
                          onChange={handleIconFileSelect}
                          className="hidden"
                        />

                        {/* File Upload Button & URL Field */}
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="px-3.5 py-2 bg-cyber-violet hover:bg-cyber-violet/80 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-glow-violet flex-shrink-0 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Image</span>
                          </button>

                          <input
                            type="text"
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            placeholder="Or paste an image URL..."
                            className="flex-1 bg-cyber-input text-white border border-cyber-border rounded-xl px-3.5 py-2 text-xs outline-none focus:border-cyber-cyan transition-all"
                          />
                        </div>

                        {/* Preset Icon Pickers */}
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-cyber-muted">Presets:</span>
                          {['Cyber', 'Gaming', 'Aurora', 'Neon'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                setIcon(`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(preset + name)}`)
                              }
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-cyber-panel hover:bg-cyber-violet hover:text-white text-cyber-cyan border border-white/5 transition-all cursor-pointer"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sticky Save Changes Button */}
                  <div className="pt-4 border-t border-cyber-border/60 flex items-center justify-between">
                    <div className="text-[11px] text-cyber-muted">
                      Save changes to apply new server branding immediately.
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !name.trim()}
                      className="px-6 py-2.5 bg-aurora-gradient hover:bg-aurora-hover text-white font-extrabold text-xs rounded-xl shadow-glow-violet transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: ROLES & MEMBERS */}
              {activeTab === 'roles' && (
                <div className="space-y-5">
                  {/* Create Role Bar */}
                  <div className="bg-cyber-panel p-3.5 rounded-xl border border-cyber-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Shield className="w-4 h-4 text-cyber-cyan" />
                        <span>Roles ({activeServer.roles?.length || 0})</span>
                      </span>
                      <button
                        onClick={() => setIsCreatingRole(!isCreatingRole)}
                        className="px-2.5 py-1 bg-cyber-cyan/10 hover:bg-cyber-cyan text-cyber-cyan hover:text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Role</span>
                      </button>
                    </div>

                    {isCreatingRole && (
                      <form onSubmit={handleCreateRole} className="mt-3 pt-3 border-t border-cyber-border flex items-center space-x-2">
                        <input
                          type="text"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="Role Name (e.g. Moderator)"
                          required
                          className="flex-1 bg-cyber-input text-white border border-cyber-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-cyber-cyan"
                        />
                        <input
                          type="color"
                          value={newRoleColor}
                          onChange={(e) => setNewRoleColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                        />
                        <button
                          type="submit"
                          disabled={loading || !newRoleName.trim()}
                          className="px-3 py-1.5 bg-cyber-emerald text-white rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50"
                        >
                          Create
                        </button>
                      </form>
                    )}

                    {/* Existing Roles Pills */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {activeServer.roles?.map((role) => (
                        <span
                          key={role.id}
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center space-x-1.5 border border-white/10 bg-cyber-input"
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color || '#99aab5' }} />
                          <span className="text-white">{role.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Member Management List */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-cyber-muted uppercase tracking-wider px-1">
                      Server Members ({activeServer.members?.length || 0})
                    </div>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {activeServer.members?.map((member) => {
                        const memberUser = member.user;
                        const isMemberOwner = activeServer.ownerId === member.userId;

                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-cyber-panel border border-cyber-border text-xs"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <img
                                src={memberUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${memberUser?.username}`}
                                alt={memberUser?.username}
                                className="w-8 h-8 rounded-full bg-cyber-input object-cover border border-white/10 flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-white flex items-center space-x-1.5 truncate">
                                  <span>{memberUser?.displayName || memberUser?.username}</span>
                                  {isMemberOwner && (
                                    <span className="text-[10px] bg-cyber-amber/20 text-cyber-amber px-1.5 py-0.2 rounded font-mono">
                                      OWNER
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-cyber-muted truncate">@{memberUser?.username}</div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {/* Role Selector */}
                              <select
                                value={member.roleId || ''}
                                onChange={(e) => handleAssignRole(member.id, e.target.value)}
                                disabled={loading}
                                className="bg-cyber-input text-white border border-cyber-border text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-cyber-cyan"
                              >
                                <option value="">No Role</option>
                                {activeServer.roles?.map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>

                              {/* Kick Member button */}
                              {!isMemberOwner && (
                                <button
                                  onClick={() => handleKickMember(member.id, memberUser?.username || 'user')}
                                  disabled={loading}
                                  className="p-1.5 text-cyber-muted hover:text-cyber-rose hover:bg-cyber-rose/10 rounded-lg transition-all"
                                  title="Kick Member"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CHANNELS MANAGEMENT */}
              {activeTab === 'channels' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-cyber-muted uppercase tracking-wider px-1">
                    Server Channels ({activeServer.channels?.length || 0})
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {activeServer.channels?.map((channel) => {
                      const isEditing = editingChannelId === channel.id;

                      return (
                        <div
                          key={channel.id}
                          className="p-3.5 rounded-xl bg-cyber-panel border border-cyber-border space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 font-bold text-white truncate">
                              {channel.type === 'VOICE' ? (
                                <Volume2 className="w-4 h-4 text-cyber-emerald flex-shrink-0" />
                              ) : (
                                <Hash className="w-4 h-4 text-cyber-cyan flex-shrink-0" />
                              )}
                              <span className="truncate">#{channel.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyber-input text-cyber-muted">
                                {channel.type}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => {
                                  if (isEditing) {
                                    setEditingChannelId(null);
                                  } else {
                                    setEditingChannelId(channel.id);
                                    setEditingChannelName(channel.name);
                                    setEditingChannelTopic(channel.topic || '');
                                  }
                                }}
                                className="p-1.5 text-cyber-muted hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                title="Edit Channel"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteChannel(channel.id, channel.name)}
                                className="p-1.5 text-cyber-muted hover:text-cyber-rose hover:bg-cyber-rose/10 rounded-lg transition-all"
                                title="Delete Channel"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Inline Channel Edit Form */}
                          {isEditing && (
                            <div className="pt-2 border-t border-cyber-border space-y-2 animate-fade-in">
                              <div>
                                <label className="block text-[10px] font-bold text-cyber-muted uppercase mb-1">
                                  Channel Name
                                </label>
                                <input
                                  type="text"
                                  value={editingChannelName}
                                  onChange={(e) => setEditingChannelName(e.target.value)}
                                  className="w-full bg-cyber-input text-white border border-cyber-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-cyber-cyan"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-cyber-muted uppercase mb-1">
                                  Channel Topic
                                </label>
                                <input
                                  type="text"
                                  value={editingChannelTopic}
                                  onChange={(e) => setEditingChannelTopic(e.target.value)}
                                  placeholder="Channel topic..."
                                  className="w-full bg-cyber-input text-white border border-cyber-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-cyber-cyan"
                                />
                              </div>
                              <div className="flex justify-end space-x-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingChannelId(null)}
                                  className="px-3 py-1 text-xs text-cyber-muted hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveChannel(channel.id)}
                                  disabled={loading}
                                  className="px-3.5 py-1 bg-cyber-cyan hover:opacity-90 text-white font-bold text-xs rounded-lg disabled:opacity-50"
                                >
                                  Save Channel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Crop Modal for Server Icon */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        file={cropFile}
        cropType="avatar"
        onClose={() => setCropModalOpen(false)}
        onSave={handleSaveIconCrop}
      />
    </>
  );
};
