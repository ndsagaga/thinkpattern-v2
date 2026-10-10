// The ONLY module that touches expo-audio directly. Everything else (the hook,
// the UI) talks to this typed surface, so the library stays isolated and out of
// the render path. We keep ONE module-singleton player alive for the app's
// lifetime — narration plays a single track that must survive navigation and
// backgrounding, so a per-component `useAudioPlayer` is the wrong tool here.
import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import type { PerspectiveDetail } from '@/types/contract';

import { toMetadata, toSource } from './metadata';

let player: AudioPlayer | null = null;
let audioModeConfigured = false;
let currentRate = 1;

export function getPlayer(): AudioPlayer {
  if (!player) player = createAudioPlayer(null);
  return player;
}

// Which perspective is currently loaded — exposed as a tiny subscribable store
// so the UI can react to "this screen is the active track" across screens.
let loadedId: string | null = null;
const listeners = new Set<() => void>();

export function subscribeLoadedId(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function getLoadedId(): string | null {
  return loadedId;
}
function setLoadedId(id: string | null): void {
  if (id === loadedId) return;
  loadedId = id;
  listeners.forEach((l) => l());
}

// Idempotent audio-session setup: keep playing when backgrounded/locked, play
// through the silent switch (it's narration), and `doNotMix` so the OS attaches
// lock-screen controls to us.
async function configureAudioMode(): Promise<void> {
  if (audioModeConfigured) return;
  await setAudioModeAsync({
    shouldPlayInBackground: true,
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
  });
  audioModeConfigured = true;
}

// Load a perspective's narration and start from `startAt` seconds. One track at
// a time: we replace the source, so the player never accumulates state. No-op
// when the perspective has no audio. setActiveForLockScreen is also what keeps
// Android background playback alive beyond a few minutes.
export async function loadPerspectiveAndPlay(p: PerspectiveDetail, startAt = 0): Promise<void> {
  const source = toSource(p);
  if (!source) return;
  await configureAudioMode();
  const pl = getPlayer();
  pl.replace({ uri: source });
  pl.setActiveForLockScreen(true, toMetadata(p));
  pl.setPlaybackRate(currentRate, 'high'); // 'high' pitch correction — spoken word
  setLoadedId(p.id);
  if (startAt > 0) await pl.seekTo(startAt);
  pl.play();
}

export const play = (): void => getPlayer().play();
export const pause = (): void => getPlayer().pause();
export const seekToSeconds = (seconds: number): Promise<void> => getPlayer().seekTo(seconds);
export const getRate = (): number => currentRate;
export function setRate(rate: number): void {
  currentRate = rate;
  getPlayer().setPlaybackRate(rate, 'high');
}
