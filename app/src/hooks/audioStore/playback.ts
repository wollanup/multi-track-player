/**
 * Playback control actions for audioStore
 * Handles play, pause, seek, playback rate, and master volume
 */

import type { AudioStore } from '../../types/audio';
import { logger } from '../../utils/logger';
import {
  wavesurferInstances,
  finishedInstances,
  setIsSynchronizing,
} from './shared';
import { saveTrackSettingsToPiece } from './storage';

export const createPlaybackActions = (set: (partial: Partial<AudioStore> | ((state: AudioStore) => Partial<AudioStore>)) => void, get: () => AudioStore) => ({
  play: () => {
    const { tracks } = get();
    logger.debug('🎵 PLAY called - instances:', wavesurferInstances.size);

    // Check if any track is armed for recording
    const armedTrack = tracks.find((t) => t.isArmed && t.isRecordable);
    if (armedTrack) {
      get().startRecording(armedTrack.id);
    }

    // Clear finished set at the start of each play
    finishedInstances.clear();

    // Call play on all WaveSurfer instances SIMULTANEOUSLY
    const instances = Array.from(wavesurferInstances.entries());
    Promise.all(
      instances.map(([id, ws]) => {
        // Skip if track has already finished (currentTime >= duration)
        const currentTime = ws.getCurrentTime();
        const duration = ws.getDuration();

        if (currentTime >= duration) {
          logger.debug('Skipping finished instance:', id, `(${currentTime.toFixed(2)}s >= ${duration.toFixed(2)}s)`);
          finishedInstances.add(id); // Mark as finished
          return Promise.resolve();
        }

        logger.debug('Playing instance:', id);
        return ws.play().catch(err => console.warn('WaveSurfer play error:', err));
      })
    );

    set((state: AudioStore) => ({
      playbackState: { ...state.playbackState, isPlaying: true },
    }));
  },

  pause: () => {
    const { tracks } = get();

    // Stop recording if any track is recording
    const recordingTrack = tracks.find((t) => t.recordingState === 'recording');
    if (recordingTrack) {
      get().stopRecording(recordingTrack.id);
    }

    // Disarm any armed track
    const armedTrack = tracks.find((t) => t.isArmed);
    if (armedTrack) {
      get().toggleRecordArm(armedTrack.id); // Will disarm it
    }

    // Pause all WaveSurfer instances simultaneously
    const instances = Array.from(wavesurferInstances.values());
    instances.forEach((ws) => {
      ws.pause();
    });

    set((state: AudioStore) => ({
      playbackState: { ...state.playbackState, isPlaying: false },
    }));
  },

  seek: (time: number) => {
    const state = get();
    const preserveLoop = state._preserveLoopOnNextSeek || false;

    // Check if seeking inside the active loop (if any)
    let seekingInsideActiveLoop = false;
    if (!preserveLoop && state.loopState.activeLoopId) {
      const activeLoop = state.loopState.loops.find(l => l.id === state.loopState.activeLoopId);
      if (activeLoop) {
        const startMarker = state.loopState.markers.find(m => m.id === activeLoop.startMarkerId);
        const endMarker = state.loopState.markers.find(m => m.id === activeLoop.endMarkerId);
        if (startMarker && endMarker) {
          seekingInsideActiveLoop = time >= startMarker.time && time <= endMarker.time;
        }
      }
    }

    // Update state first
    set((state: AudioStore) => {
      const updates: Partial<AudioStore> = {
        playbackState: { ...state.playbackState, currentTime: time },
        _preserveLoopOnNextSeek: false,
      };

      // Disable active loop only if seeking outside of it
      if (!preserveLoop && !seekingInsideActiveLoop && state.loopState.activeLoopId) {
        logger.debug('🔓 Disabling loop (seeking outside loop)');
        updates.loopState = {
          ...state.loopState,
          activeLoopId: null,
          loops: state.loopState.loops.map(l => ({ ...l, enabled: false }))
        };

        // Save to piece
        if (state.currentPieceId) {
          saveTrackSettingsToPiece(
            state.currentPieceId,
            state.tracks,
            updates.loopState,
            state.playbackState.playbackRate,
            state.masterVolume
          ).catch(err => console.error('Failed to save loop state:', err));
        }
      } else if (seekingInsideActiveLoop) {
        logger.debug('✅ Keeping loop active (seeking inside loop)');
      }

      return updates;
    });

    // Set global flag to prevent feedback loops
    setIsSynchronizing(true);

    // Seek all WaveSurfer instances synchronously (no await)
    // Use Array.from to avoid iterator issues
    const instances = Array.from(wavesurferInstances.entries());
    const isCurrentlyPlaying = state.playbackState.isPlaying;

    // Seek all at once (WaveSurfer's setTime is sync for the call, async for rendering)
    instances.forEach(([id, ws]) => {
      ws.setTime(time);

      // If seeking back, check if this track can now play (was finished but new time < duration)
      const duration = ws.getDuration();
      if (finishedInstances.has(id) && time < duration) {
        logger.debug('🔄 Re-enabling finished track:', id, `(${time.toFixed(2)}s < ${duration.toFixed(2)}s)`);
        finishedInstances.delete(id);

        // If currently playing, restart playback on this track
        if (isCurrentlyPlaying) {
          logger.debug('▶️ Auto-playing re-enabled track:', id);
          ws.play().catch(err => console.warn('Failed to play re-enabled track:', err));
        }
      }
    });

    // Reset flag after a short delay
    setTimeout(() => {
      setIsSynchronizing(false);
    }, 50);
  },

  setPlaybackRate: (rate: number) => {
    // Set playback rate on all WaveSurfer instances
    wavesurferInstances.forEach((ws) => {
      ws.setPlaybackRate(rate, true); // true = preserve pitch
    });

    set((state: AudioStore) => ({
      playbackState: { ...state.playbackState, playbackRate: rate },
    }));

    // Save to piece
    const { currentPieceId, tracks, loopState, masterVolume } = get();
    if (currentPieceId) {
      saveTrackSettingsToPiece(
        currentPieceId,
        tracks,
        loopState,
        rate,
        masterVolume
      ).catch(err => console.error('Failed to save playback rate:', err));
    }
  },

  setMasterVolume: (volume: number) => {
    set({ masterVolume: volume });

    // Save to piece
    const { currentPieceId, tracks, loopState, playbackState } = get();
    if (currentPieceId) {
      saveTrackSettingsToPiece(
        currentPieceId,
        tracks,
        loopState,
        playbackState.playbackRate,
        volume
      ).catch(err => console.error('Failed to save master volume:', err));
    }
  },
});
