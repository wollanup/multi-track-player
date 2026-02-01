/**
 * Main audio store - orchestrates all audio state management modules
 * Refactored into modular structure for better maintainability
 */

import { create } from 'zustand';
import type WaveSurfer from 'wavesurfer.js';
import type { AudioStore } from '../types/audio';
import {
  getAllPieces,
  getAllAudioFiles,
  getPiece,
  savePiece,
  savePieceSettings,
} from '../utils/indexedDB';
import { logger } from '../utils/logger';
import {
  loadPlaybackRate,
  loadMasterVolume,
  loadLoopV2State,
  loadWaveformStyle,
  loadWaveformNormalize,
  loadWaveformTimeline,
  loadWaveformMinimap,
  loadCurrentPieceId,
  loadTrackSettings,
  generatePieceName,
  wavesurferInstances,
  finishedInstances,
  COLORS,
  getIsSynchronizing as getIsSynchronizingFromShared,
} from './audioStore/shared';
import { createPlaybackActions } from './audioStore/playback';
import { createTrackActions } from './audioStore/tracks';
import { createLoopActions } from './audioStore/loops';
import { createRecordingActions } from './audioStore/recording';
import { createPieceActions } from './audioStore/pieces';
import { createSettingsActions } from './audioStore/settings';

// Re-export for backwards compatibility with existing code
export { wavesurferInstances } from './audioStore/shared';
export { loadTrackSettings } from './audioStore/shared';


export const useAudioStore = create<AudioStore>((set, get) => ({
  // Initial state
  tracks: [],
  playbackState: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: loadPlaybackRate(),
  },
  loopState: {
    ...loadLoopV2State(),
    editMode: false,
  },
  masterVolume: loadMasterVolume(),
  audioContext: null,
  showLoopPanel: false,
  zoomLevel: 0,
  waveformStyle: loadWaveformStyle() as 'modern' | 'classic',
  waveformNormalize: loadWaveformNormalize(),
  waveformTimeline: loadWaveformTimeline(),
  waveformMinimap: loadWaveformMinimap(),
  currentPieceId: loadCurrentPieceId(),
  currentPieceName: '',

  // Recording state
  isRecordingSupported: typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function',
  mediaStream: null,
  recordingStartTime: null,
  loopBackup: null,
  pendingSeekAfterReady: null,

  // Compose all action modules
  ...createPlaybackActions(set, get),
  ...createTrackActions(set, get),
  ...createLoopActions(set, get),
  ...createRecordingActions(set, get),
  ...createPieceActions(set, get),
  ...createSettingsActions(set),
}));

// Function to restore tracks from IndexedDB on app init
export const restoreTracks = async () => {
  try {
    const state = useAudioStore.getState();

    if (!state.audioContext) {
      state.initAudioContext();
    }

    // Check if pieces exist
    const pieces = await getAllPieces();
    
    if (pieces.length === 0) {
      // Migration: Check for legacy localStorage data
      const trackSettings = loadTrackSettings();
      const storedFiles = await getAllAudioFiles();
      
      if (storedFiles.length > 0) {
        // Migrate legacy data to a new piece
        logger.debug('🔄 Migrating legacy data to new piece system');
        
        const pieceName = generatePieceName();
        const pieceId = await state.createPiece(pieceName);
        
        // Create piece with existing track IDs
        const piece = await getPiece(pieceId);
        if (piece) {
          piece.trackIds = storedFiles.map(f => f.id);
          piece.updatedAt = Date.now();
          await savePiece(piece);
        }
        
        // Migrate settings
        const loopState = loadLoopV2State();
        await savePieceSettings(pieceId, {
          trackSettings: trackSettings.length > 0 ? trackSettings : storedFiles.map((f, idx) => ({
            id: f.id,
            name: f.file.name,
            volume: 0.8,
            isMuted: false,
            isSolo: false,
            color: COLORS[idx % COLORS.length],
          })),
          loopState: {
            markers: loopState.markers || [],
            loops: loopState.loops || [],
            activeLoopId: loopState.activeLoopId || null,
          },
          playbackRate: loadPlaybackRate(),
          masterVolume: loadMasterVolume(),
        });
        
        // Load the migrated piece
        await state.loadPiece(pieceId);
        
        logger.debug('✅ Migration complete');
        return;
      }
      
      // No data to restore
      return;
    }

    // Load current piece or first piece
    let currentPieceId = state.currentPieceId;
    
    if (!currentPieceId || !pieces.find(p => p.id === currentPieceId)) {
      // Load most recently updated piece
      const sortedPieces = pieces.sort((a, b) => b.updatedAt - a.updatedAt);
      currentPieceId = sortedPieces[0].id;
    }

    if (currentPieceId) {
      await state.loadPiece(currentPieceId);
    }
  } catch (error) {
    console.error('Failed to restore tracks:', error);
  }
};

// Helper functions to manage WaveSurfer instances
export const registerWavesurfer = (trackId: string, instance: WaveSurfer) => {
  wavesurferInstances.set(trackId, instance);
  finishedInstances.delete(trackId); // Reset finish state when registering
};

export const unregisterWavesurfer = (trackId: string) => {
  wavesurferInstances.delete(trackId);
  finishedInstances.delete(trackId);
};

export const markTrackFinished = (trackId: string) => {
  finishedInstances.add(trackId);

  // Check if ALL tracks have finished
  const allFinished = wavesurferInstances.size > 0 &&
                      finishedInstances.size === wavesurferInstances.size;

  if (allFinished) {
    logger.debug('🏁 All tracks finished playing');
    const { pause, seek } = useAudioStore.getState();
    pause();
    seek(0); // Reset to start
    // Clear finished set for next playback
    finishedInstances.clear();
  }
};

export const getWavesurfer = (trackId: string) => {
  return wavesurferInstances.get(trackId);
};

export const getAllWavesurfers = () => {
  return Array.from(wavesurferInstances.values());
};

// Export function to check if currently synchronizing
export const getIsSynchronizing = getIsSynchronizingFromShared;
