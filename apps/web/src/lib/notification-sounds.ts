import type { Notification, UserRole } from '@/types';

export type NotificationSoundType = Notification['type'];

export interface NotificationSoundPreferences {
  enabled: boolean;
  volume: number;
  byType: Record<NotificationSoundType, boolean>;
}

/** Amplification appliquée au volume choisi par l'utilisateur (0–100 %). */
const ATTENTION_GAIN_BOOST = 2.8;

export const DEFAULT_NOTIFICATION_SOUND_PREFERENCES: NotificationSoundPreferences = {
  enabled: true,
  volume: 1,
  byType: {
    INFO: true,
    SUCCESS: true,
    WARNING: true,
    CRITICAL: true,
  },
};

export const NOTIFICATION_SOUND_LABELS: Record<NotificationSoundType, string> = {
  INFO: 'Information',
  SUCCESS: 'Succès',
  WARNING: 'Alerte',
  CRITICAL: 'Critique',
};

/** Description du timbre propre à chaque rôle. */
export const ROLE_SOUND_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Signal discret — Super administration',
  PROTOCOL: 'Triple staccato radio — signal Protocol',
  CEMG: 'Fanfare grave — signal Chef EMG',
  CHEF: 'Carillon mesuré — signal Chef de Cabinet',
  SALLE_ATTENTE: 'Clochette d\'accueil — signal Salle d\'attente',
  ADMIN: 'Bip neutre — signal Administration',
  SECRETAIRE: 'Ton bureau léger — signal Secrétariat',
  ASSISTANT: 'Ton discret — signal Assistant',
  OBSERVATEUR: 'Signal sobre — signal Observateur',
};

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

export function unlockNotificationAudio() {
  if (typeof window === 'undefined') return;
  if (!audioContext) {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    audioContext = new Ctx!();
    masterGain = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -8;
    compressor.knee.value = 4;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    masterGain.gain.value = 1;
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
  }
  void audioContext.resume();
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) unlockNotificationAudio();
  return audioContext;
}

function getMasterGain(ctx: AudioContext): GainNode {
  if (!masterGain) unlockNotificationAudio();
  return masterGain!;
}

function resolvePeakGain(userVolume: number, scale = 1): number {
  const clamped = Math.min(Math.max(userVolume, 0), 1);
  return clamped * ATTENTION_GAIN_BOOST * scale;
}

function playBeep(
  ctx: AudioContext,
  destination: AudioNode,
  startAt: number,
  frequency: number,
  duration: number,
  peakGain: number,
  oscillatorType: OscillatorType = 'square',
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = oscillatorType;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.008);
  gain.gain.setValueAtTime(peakGain, startAt + duration * 0.75);
  gain.gain.linearRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.04);
}

function playSirenBurst(
  ctx: AudioContext,
  destination: AudioNode,
  startAt: number,
  peakGain: number,
  low: number,
  high: number,
  cycles = 5,
) {
  const step = 0.14;

  for (let i = 0; i < cycles; i++) {
    const t = startAt + i * step * 2;
    playBeep(ctx, destination, t, low, step, peakGain, 'square');
    playBeep(ctx, destination, t + step, high, step, peakGain, 'square');
  }
}

type NoteSpec = {
  freq: number;
  dur: number;
  gap?: number;
  wave?: OscillatorType;
  gain?: number;
};

function playSequence(
  ctx: AudioContext,
  destination: AudioNode,
  startAt: number,
  peakGain: number,
  notes: NoteSpec[],
) {
  let cursor = startAt;
  for (const note of notes) {
    playBeep(
      ctx,
      destination,
      cursor,
      note.freq,
      note.dur,
      peakGain * (note.gain ?? 1),
      note.wave ?? 'square',
    );
    cursor += note.dur + (note.gap ?? 0.06);
  }
}

/** Signatures génériques (repli sans rôle). */
function playGenericPatternOnce(type: NotificationSoundType, peakGain: number, startOffset = 0) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const dest = getMasterGain(ctx);
  const now = ctx.currentTime + startOffset;

  switch (type) {
    case 'INFO':
      playBeep(ctx, dest, now, 880, 0.16, peakGain, 'square');
      playBeep(ctx, dest, now + 0.22, 880, 0.16, peakGain, 'square');
      playBeep(ctx, dest, now + 0.44, 988, 0.22, peakGain, 'square');
      break;
    case 'SUCCESS':
      playBeep(ctx, dest, now, 523, 0.12, peakGain * 0.9, 'sine');
      playBeep(ctx, dest, now + 0.14, 659, 0.12, peakGain * 0.95, 'sine');
      playBeep(ctx, dest, now + 0.28, 784, 0.2, peakGain, 'sine');
      break;
    case 'WARNING':
      for (let i = 0; i < 4; i++) {
        playBeep(
          ctx,
          dest,
          now + i * 0.2,
          i % 2 === 0 ? 520 : 740,
          0.14,
          peakGain,
          'triangle',
        );
      }
      break;
    case 'CRITICAL':
      playSirenBurst(ctx, dest, now, peakGain, 420, 880, 6);
      playSirenBurst(ctx, dest, now + 1.05, peakGain * 0.95, 420, 880, 4);
      break;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** Timbre distinct par rôle × gravité. */
function playRolePatternOnce(
  role: UserRole,
  type: NotificationSoundType,
  peakGain: number,
  startOffset = 0,
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const dest = getMasterGain(ctx);
  const now = ctx.currentTime + startOffset;

  switch (role) {
    case 'PROTOCOL':
      switch (type) {
        case 'INFO':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 988, dur: 0.1, wave: 'square' },
            { freq: 988, dur: 0.1, wave: 'square', gap: 0.08 },
            { freq: 1175, dur: 0.14, wave: 'square' },
          ]);
          break;
        case 'SUCCESS':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 659, dur: 0.1, wave: 'sine' },
            { freq: 784, dur: 0.1, wave: 'sine' },
            { freq: 988, dur: 0.18, wave: 'sine' },
          ]);
          break;
        case 'WARNING':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 740, dur: 0.12, wave: 'square' },
            { freq: 554, dur: 0.12, wave: 'square' },
            { freq: 740, dur: 0.12, wave: 'square' },
            { freq: 554, dur: 0.12, wave: 'square' },
          ]);
          break;
        case 'CRITICAL':
          playSirenBurst(ctx, dest, now, peakGain, 520, 988, 5);
          break;
        default: {
          const _exhaustive: never = type;
          return _exhaustive;
        }
      }
      break;

    case 'CEMG':
      switch (type) {
        case 'INFO':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 392, dur: 0.18, wave: 'sawtooth' },
            { freq: 523, dur: 0.22, wave: 'sawtooth' },
          ]);
          break;
        case 'SUCCESS':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 440, dur: 0.12, wave: 'sawtooth' },
            { freq: 554, dur: 0.12, wave: 'sawtooth' },
            { freq: 659, dur: 0.2, wave: 'sawtooth' },
          ]);
          break;
        case 'WARNING':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 349, dur: 0.14, wave: 'sawtooth' },
            { freq: 466, dur: 0.14, wave: 'sawtooth' },
            { freq: 349, dur: 0.14, wave: 'sawtooth' },
            { freq: 466, dur: 0.14, wave: 'sawtooth' },
          ]);
          break;
        case 'CRITICAL':
          playSirenBurst(ctx, dest, now, peakGain, 330, 660, 6);
          playSirenBurst(ctx, dest, now + 1.1, peakGain * 0.92, 294, 587, 4);
          break;
        default: {
          const _exhaustive: never = type;
          return _exhaustive;
        }
      }
      break;

    case 'CHEF':
      switch (type) {
        case 'INFO':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 659, dur: 0.2, wave: 'triangle' },
            { freq: 784, dur: 0.24, wave: 'triangle' },
          ]);
          break;
        case 'SUCCESS':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 523, dur: 0.14, wave: 'triangle' },
            { freq: 659, dur: 0.14, wave: 'triangle' },
            { freq: 784, dur: 0.18, wave: 'triangle' },
          ]);
          break;
        case 'WARNING':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 622, dur: 0.11, wave: 'triangle' },
            { freq: 494, dur: 0.11, wave: 'triangle' },
            { freq: 622, dur: 0.11, wave: 'triangle' },
            { freq: 494, dur: 0.11, wave: 'triangle' },
          ]);
          break;
        case 'CRITICAL':
          playSirenBurst(ctx, dest, now, peakGain, 440, 880, 5);
          playBeep(ctx, dest, now + 0.95, 523, 0.25, peakGain, 'triangle');
          break;
        default: {
          const _exhaustive: never = type;
          return _exhaustive;
        }
      }
      break;

    case 'SALLE_ATTENTE':
      switch (type) {
        case 'INFO':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 1047, dur: 0.28, wave: 'sine', gain: 0.95 },
            { freq: 1319, dur: 0.32, wave: 'sine' },
          ]);
          break;
        case 'SUCCESS':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 988, dur: 0.16, wave: 'sine' },
            { freq: 1175, dur: 0.16, wave: 'sine' },
            { freq: 1319, dur: 0.22, wave: 'sine' },
          ]);
          break;
        case 'WARNING':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 1175, dur: 0.1, wave: 'sine' },
            { freq: 1175, dur: 0.1, wave: 'sine', gap: 0.05 },
            { freq: 1175, dur: 0.1, wave: 'sine', gap: 0.05 },
            { freq: 1319, dur: 0.14, wave: 'sine' },
          ]);
          break;
        case 'CRITICAL':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 1047, dur: 0.08, wave: 'sine' },
            { freq: 1319, dur: 0.08, wave: 'sine', gap: 0.04 },
            { freq: 1047, dur: 0.08, wave: 'sine', gap: 0.04 },
            { freq: 1319, dur: 0.08, wave: 'sine', gap: 0.04 },
            { freq: 1568, dur: 0.2, wave: 'sine' },
          ]);
          break;
        default: {
          const _exhaustive: never = type;
          return _exhaustive;
        }
      }
      break;

    case 'SUPER_ADMIN':
    case 'ADMIN':
      switch (type) {
        case 'INFO':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 800, dur: 0.12, wave: 'square' },
            { freq: 900, dur: 0.12, wave: 'square' },
          ]);
          break;
        case 'SUCCESS':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 600, dur: 0.1, wave: 'sine' },
            { freq: 750, dur: 0.16, wave: 'sine' },
          ]);
          break;
        case 'WARNING':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 700, dur: 0.1, wave: 'square' },
            { freq: 700, dur: 0.1, wave: 'square', gap: 0.08 },
            { freq: 700, dur: 0.1, wave: 'square' },
          ]);
          break;
        case 'CRITICAL':
          playSirenBurst(ctx, dest, now, peakGain, 480, 960, 4);
          break;
        default: {
          const _exhaustive: never = type;
          return _exhaustive;
        }
      }
      break;

    case 'SECRETAIRE':
    case 'ASSISTANT':
      switch (type) {
        case 'INFO':
          playBeep(ctx, dest, now, 740, 0.18, peakGain * 0.85, 'sine');
          break;
        case 'SUCCESS':
          playSequence(ctx, dest, now, peakGain * 0.9, [
            { freq: 698, dur: 0.1, wave: 'sine' },
            { freq: 880, dur: 0.16, wave: 'sine' },
          ]);
          break;
        case 'WARNING':
          playSequence(ctx, dest, now, peakGain, [
            { freq: 660, dur: 0.1, wave: 'triangle' },
            { freq: 660, dur: 0.1, wave: 'triangle', gap: 0.1 },
          ]);
          break;
        case 'CRITICAL':
          playSirenBurst(ctx, dest, now, peakGain * 0.9, 500, 900, 3);
          break;
        default: {
          const _exhaustive: never = type;
          return _exhaustive;
        }
      }
      break;

    case 'OBSERVATEUR':
      switch (type) {
        case 'INFO':
          playBeep(ctx, dest, now, 880, 0.14, peakGain * 0.7, 'sine');
          break;
        case 'SUCCESS':
          playBeep(ctx, dest, now, 988, 0.16, peakGain * 0.75, 'sine');
          break;
        case 'WARNING':
          playBeep(ctx, dest, now, 740, 0.12, peakGain * 0.8, 'sine');
          playBeep(ctx, dest, now + 0.18, 740, 0.12, peakGain * 0.8, 'sine');
          break;
        case 'CRITICAL':
          playSirenBurst(ctx, dest, now, peakGain * 0.75, 550, 850, 3);
          break;
        default: {
          const _exhaustive: never = type;
          return _exhaustive;
        }
      }
      break;

    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function playPattern(
  type: NotificationSoundType,
  volume: number,
  role?: UserRole | null,
) {
  const peakGain = resolvePeakGain(volume);
  const playOnce = role
    ? (offset = 0) => playRolePatternOnce(role, type, peakGain, offset)
    : (offset = 0) => playGenericPatternOnce(type, peakGain, offset);

  playOnce();

  if (type === 'WARNING') {
    window.setTimeout(() => playOnce(0), 900);
  }
}

export function playNotificationSound(
  type: NotificationSoundType,
  preferences: NotificationSoundPreferences,
  role?: UserRole | null,
) {
  if (!preferences.enabled || !preferences.byType[type]) return;
  unlockNotificationAudio();
  playPattern(type, preferences.volume, role);
}

export function preferencesStorageKey(userId: string) {
  return `audax-notification-sounds:${userId}`;
}

export function readNotificationSoundPreferences(userId: string): NotificationSoundPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SOUND_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(preferencesStorageKey(userId));
    if (!raw) return DEFAULT_NOTIFICATION_SOUND_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<NotificationSoundPreferences>;
    return {
      ...DEFAULT_NOTIFICATION_SOUND_PREFERENCES,
      ...parsed,
      volume: Math.min(Math.max(parsed.volume ?? 1, 0), 1),
      byType: {
        ...DEFAULT_NOTIFICATION_SOUND_PREFERENCES.byType,
        ...parsed.byType,
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_SOUND_PREFERENCES;
  }
}

export function writeNotificationSoundPreferences(
  userId: string,
  preferences: NotificationSoundPreferences,
) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(preferencesStorageKey(userId), JSON.stringify(preferences));
}
