// High Quality Web Audio Soundboard Synthesizer & Audio File Player

import { resolveMediaUrl } from './resolveMediaUrl';

export const DEFAULT_SOUNDS = [
  { id: 'airhorn', name: 'Airhorn', icon: '📯', desc: 'Classic hype pitch sweep' },
  { id: 'applause', name: 'Applause', icon: '👏', desc: 'Crowd cheering & clapping' },
  { id: 'drumroll', name: 'Drum Roll', icon: '🥁', desc: 'Suspenseful drum crescendo' },
  { id: 'badumtss', name: 'Ba-Dum-Tss', icon: '🥁', desc: 'Classic comedy punchline rimshot' },
  { id: 'laugh', name: 'Laugh Track', icon: '😂', desc: 'Hysterical laugh chortle' },
  { id: 'victory', name: 'Victory Chime', icon: '🎺', desc: '8-bit retro fanfare' },
  { id: 'quack', name: 'Duck Quack', icon: '🦆', desc: 'Funny duck quack' },
  { id: 'ding', name: 'Notification Ding', icon: '🔔', desc: 'Crisp glass chime' },
];

let audioCtx: AudioContext | null = null;
let activeCustomAudio: HTMLAudioElement | null = null;
let activeMasterGain: GainNode | null = null;
let currentVolumeLevel: number = 0.8;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch((err) => console.warn('[Soundboard] audioCtx.resume error:', err));
  }
  return audioCtx;
}

export function stopCurrentSound(): void {
  if (activeCustomAudio) {
    try {
      activeCustomAudio.pause();
      activeCustomAudio.currentTime = 0;
      activeCustomAudio.src = '';
    } catch (e) {
      console.warn('[Soundboard] Error stopping custom audio:', e);
    }
    activeCustomAudio = null;
  }
  activeMasterGain = null;
}

/**
 * Dynamically adjust volume in real time for currently playing soundboard audio
 */
export function setSoundboardVolume(vol: number): void {
  const clampedVol = Math.min(1, Math.max(0, vol));
  currentVolumeLevel = clampedVol;

  // Real-time update for active custom Audio element
  if (activeCustomAudio) {
    activeCustomAudio.volume = clampedVol;
    console.log(`🔊 [Soundboard] Real-time custom Audio volume updated to ${clampedVol}`);
  }

  // Real-time update for Web Audio Master Gain Node
  if (activeMasterGain && audioCtx) {
    try {
      activeMasterGain.gain.setValueAtTime(clampedVol, audioCtx.currentTime);
      console.log(`🔊 [Soundboard] Real-time Web Audio Gain updated to ${clampedVol}`);
    } catch (e) {
      console.warn('[Soundboard] Gain set error:', e);
    }
  }
}

export function playSoundEffect(soundId: string, volume: number = 0.8, soundUrl?: string): void {
  const effectiveVolume = Math.min(1, Math.max(0, volume));
  currentVolumeLevel = effectiveVolume;

  // Stop any previously playing custom audio clip to prevent overlapping
  stopCurrentSound();

  if (effectiveVolume <= 0) {
    console.log('[Soundboard] Volume is 0% (Silent) - Skipping audio playback');
    return;
  }

  // Ensure AudioContext is un-suspended on user interaction before playback
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch((err) => console.warn('[Soundboard] ctx.resume error:', err));
  }

  // If a custom audio file URL is provided, play via Audio element cleanly (NO looping)
  if (soundUrl) {
    const resolvedUrl = resolveMediaUrl(soundUrl);
    console.log(`🔊 [Soundboard] Playing custom audio URL: ${resolvedUrl}`);
    const audio = new Audio(resolvedUrl);
    audio.loop = false; // Ensure playback naturally stops when clip ends
    audio.volume = effectiveVolume;
    activeCustomAudio = audio;

    audio.onended = () => {
      if (activeCustomAudio === audio) {
        activeCustomAudio = null;
      }
    };

    audio.play().catch((err) => {
      console.error('[Soundboard] Custom audio playback error:', err);
      activeCustomAudio = null;
    });
    return;
  }

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(effectiveVolume, ctx.currentTime);
  activeMasterGain = masterGain;
  masterGain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (soundId) {
    case 'airhorn': {
      // Airhorn sound sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      osc.frequency.setValueAtTime(800, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.4);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    }

    case 'applause': {
      // Crowd clapping noise burst
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(1.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      whiteNoise.start(now);
      whiteNoise.stop(now + 1.5);
      break;
    }

    case 'drumroll': {
      // Rapid snare drum bursts crescendoing
      const rollDuration = 1.2;
      const numHits = 18;
      for (let i = 0; i < numHits; i++) {
        const time = now + (i / numHits) * rollDuration;
        const vol = 0.1 + (i / numHits) * 0.4;

        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          output[j] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        noise.connect(gain);
        gain.connect(masterGain);
        noise.start(time);
        noise.stop(time + 0.05);
      }
      break;
    }

    case 'badumtss': {
      // Rimshot comedy drum punchline
      const hitTimes = [now, now + 0.25, now + 0.5];
      hitTimes.forEach((time, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (idx === 2) {
          // Cymbal crash at the end
          const bufferSize = ctx.sampleRate * 0.8;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = buffer.getChannelData(0);
          for (let j = 0; j < bufferSize; j++) {
            output[j] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(4000, time);

          const cGain = ctx.createGain();
          cGain.gain.setValueAtTime(0.4, time);
          cGain.gain.exponentialRampToValueAtTime(0.01, time + 0.8);

          noise.connect(filter);
          filter.connect(cGain);
          cGain.connect(masterGain);
          noise.start(time);
          noise.stop(time + 0.8);
        } else {
          // Snare/Tom hit
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(idx === 0 ? 180 : 150, time);
          osc.frequency.exponentialRampToValueAtTime(60, time + 0.15);

          gain.gain.setValueAtTime(0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(time);
          osc.stop(time + 0.15);
        }
      });
      break;
    }

    case 'laugh': {
      // Chuckling pitch modulation
      const numChucks = 6;
      for (let i = 0; i < numChucks; i++) {
        const time = now + i * 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400 + Math.random() * 80, time);
        osc.frequency.exponentialRampToValueAtTime(250, time + 0.12);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.12);
      }
      break;
    }

    case 'victory': {
      // 8-bit retro fanfare
      const notes = [
        { f: 523.25, d: 0.12 }, // C5
        { f: 659.25, d: 0.12 }, // E5
        { f: 783.99, d: 0.12 }, // G5
        { f: 1046.5, d: 0.35 }, // C6
      ];
      let t = now;
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(n.f, t);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + n.d);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + n.d);
        t += n.d;
      });
      break;
    }

    case 'quack': {
      // Duck quack nasal pitch drop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.28);
      break;
    }

    case 'ding': {
      // Crisp glass chime bell
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now); // A6

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.8);
      break;
    }

    default:
      console.warn(`[Soundboard] Unknown soundId '${soundId}'`);
      break;
  }
}
