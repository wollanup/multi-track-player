/**
 * Recording management actions for audioStore
 * Handles recordable tracks, arm/disarm, start/stop recording, save/clear
 */

import type { AudioStore, AudioTrack } from '../../types/audio';
import { logger } from '../../utils/logger';
import {
  saveAudioFile,
  deleteAudioFile,
  getPiece,
  savePiece,
} from '../../utils/indexedDB';
import { COLORS, wavesurferInstances, generatePieceName } from './shared';
import { saveTrackSettingsToPiece } from './storage';

export const createRecordingActions = (set: (partial: Partial<AudioStore> | ((state: AudioStore) => Partial<AudioStore>)) => void, get: () => AudioStore) => ({
  addRecordableTrack: async () => {
    const { tracks, pause, currentPieceId, createPiece } = get();

    if (tracks.length >= 8) {
      alert('Maximum 8 tracks allowed');
      return;
    }

    // Create piece if none exists
    let pieceId = currentPieceId;
    if (!pieceId) {
      pieceId = await createPiece(generatePieceName());
    }

    // Pause playback (but keep cursor position)
    pause();
    // DON'T seek(0) - keep current position!

    // Generate name with date/time
    const name = generatePieceName();
    const id = `track-${Date.now()}-${Math.random()}`;
    const color = COLORS[tracks.length % COLORS.length];

    const newTrack: AudioTrack = {
      id,
      name,
      volume: 0.8, // Default volume for recordings
      isMuted: false,
      isSolo: false,
      color,
      isRecordable: true,
      isArmed: false,
      recordingState: 'idle',
    };

    const newTracks = [...tracks, newTrack];
    set({ tracks: newTracks });

    // Save settings to piece
    const state = get();
    await saveTrackSettingsToPiece(
      pieceId!,
      state.tracks,
      state.loopState,
      state.playbackState.playbackRate,
      state.masterVolume
    );

    // Update piece
    const piece = await getPiece(pieceId!);
    if (piece) {
      piece.updatedAt = Date.now();
      await savePiece(piece);
    }

    logger.debug('🎙️ Added recordable track:', name);
  },

  toggleRecordArm: (trackId: string) => {
    const { tracks, loopState } = get();

    const track = tracks.find((t) => t.id === trackId);
    if (!track || !track.isRecordable) return;

    const newArmedState = !track.isArmed;

    // If arming, save and disable loop
    if (newArmedState && loopState.activeLoopId !== null) {
      set({
        loopBackup: { activeLoopId: loopState.activeLoopId },
        loopState: { ...loopState, activeLoopId: null },
      });
    }

    // If disarming, restore loop
    if (!newArmedState) {
      const { loopBackup } = get();
      if (loopBackup) {
        set({
          loopState: { ...loopState, activeLoopId: loopBackup.activeLoopId },
          loopBackup: null,
        });
      }
    }

    // Update tracks (exclusive arm)
    const updatedTracks = tracks.map((t) => ({
      ...t,
      isArmed: t.id === trackId ? newArmedState : false,
      recordingState: t.id === trackId && newArmedState ? ('armed' as const) : ('idle' as const),
    }));

    set({ tracks: updatedTracks });
    logger.debug(`🎙️ ${newArmedState ? 'Armed' : 'Disarmed'} track:`, track.name);
  },

  startRecording: async (trackId: string) => {
    const { tracks, playbackState, audioContext } = get();

    const track = tracks.find((t) => t.id === trackId);
    if (!track || !track.isArmed) return;

    // Get PRECISE time from WaveSurfer instance (sample-accurate)
    let recordingStartOffset = 0;

    // Try to get precise time from first WaveSurfer instance
    const firstWavesurfer = Array.from(wavesurferInstances.values())[0];
    if (firstWavesurfer) {
      recordingStartOffset = firstWavesurfer.getCurrentTime();
      logger.log(`⏱️ Recording armed at PRECISE time from WaveSurfer: ${recordingStartOffset.toFixed(6)}s`);
    } else {
      // Fallback to playbackState (less precise)
      recordingStartOffset = playbackState.currentTime;
      logger.log(`⏱️ Recording armed at playbackState time: ${recordingStartOffset.toFixed(6)}s (less precise)`);
    }

    if (audioContext) {
      logger.log(`⏱️ AudioContext.currentTime: ${audioContext.currentTime.toFixed(6)}s`);
    }

    set({
      recordingStartTime: recordingStartOffset,
      tracks: tracks.map((t) =>
        t.id === trackId
          ? { ...t, recordingState: 'recording' as const, recordingStartOffset }
          : t
      ),
    });

    logger.debug('🎙️ Recording started at offset:', recordingStartOffset);
  },

  stopRecording: async (trackId: string) => {
    const { tracks } = get();

    set({
      tracks: tracks.map((t) =>
        t.id === trackId ? { ...t, recordingState: 'stopped' as const } : t
      ),
      recordingStartTime: null,
    });

    logger.debug('🎙️ Recording stopped');
  },

  // Called by WaveformDisplay when recording is complete with blob
  saveRecording: async (trackId: string, blob: Blob) => {
    const { currentPieceId, loopState, playbackState, masterVolume, tracks } = get();

    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    // Save the recording start offset to seek back to it
    const recordingStartOffset = track.recordingStartOffset || 0;

    // Create File from blob
    const fileName = `${track.name}.wav`;
    const file = new File([blob], fileName, { type: 'audio/wav' });

    // Save to IndexedDB
    try {
      await saveAudioFile(trackId, file);

      // Update piece
      if (currentPieceId) {
        const piece = await getPiece(currentPieceId);
        if (piece && !piece.trackIds.includes(trackId)) {
          piece.trackIds = [...piece.trackIds, trackId];
          piece.updatedAt = Date.now();
          await savePiece(piece);
        }

        // Save piece settings with updated track
        const updatedTracks = get().tracks.map((t) =>
          t.id === trackId
            ? { ...t, recordedBlob: blob, file, recordingState: 'stopped' as const }
            : t
        );

        await saveTrackSettingsToPiece(
          currentPieceId,
          updatedTracks,
          loopState,
          playbackState.playbackRate,
          masterVolume
        );
      }

      logger.debug('🎙️ Recording saved to IndexedDB:', blob.size, 'bytes');

      // Update state - this will trigger RecordableWaveform → WaveformDisplay switch
      set((state: AudioStore) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? { ...t, recordedBlob: blob, file, recordingState: 'stopped' as const }
            : t
        ),
        // Set pending seek - WaveformDisplay will pick this up on 'ready' event
        pendingSeekAfterReady: recordingStartOffset,
      }));

      logger.log(`⏱️ Pending seek after waveform ready: ${recordingStartOffset.toFixed(4)}s`);

    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  },

  clearRecording: async (trackId: string) => {
    const { currentPieceId, loopState, playbackState, masterVolume, tracks } = get();

    const track = tracks.find(t => t.id === trackId);
    if (!track || !track.isRecordable) return;

    try {
      // Delete audio file from IndexedDB
      await deleteAudioFile(trackId);

      // Update piece to remove trackId (if exists)
      if (currentPieceId) {
        const piece = await getPiece(currentPieceId);
        if (piece && piece.trackIds.includes(trackId)) {
          piece.trackIds = piece.trackIds.filter(id => id !== trackId);
          piece.updatedAt = Date.now();
          await savePiece(piece);
        }

        // Save piece settings (track remains but without file)
        const updatedTracks = tracks.map((t) =>
          t.id === trackId
            ? { ...t, recordedBlob: undefined, file: undefined, recordingState: 'idle' as const }
            : t
        );

        await saveTrackSettingsToPiece(
          currentPieceId,
          updatedTracks,
          loopState,
          playbackState.playbackRate,
          masterVolume
        );
      }

      logger.debug('🗑️ Cleared recording for track:', trackId);

      // Update state
      set((state: AudioStore) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? { ...t, recordedBlob: undefined, file: undefined, recordingState: 'idle' as const }
            : t
        ),
      }));
    } catch (error) {
      console.error('Failed to clear recording:', error);
    }
  },
});
