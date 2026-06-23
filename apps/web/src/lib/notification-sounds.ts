import type { Notification } from '@/types';

export type NotificationSoundType = Notification['type'];

export interface NotificationSoundPreferences {
  enabled: boolean;
  volume: number;
  byType: Record<NotificationSoundType, boolean>;
}

/** Volume utilisateur à 100 % × amplification forte (réglable via le curseur). */
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

function resolvePeakGain(userVolume: number): number {
  return Math.min(Math.max(userVolume, 0.35), 1) * ATTENTION_GAIN_BOOST;
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
  cycles = 5,
) {
  const low = 420;
  const high = 880;
  const step = 0.14;

  for (let i = 0; i < cycles; i++) {
    const t = startAt + i * step * 2;
    playBeep(ctx, destination, t, low, step, peakGain, 'square');
    playBeep(ctx, destination, t + step, high, step, peakGain, 'square');
  }
}

function playPatternOnce(type: NotificationSoundType, peakGain: number, startOffset = 0) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const dest = getMasterGain(ctx);
  const now = ctx.currentTime + startOffset;

  switch (type) {
    case 'INFO':
      // Triple bip d'appel — impossible à manquer
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
      // Quatre bips alternés — alerte opérationnelle
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
      // Sirène courte puis répétition — Priorité 0 / urgent
      playSirenBurst(ctx, dest, now, peakGain, 6);
      playSirenBurst(ctx, dest, now + 1.05, peakGain * 0.95, 4);
      break;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function playPattern(type: NotificationSoundType, volume: number) {
  const peakGain = resolvePeakGain(volume);
  playPatternOnce(type, peakGain);

  // Double lecture pour WARNING — insiste davantage
  if (type === 'WARNING') {
    window.setTimeout(() => playPatternOnce(type, peakGain * 0.92, 0), 900);
  }
}

export function playNotificationSound(
  type: NotificationSoundType,
  preferences: NotificationSoundPreferences,
) {
  if (!preferences.enabled || !preferences.byType[type]) return;
  unlockNotificationAudio();
  playPattern(type, preferences.volume);
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
    const merged = {
      ...DEFAULT_NOTIFICATION_SOUND_PREFERENCES,
      ...parsed,
      byType: {
        ...DEFAULT_NOTIFICATION_SOUND_PREFERENCES.byType,
        ...parsed.byType,
      },
    };
    // Anciens réglages trop bas : remonter au minimum audible fort
    if (merged.volume < 0.85) {
      merged.volume = 1;
    }
    return merged;
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
