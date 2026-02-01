/**
 * Track management actions for audioStore
 * Handles add, remove, update, reorder, mute, solo operations
 */

import type { AudioStore, AudioTrack } from '../../types/audio';
import {
  saveAudioFile,
  deleteAudioFile,
  getPiece,
  savePiece,
} from '../../utils/indexedDB';
import { COLORS, wavesurferInstances, generatePieceName } from './shared';
import { saveTrackSettingsToPiece } from './storage';

export const createTrackActions = (set: (partial: Partial<AudioStore> | ((state: AudioStore) => Partial<AudioStore>)) => void, get: () => AudioStore) => ({
  initAudioContext: () => {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    set({ audioContext: ctx });
  },

  addTrack: async (file: File) => {
    const { tracks, pause, seek, currentPieceId, createPiece } = get();

    if (tracks.length >= 8) {
      alert('Maximum 8 tracks allowed');
      return;
    }

    // Create piece if none exists
    let pieceId = currentPieceId;
    if (!pieceId) {
      pieceId = await createPiece(generatePieceName());
    }

    // Pause and reset position when adding a track
    pause();
    seek(0);

    const id = `track-${Date.now()}-${Math.random()}`;
    const color = COLORS[tracks.length % COLORS.length];

    const newTrack: AudioTrack = {
      id,
      name: file.name,
      file,
      volume: 0.8,
      isMuted: false,
      isSolo: false,
      color,
      isLoading: true,
    };

    const newTracks = [...tracks, newTrack];
    set({ tracks: newTracks });

    // Save file to IndexedDB
    try {
      await saveAudioFile(id, file);

      // Update piece with new track ID
      const piece = await getPiece(pieceId!);
      if (piece) {
        piece.trackIds = [...piece.trackIds, id];
        piece.updatedAt = Date.now();
        await savePiece(piece);
      }

      // Save settings to piece
      const state = get();
      await saveTrackSettingsToPiece(
        pieceId!,
        state.tracks.map(t => t.id === id ? { ...t, isLoading: false } : t),
        state.loopState,
        state.playbackState.playbackRate,
        state.masterVolume
      );

      // Mark as loaded
      set((state: AudioStore) => ({
        tracks: state.tracks.map((t) =>
          t.id === id ? { ...t, isLoading: false } : t
        ),
      }));
    } catch (error) {
      console.error('Failed to save audio file:', error);

      // Mark as loaded even on error
      set((state: AudioStore) => ({
        tracks: state.tracks.map((t) =>
          t.id === id ? { ...t, isLoading: false } : t
        ),
      }));
    }
  },

  removeTrack: async (id: string) => {
    const { currentPieceId } = get();

    // Delete from IndexedDB
    try {
      await deleteAudioFile(id);
    } catch (error) {
      console.error('Failed to delete audio file:', error);
    }

    const newTracks = get().tracks.filter((t) => t.id !== id);

    set({
      tracks: newTracks,
    });

    // Update piece
    if (currentPieceId) {
      const piece = await getPiece(currentPieceId);
      if (piece) {
        piece.trackIds = piece.trackIds.filter(tid => tid !== id);
        piece.updatedAt = Date.now();
        await savePiece(piece);
      }

      const state = get();
      await saveTrackSettingsToPiece(
        currentPieceId,
        newTracks,
        state.loopState,
        state.playbackState.playbackRate,
        state.masterVolume
      );
    }
  },

  removeAllTracks: async () => {
    const { tracks, pause, seek, currentPieceId } = get();

    // Pause and reset position
    pause();
    seek(0);

    // Delete all files from IndexedDB
    try {
      await Promise.all(tracks.map((track) => deleteAudioFile(track.id)));
    } catch (error) {
      console.error('Failed to delete audio files:', error);
    }

    // Clear tracks AND loop state
    set({
      tracks: [],
      loopState: {
        editMode: false,
        markers: [],
        loops: [],
        activeLoopId: null,
      }
    });

    // Update piece
    if (currentPieceId) {
      const piece = await getPiece(currentPieceId);
      if (piece) {
        piece.trackIds = [];
        piece.updatedAt = Date.now();
        await savePiece(piece);
      }

      await saveTrackSettingsToPiece(
        currentPieceId,
        [],
        { markers: [], loops: [], activeLoopId: null },
        1.0,
        1.0
      );
    }
  },

  updateTrack: (id: string, updates: Partial<AudioTrack>) => {
    const newTracks = get().tracks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    set({ tracks: newTracks });

    // Save to piece (async but don't wait)
    const { currentPieceId, loopState, playbackState, masterVolume } = get();
    if (currentPieceId) {
      saveTrackSettingsToPiece(
        currentPieceId,
        newTracks,
        loopState,
        playbackState.playbackRate,
        masterVolume
      ).catch(err => console.error('Failed to save track settings:', err));
    }
  },

  reorderTracks: (fromIndex: number, toIndex: number) => {
    const tracks = [...get().tracks];
    const [movedTrack] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, movedTrack);
    set({ tracks });

    // Save to piece
    const { currentPieceId, loopState, playbackState, masterVolume } = get();
    if (currentPieceId) {
      saveTrackSettingsToPiece(
        currentPieceId,
        tracks,
        loopState,
        playbackState.playbackRate,
        masterVolume
      ).catch(err => console.error('Failed to save track settings:', err));
    }
  },

  setVolume: (id: string, volume: number) => {
    get().updateTrack(id, { volume });
  },

  toggleMute: (id: string) => {
    const track = get().tracks.find((t) => t.id === id);
    if (!track) return;

    const newMutedState = !track.isMuted;
    get().updateTrack(id, { isMuted: newMutedState });

    // Update WaveSurfer instance directly
    const ws = wavesurferInstances.get(id);
    if (ws) {
      const allTracks = get().tracks;
      const hasSoloedTracks = allTracks.some(t => t.isSolo);
      const shouldBeMuted = newMutedState || (hasSoloedTracks && !track.isSolo);
      ws.setMuted(shouldBeMuted);
    }
  },

  toggleSolo: (id: string) => {
    const tracks = get().tracks;
    const track = tracks.find((t) => t.id === id);
    if (!track) return;

    const newSoloState = !track.isSolo;

    // Update track state
    get().updateTrack(id, { isSolo: newSoloState });

    // Calculate with the NEW state
    const allTracks = tracks.map(t =>
      t.id === id ? { ...t, isSolo: newSoloState } : t
    );
    const hasSoloedTracks = allTracks.some(t => t.isSolo);

    // Apply mute to ALL instances
    allTracks.forEach(t => {
      const ws = wavesurferInstances.get(t.id);
      if (ws) {
        const shouldBeMuted = t.isMuted || (hasSoloedTracks && !t.isSolo);
        ws.setMuted(shouldBeMuted);
      }
    });
  },

  exclusiveSolo: (id: string) => {
    const newTracks = get().tracks.map((t) => ({
      ...t,
      isSolo: t.id === id,
    }));
    set({ tracks: newTracks });

    // Save to piece
    const { currentPieceId, loopState, playbackState, masterVolume } = get();
    if (currentPieceId) {
      saveTrackSettingsToPiece(
        currentPieceId,
        newTracks,
        loopState,
        playbackState.playbackRate,
        masterVolume
      ).catch(err => console.error('Failed to save track settings:', err));
    }

    // Update all WaveSurfer instances - all except 'id' are muted
    newTracks.forEach(t => {
      const ws = wavesurferInstances.get(t.id);
      if (ws) {
        const shouldBeMuted = t.isMuted || t.id !== id;
        ws.setMuted(shouldBeMuted);
      }
    });
  },

  unmuteAll: () => {
    const newTracks = get().tracks.map((t) => ({
      ...t,
      isMuted: false,
    }));
    set({ tracks: newTracks });

    // Save to piece
    const { currentPieceId, loopState, playbackState, masterVolume } = get();
    if (currentPieceId) {
      saveTrackSettingsToPiece(
        currentPieceId,
        newTracks,
        loopState,
        playbackState.playbackRate,
        masterVolume
      ).catch(err => console.error('Failed to save track settings:', err));
    }

    // Update all WaveSurfer instances
    const hasSoloedTracks = newTracks.some(t => t.isSolo);
    newTracks.forEach(t => {
      const ws = wavesurferInstances.get(t.id);
      if (ws) {
        const shouldBeMuted = hasSoloedTracks && !t.isSolo;
        ws.setMuted(shouldBeMuted);
      }
    });
  },
});
