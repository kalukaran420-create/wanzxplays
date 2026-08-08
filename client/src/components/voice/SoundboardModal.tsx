import React, { useState, useEffect } from 'react';
import { DEFAULT_SOUNDS, playSoundEffect } from '../../utils/soundSynthesizer';
import { X, Volume2, VolumeX, Upload, Sparkles, Play, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';

interface SoundboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  socket: any;
  soundVolume: number;
  setSoundVolume: (vol: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const SoundboardModal: React.FC<SoundboardModalProps> = ({
  isOpen,
  onClose,
  channelId,
  socket,
  soundVolume,
  setSoundVolume,
  isMuted,
  setIsMuted,
}) => {
  const [customSounds, setCustomSounds] = useState<any[]>([]);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [customSoundName, setCustomSoundName] = useState<string>('');
  const [customSoundIcon, setCustomSoundIcon] = useState<string>('🎵');

  useEffect(() => {
    if (isOpen) {
      // Fetch server custom sounds if available
      api.get('/sounds').then((res) => {
        setCustomSounds(res.data.sounds || []);
      }).catch((err) => console.error('Failed to fetch custom sounds:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerSound = (sound: { id: string; name: string; icon: string; url?: string }) => {
    if (cooldown) return;

    // Set 2.5s anti-spam cooldown
    setCooldown(true);
    setCooldownTime(2.5);
    const interval = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 0.5) {
          clearInterval(interval);
          setCooldown(false);
          return 0;
        }
        return prev - 0.5;
      });
    }, 500);

    // Show local active playing animation badge
    setActivePlayingId(sound.id);
    setTimeout(() => setActivePlayingId(null), 1200);

    // Broadcast via socket to everyone in voice channel (VoiceChannelView socket listener plays audio for all connected peers)
    if (socket) {
      socket.emit('voice:play-sound', {
        channelId,
        soundId: sound.id,
        soundName: sound.name,
        soundIcon: sound.icon,
        soundUrl: sound.url,
      });
    } else if (!isMuted) {
      // Fallback local playback if offline/disconnected
      playSoundEffect(sound.id, soundVolume, sound.url);
    }
  };

  const handleCustomSoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('sound', file);
    formData.append('name', customSoundName || file.name.replace(/\.[^/.]+$/, ''));
    formData.append('icon', customSoundIcon);

    setUploading(true);
    try {
      const res = await api.post('/sounds/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.sound) {
        setCustomSounds((prev) => [res.data.sound, ...prev]);
        setCustomSoundName('');
      }
    } catch (err) {
      console.error('Failed to upload custom sound:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-cyber-panel border border-cyber-border rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyber-border pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Voice Soundboard</h2>
              <p className="text-xs text-cyber-muted">Play sound effects for everyone connected in this channel.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-cyber-muted hover:text-white rounded-xl hover:bg-cyber-input transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Volume & Mute Controls Toolbar */}
        <div className="mb-4 p-3 bg-cyber-input/60 rounded-2xl border border-cyber-border flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 max-w-xs">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl transition-colors ${
                isMuted ? 'bg-cyber-rose/20 text-cyber-rose' : 'text-cyber-muted hover:text-white'
              }`}
              title={isMuted ? 'Unmute Soundboard' : 'Mute Soundboard'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
              disabled={isMuted}
              className="w-full accent-cyber-cyan cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-cyber-cyan min-w-[32px]">
              {Math.round(soundVolume * 100)}%
            </span>
          </div>

          {cooldown && (
            <div className="text-xs font-bold text-cyber-cyan flex items-center space-x-1.5 animate-pulse bg-cyber-cyan/10 px-3 py-1 rounded-xl border border-cyber-cyan/30">
              <ShieldAlert className="w-4 h-4" />
              <span>Cooldown: {cooldownTime.toFixed(1)}s</span>
            </div>
          )}
        </div>

        {/* Sound Buttons Grid Feed */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* Default Starter Sounds Pack */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-muted mb-2.5 flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-cyber-violet" />
              <span>Starter Sound Pack</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DEFAULT_SOUNDS.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => triggerSound(sound)}
                  disabled={cooldown}
                  className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    activePlayingId === sound.id
                      ? 'bg-cyber-cyan/20 border-cyber-cyan shadow-glow-cyan text-white scale-95'
                      : 'bg-cyber-input/80 border-cyber-border hover:border-cyber-violet/50 hover:bg-cyber-input text-cyber-text'
                  } ${cooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{sound.icon}</span>
                    <Play className="w-3.5 h-3.5 text-cyber-muted group-hover:text-cyber-cyan transition-colors" />
                  </div>
                  <div className="text-xs font-bold text-white truncate">{sound.name}</div>
                  <div className="text-[10px] text-cyber-muted truncate mt-0.5">{sound.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Server Sounds Pack */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-muted flex items-center space-x-2">
                <Upload className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>Custom Server Sounds</span>
              </h3>
            </div>

            {/* Custom Sound Upload Card */}
            <div className="mb-3 p-3 bg-cyber-input/40 border border-cyber-border/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Sound Name (e.g. Boss Battle)"
                  value={customSoundName}
                  onChange={(e) => setCustomSoundName(e.target.value)}
                  className="px-3 py-1.5 bg-cyber-base border border-cyber-border rounded-xl text-xs text-white outline-none focus:border-cyber-cyan w-full sm:w-48"
                />
              </div>

              <label className="w-full sm:w-auto px-4 py-2 bg-aurora-gradient hover:bg-aurora-hover text-white text-xs font-bold rounded-xl cursor-pointer shadow-glow-violet transition-all flex items-center justify-center space-x-2">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload Audio (MP3/WAV)'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleCustomSoundUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {customSounds.length === 0 ? (
              <div className="p-4 text-center text-xs text-cyber-muted border border-dashed border-cyber-border rounded-2xl">
                No custom sounds uploaded yet. Upload your favorite audio clips above!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {customSounds.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => triggerSound({ id: sound.id, name: sound.name, icon: sound.icon, url: sound.url })}
                    disabled={cooldown}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      activePlayingId === sound.id
                        ? 'bg-cyber-cyan/20 border-cyber-cyan shadow-glow-cyan text-white scale-95'
                        : 'bg-cyber-input/80 border-cyber-border hover:border-cyber-cyan/50 hover:bg-cyber-input text-cyber-text'
                    } ${cooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{sound.icon || '🎵'}</span>
                      <Play className="w-3.5 h-3.5 text-cyber-muted group-hover:text-cyber-cyan transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-white truncate">{sound.name}</div>
                    <div className="text-[10px] text-cyber-cyan truncate mt-0.5 font-mono">Custom Audio</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
