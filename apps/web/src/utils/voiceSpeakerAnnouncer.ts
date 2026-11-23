import type {
  SpeakerAnnouncementPayloadDTO,
  VietQrWebhookProcessResultDTO,
} from '@cf19/shared';

export type SpeakerAnnouncementMode =
  | 'WEB_SPEECH_API'
  | 'SIMULATED_CONSOLE'
  | 'MUTED';

export interface SpeakerAnnouncementResult {
  announced: boolean;
  script: string;
  mode: SpeakerAnnouncementMode;
  chimePlayed: boolean;
}

export interface SpeakerHistoryEntry {
  id: string;
  order_id: string;
  order_code: string;
  store_id: string;
  amount_vnd: number;
  formatted_amount_vnd: string;
  script: string;
  mode: SpeakerAnnouncementMode;
  announced: boolean;
  chime_played: boolean;
  announced_at: string;
}

export interface WebhookSpeakerTriggerOutcome {
  triggered: boolean;
  announced: boolean;
  script: string | null;
  mode: SpeakerAnnouncementMode | 'SKIPPED_IDEMPOTENT';
}

interface WindowWithWebkitAudio extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

const MAX_HISTORY_ENTRIES = 50;
let speakerHistory: SpeakerHistoryEntry[] = [];
let globalSpeakerMuted = false;

export function isSpeakerMuted(): boolean {
  return globalSpeakerMuted;
}

export function setSpeakerMuted(muted: boolean): void {
  globalSpeakerMuted = muted;
}

export function getSpeakerAnnouncementHistory(): SpeakerHistoryEntry[] {
  return speakerHistory.map((entry) => ({ ...entry }));
}

export function clearSpeakerAnnouncementHistory(): void {
  speakerHistory = [];
}

/**
 * Play a 4-note payment success chime via Web Audio API.
 * Safe in headless/Node/Vitest environments: returns false without throwing.
 */
export function playPaymentSuccessChime(frequenciesHz: readonly number[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const win = window as WindowWithWebkitAudio;
  const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
  if (typeof AudioCtx !== 'function' || frequenciesHz.length === 0) {
    return false;
  }

  try {
    const ctx = new AudioCtx();
    const startBase = ctx.currentTime;
    const noteDurationSec = 0.14;

    frequenciesHz.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = startBase + idx * noteDurationSec;
      const noteEnd = noteStart + noteDurationSec;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteEnd + 0.01);
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Announce a confirmed VietQR payment in Vietnamese via Web Audio chime + SpeechSynthesis API.
 * Records every attempt to in-memory speaker history for Cashier UI visibility and Vitest assertions.
 */
export function announceVietQrPaymentVoice(
  announcement: SpeakerAnnouncementPayloadDTO,
  options: { muted?: boolean } = {},
): SpeakerAnnouncementResult {
  const isMuted = options.muted ?? globalSpeakerMuted;
  const script = announcement.message_vi;
  const nowIso = new Date().toISOString();

  if (isMuted) {
    speakerHistory.unshift({
      id: crypto.randomUUID(),
      order_id: announcement.order_id,
      order_code: announcement.order_code,
      store_id: announcement.store_id,
      amount_vnd: announcement.amount_vnd,
      formatted_amount_vnd: announcement.formatted_amount_vnd,
      script,
      mode: 'MUTED',
      announced: false,
      chime_played: false,
      announced_at: nowIso,
    });
    speakerHistory = speakerHistory.slice(0, MAX_HISTORY_ENTRIES);

    return {
      announced: false,
      script,
      mode: 'MUTED',
      chimePlayed: false,
    };
  }

  const chimePlayed = playPaymentSuccessChime(announcement.chime_frequencies_hz);
  let mode: SpeakerAnnouncementMode = 'SIMULATED_CONSOLE';

  if (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.speechSynthesis?.speak === 'function' &&
    typeof SpeechSynthesisUtterance === 'function'
  ) {
    try {
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = announcement.lang;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
      mode = 'WEB_SPEECH_API';
    } catch {
      mode = 'SIMULATED_CONSOLE';
    }
  }

  speakerHistory.unshift({
    id: crypto.randomUUID(),
    order_id: announcement.order_id,
    order_code: announcement.order_code,
    store_id: announcement.store_id,
    amount_vnd: announcement.amount_vnd,
    formatted_amount_vnd: announcement.formatted_amount_vnd,
    script,
    mode,
    announced: true,
    chime_played: chimePlayed,
    announced_at: nowIso,
  });
  speakerHistory = speakerHistory.slice(0, MAX_HISTORY_ENTRIES);

  return {
    announced: true,
    script,
    mode,
    chimePlayed,
  };
}

/**
 * Strictly honors `result.should_trigger_speaker` so IDEMPOTENT_REPLAY webhooks
 * NEVER re-announce a payment on the cashier speaker.
 */
export function processWebhookSpeakerTrigger(
  result: VietQrWebhookProcessResultDTO,
  options: { muted?: boolean } = {},
): WebhookSpeakerTriggerOutcome {
  if (!result.should_trigger_speaker || !result.speaker_announcement) {
    return {
      triggered: false,
      announced: false,
      script: null,
      mode: 'SKIPPED_IDEMPOTENT',
    };
  }

  const outcome = announceVietQrPaymentVoice(result.speaker_announcement, options);
  return {
    triggered: true,
    announced: outcome.announced,
    script: outcome.script,
    mode: outcome.mode,
  };
}
