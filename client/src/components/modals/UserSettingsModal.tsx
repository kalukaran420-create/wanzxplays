import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ImageCropModal } from './ImageCropModal';
import { X, Check, User as UserIcon, Image as ImageIcon, Palette, Sparkles, Camera } from 'lucide-react';
import { api } from '../../services/api';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#7c3aed', // Electric Violet
  '#06b6d4', // Neon Cyan
  '#10b981', // Emerald
  '#ef4444', // Rose Red
  '#f59e0b', // Amber Gold
  '#2563eb', // Royal Blue
  '#ec4899', // Hot Pink
];

const AVATAR_EFFECTS = [
  { id: 'glow', name: 'Violet Glow', class: 'shadow-glow-violet' },
  { id: 'cyan_glow', name: 'Cyan Glow', class: 'shadow-glow-cyan' },
  { id: 'pulse', name: 'Sparkle Pulse', class: 'animate-pulse-glow' },
  { id: 'none', name: 'None', class: '' },
];

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [customStatus, setCustomStatus] = useState(user?.customStatus || '');
  const [profileColor, setProfileColor] = useState(user?.profileColor || '#7c3aed');
  const [profileEffect, setProfileEffect] = useState(user?.profileEffect || 'glow');
  const [customTag, setCustomTag] = useState(user?.customTag || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Crop Modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropType, setCropType] = useState<'avatar' | 'banner'>('avatar');

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateProfile({
        displayName,
        customStatus,
        profileColor,
        profileEffect,
        customTag,
      });
      setSuccessMsg('Profile themes & settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropFile(file);
      setCropType('avatar');
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropFile(file);
      setCropType('banner');
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCrop = async (croppedFile: File) => {
    setCropModalOpen(false);
    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    const endpoint = cropType === 'avatar' ? '/auth/avatar' : '/auth/banner';
    const fieldName = cropType === 'avatar' ? 'avatar' : 'banner';
    formData.append(fieldName, croppedFile);

    try {
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.user) {
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || `Failed to upload ${cropType}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="bg-cyber-panel w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-cyber-border flex flex-col md:flex-row h-[600px]">
        {/* Settings Left Sidebar */}
        <div className="w-full md:w-56 bg-cyber-base p-4 border-r border-cyber-border space-y-1">
          <div className="text-[11px] font-extrabold text-cyber-muted uppercase px-2 mb-2 tracking-wider">User Settings</div>
          <div className="px-3 py-2.5 bg-cyber-violet/20 text-cyber-violet border border-cyber-violet/30 rounded-xl font-bold text-xs flex items-center space-x-2">
            <UserIcon className="w-4 h-4" />
            <span>My Account & Nitro Perks</span>
          </div>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 p-6 overflow-y-auto relative bg-cyber-chat flex flex-col justify-between">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-cyber-muted hover:text-white rounded-full bg-cyber-input border border-cyber-border transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-xl font-extrabold text-white mb-1 flex items-center space-x-2">
              <span>My Account & Profile Themes</span>
              <Sparkles className="w-5 h-5 text-cyber-cyan" />
            </h2>
            <p className="text-xs text-cyber-muted mb-6">Customize GIF avatars, GIF banners, card accent colors & avatar effects</p>

            {successMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-cyber-emerald/10 border border-cyber-emerald/30 text-cyber-emerald text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Profile Card Live Preview Container */}
            <div className="bg-cyber-input rounded-3xl border border-cyber-border overflow-hidden mb-6 shadow-2xl relative">
              {/* Edge-to-Edge Banner Backdrop Container */}
              <div
                className="h-28 w-full bg-aurora-gradient relative group overflow-hidden"
                style={{ backgroundColor: profileColor }}
              >
                {user.banner && (
                  <img
                    src={user.banner}
                    alt="Profile Banner"
                    className="absolute inset-0 w-full h-full object-cover object-center block border-none outline-none"
                  />
                )}

                {/* Edit Banner Badge Overlay Button */}
                <label className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/65 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center space-x-1.5 hover:bg-black/85 cursor-pointer transition-all shadow-lg z-10">
                  <ImageIcon className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Upload Banner</span>
                  <input type="file" accept="image/*,.gif" className="hidden" onChange={handleBannerSelect} />
                </label>
              </div>

              {/* Avatar & User Details Overlap Block */}
              <div className="px-5 pb-5 relative flex items-center space-x-4 -mt-10">
                {/* Dead-Center Avatar Container with Camera Hover Overlay */}
                <div className="relative group flex-shrink-0 w-20 h-20 cursor-pointer rounded-full p-0 flex items-center justify-center">
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.username}
                    className={`w-20 h-20 rounded-full object-cover bg-cyber-panel border-4 border-cyber-input shadow-2xl block ${
                      profileEffect === 'cyan_glow'
                        ? 'shadow-glow-cyan'
                        : profileEffect === 'pulse'
                        ? 'animate-pulse-glow'
                        : 'shadow-glow-violet'
                    }`}
                  />

                  {/* Dead-Center Full Avatar Hover Overlay */}
                  <label className="absolute inset-0 rounded-full bg-black/70 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 text-white z-10 border-4 border-transparent">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-[9px] font-extrabold mt-0.5 uppercase tracking-wider text-center">CHANGE</span>
                    <input type="file" accept="image/*,.gif" className="hidden" onChange={handleAvatarSelect} />
                  </label>

                  {/* Always Visible Bottom Right Camera Badge */}
                  <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-cyber-violet hover:bg-cyber-violet-hover text-white shadow-lg cursor-pointer border-2 border-cyber-input z-20 transition-transform hover:scale-110" title="Upload Avatar (GIF/Image)">
                    <Camera className="w-3.5 h-3.5" />
                    <input type="file" accept="image/*,.gif" className="hidden" onChange={handleAvatarSelect} />
                  </label>
                </div>

                {/* Vertically Centered User Details */}
                <div className="min-w-0 flex-1 pt-10 flex flex-col justify-center">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="font-extrabold text-white text-lg truncate leading-tight">
                      {displayName || user.username}
                    </span>
                    {customTag && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyber-violet/20 border border-cyber-violet/40 text-cyber-violet font-extrabold flex-shrink-0">
                        {customTag}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-cyber-muted font-medium truncate mt-0.5">
                    @{user.username} • {user.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Form & Color/Effect Pickers */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Accent Color Picker */}
              <div>
                <label className="block text-xs font-extrabold text-cyber-muted uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Profile Accent Color</span>
                </label>
                <div className="flex items-center space-x-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setProfileColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-xl transition-all ${
                        profileColor === color ? 'ring-2 ring-white scale-110 shadow-lg' : 'hover:scale-105 opacity-80'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={profileColor}
                    onChange={(e) => setProfileColor(e.target.value)}
                    className="w-8 h-8 rounded-xl bg-transparent border-0 cursor-pointer"
                    title="Custom Color Hex"
                  />
                </div>
              </div>

              {/* Avatar Profile Effect Picker */}
              <div>
                <label className="block text-xs font-extrabold text-cyber-muted uppercase tracking-wider mb-2">
                  Avatar Profile Glow Effect
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {AVATAR_EFFECTS.map((fx) => (
                    <button
                      key={fx.id}
                      type="button"
                      onClick={() => setProfileEffect(fx.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        profileEffect === fx.id
                          ? 'bg-cyber-violet/20 border-cyber-violet text-white shadow-glow-violet'
                          : 'bg-cyber-input border-cyber-border text-cyber-muted hover:bg-cyber-hover hover:text-white'
                      }`}
                    >
                      {fx.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Username Tag / Flair */}
              <div>
                <label className="block text-xs font-extrabold text-cyber-muted uppercase tracking-wider mb-2">
                  Custom Username Tag / Title
                </label>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  className="w-full px-4 py-2.5 bg-cyber-input text-white rounded-xl outline-none border border-cyber-border focus:border-cyber-violet text-sm transition-all"
                  placeholder="e.g. Dev Lead 🚀 or PulseCord Builder"
                />
              </div>

              {/* Display Name & Custom Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-cyber-muted uppercase tracking-wider mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-cyber-input text-white rounded-xl outline-none border border-cyber-border focus:border-cyber-violet text-sm transition-all"
                    placeholder="Visible nickname"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-cyber-muted uppercase tracking-wider mb-2">
                    Custom Status
                  </label>
                  <input
                    type="text"
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-cyber-input text-white rounded-xl outline-none border border-cyber-border focus:border-cyber-violet text-sm transition-all"
                    placeholder="🚀 Building awesome features..."
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-cyber-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-aurora-gradient hover:bg-aurora-hover text-white text-xs font-extrabold rounded-xl shadow-glow-violet transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Profile Theme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Image Crop & Adjust Modal */}
      <ImageCropModal
        imageSrc={cropImageSrc}
        file={cropFile}
        cropType={cropType}
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        onSave={handleSaveCrop}
      />
    </div>
  );
};
