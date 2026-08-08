import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Upload, Check, User as UserIcon } from 'lucide-react';
import { api } from '../../services/api';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [customStatus, setCustomStatus] = useState(user?.customStatus || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateProfile({ displayName, customStatus });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setLoading(true);
    try {
      const res = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.user) {
        window.location.reload(); // Reload to refresh avatar across app
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-discord-secondary w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-white/10 flex flex-col md:flex-row h-[520px]">
        {/* Settings Left Sidebar */}
        <div className="w-full md:w-56 bg-[#2b2d31] p-4 border-r border-black/20 space-y-1">
          <div className="text-[11px] font-bold text-discord-muted uppercase px-2 mb-2">User Settings</div>
          <div className="px-3 py-2 bg-discord-brand/10 text-discord-brand rounded-md font-semibold text-xs flex items-center space-x-2">
            <UserIcon className="w-4 h-4" />
            <span>My Account</span>
          </div>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 p-6 overflow-y-auto relative bg-discord-primary flex flex-col justify-between">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-discord-muted hover:text-white rounded-full bg-discord-tertiary border border-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-xl font-bold text-white mb-1">My Account</h2>
            <p className="text-xs text-discord-muted mb-6">Manage your profile details and preferences</p>

            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-discord-green/10 border border-discord-green/30 text-discord-green text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-discord-red/10 border border-discord-red/30 text-discord-red text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Avatar Card */}
            <div className="bg-discord-tertiary p-4 rounded-xl border border-white/5 flex items-center space-x-4 mb-6">
              <div className="relative group">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={user.username}
                  className="w-16 h-16 rounded-full object-cover bg-discord-secondary border-2 border-discord-brand/50"
                />
                <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-5 h-5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>

              <div>
                <div className="font-bold text-white text-base">{user.displayName || user.username}</div>
                <div className="text-xs text-discord-muted">@{user.username} • {user.email}</div>
                <label className="inline-flex items-center text-xs font-semibold text-discord-brand hover:underline cursor-pointer mt-1">
                  Change Avatar
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
            </div>

            {/* Edit Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand text-sm"
                  placeholder="Your visible nickname"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
                  Custom Status
                </label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  className="w-full px-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand text-sm"
                  placeholder="🚀 Coding something awesome..."
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-discord-text hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-discord-brand hover:bg-discord-brand-hover text-white text-xs font-semibold rounded-md shadow transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
