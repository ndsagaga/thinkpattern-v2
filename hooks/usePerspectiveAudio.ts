// Reactive binding between a perspective's narration and the audio player. The
// UI (AudioBar / PerspectiveListen) consumes only this hook; it never touches
// expo-audio directly. Responsibilities:
//   · map expo-audio's status onto the design's six UI states
//   · bridge the async gap between "tapped play" and "track is loaded"
//   · own resume-position persistence (checkpoint, pause, background)
//   · replay-from-start when a finished track is played again
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { type AudioStatus, useAudioPlayerStatus } from 'expo-audio';

import type { PerspectiveDetail } from '@/types/contract';
import {
  getLoadedId,
  getPlayer,
  getRate,
  loadPerspectiveAndPlay,
  pause,
  play,
  seekToSeconds,
  setRate,
  subscribeLoadedId,
} from '@/lib/audio/player';
import { clearPosition, getResumePosition, savePosition } from '@/lib/audio/resume';
import { emit } from '@/lib/events';
import { Sentry } from '@/lib/sentry';

export type AudioUiState = 'idle' | 'loading' | 'playing' | 'buffering' | 'paused' | 'error';

const SPEEDS = [1, 1.5, 2] as const;
const CHECKPOINT_SEC = 5; // how often to persist position during playback
const END_EPS = 0.5; // treat within this of the end as "at the end"

export interface PerspectiveAudio {
  state: AudioUiState;
  active: boolean; // this perspective is the loaded track (drives the paper2 inset)
  progress: number; // 0..1
  buffered: number; // 0..1 (expo-audio exposes no buffered-ahead position → 0)
  duration: number; // seconds
  speed: number;
  toggle: () => void;
  seek: (fraction: number) => void;
  cycleSpeed: () => void;
}

function deriveState(
  active: boolean,
  starting: boolean,
  loadError: boolean,
  s: AudioStatus,
): AudioUiState {
  // Order matters: a failed load wins; then "not our track"; then the optimistic
  // start and initial buffering; only then live playback state.
  if (loadError) return 'error';
  if (!active) return 'idle';
  if (starting || !s.isLoaded) return 'loading';
  if (s.playing) return 'playing';
  if (s.isBuffering) return 'buffering';
  return 'paused';
}

export function usePerspectiveAudio(perspective: PerspectiveDetail): PerspectiveAudio {
  const id = perspective.id;
  const hasAudio = !!perspective.audio_url;
  const contractDuration = perspective.audio_duration_sec ?? 0;

  const player = getPlayer();
  const status = useAudioPlayerStatus(player);
  const loadedId = useSyncExternalStore(subscribeLoadedId, getLoadedId);
  const isLoaded = loadedId === id;

  // Optimistic "starting" bridges the async gap from tapping play to the player
  // reporting this perspective as loaded, so the button shows a spinner
  // immediately instead of flickering back to the resting look.
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [speed, setSpeed] = useState(getRate);

  const active = isLoaded || starting;
  const state = deriveState(active, starting, loadError, status);

  const duration = isLoaded && status.duration > 0 ? status.duration : contractDuration;
  const position = isLoaded ? status.currentTime : 0;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  // Live mirrors for closures that can't depend on render scope (AppState).
  const prog = useRef({ position: 0, duration: 0 });
  prog.current = { position, duration };
  const isLoadedRef = useRef(isLoaded);
  isLoadedRef.current = isLoaded;
  const checkpoint = useRef(0);

  // The player confirmed our track loaded — clear the optimistic flag.
  useEffect(() => {
    if (isLoaded) setStarting(false);
  }, [isLoaded]);

  // Reset the checkpoint baseline whenever the loaded track changes.
  useEffect(() => {
    checkpoint.current = 0;
  }, [isLoaded, id]);

  // Keep the playback rate applied across (re)loads.
  useEffect(() => {
    if (isLoaded) setRate(speed);
  }, [speed, isLoaded]);

  // Periodic checkpoint while playing — bounds loss if the app is killed mid-play.
  useEffect(() => {
    if (isLoaded && status.playing && position - checkpoint.current >= CHECKPOINT_SEC) {
      savePosition(id, position, duration);
      checkpoint.current = position;
    }
  }, [position, isLoaded, status.playing, duration, id]);

  // A finished track has no resumable position.
  useEffect(() => {
    if (isLoaded && status.didJustFinish) {
      clearPosition(id);
      emit('audio_playback_completed', { id });
    }
  }, [isLoaded, status.didJustFinish, id]);

  // Speed-change signal — cycleSpeed uses a functional setState update (so it
  // stays referentially stable across renders), so the emit lives here rather
  // than inside the updater, which StrictMode can invoke twice.
  const prevSpeed = useRef(speed);
  useEffect(() => {
    if (prevSpeed.current !== speed) {
      emit('audio_speed_changed', { id, rate: speed });
      prevSpeed.current = speed;
    }
  }, [speed, id]);

  // Persist on backgrounding — the last chance before the OS may suspend/kill us.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if ((s === 'background' || s === 'inactive') && isLoadedRef.current) {
        savePosition(id, prog.current.position, prog.current.duration);
      }
    });
    return () => sub.remove();
  }, [id]);

  const toggle = useCallback(() => {
    if (!hasAudio) return;

    // Not our track: load from the resume point and play.
    if (!isLoaded) {
      setLoadError(false);
      setStarting(true);
      emit('audio_play_started', { id });
      void (async () => {
        try {
          await loadPerspectiveAndPlay(perspective, getResumePosition(id, contractDuration));
        } catch (e) {
          setStarting(false);
          setLoadError(true);
          Sentry.captureException(e, { tags: { surface: 'audio-load', perspective: id } });
        }
      })();
      return;
    }

    if (status.playing) {
      pause();
      savePosition(id, prog.current.position, prog.current.duration);
      return;
    }

    // Paused/finished: replay from the top if we're at the end, else resume.
    const { position: pos, duration: dur } = prog.current;
    if (dur > 0 && pos >= dur - END_EPS) {
      clearPosition(id);
      void seekToSeconds(0);
    }
    play();
  }, [hasAudio, isLoaded, status.playing, perspective, id, contractDuration]);

  const seek = useCallback((fraction: number) => {
    const dur = prog.current.duration;
    if (dur > 0) void seekToSeconds(Math.min(1, Math.max(0, fraction)) * dur);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]);
  }, []);

  return { state, active, progress, buffered: 0, duration, speed, toggle, seek, cycleSpeed };
}
