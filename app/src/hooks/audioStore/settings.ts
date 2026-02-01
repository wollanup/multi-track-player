/**
 * Settings and UI preference actions for audioStore
 * Handles waveform style, zoom, timeline, minimap preferences
 */

import type { AudioStore } from '../../types/audio';
import {
  saveWaveformStyle,
  saveWaveformNormalize,
  saveWaveformTimeline,
  saveWaveformMinimap,
} from './shared';

export const createSettingsActions = (set: (partial: Partial<AudioStore> | ((state: AudioStore) => Partial<AudioStore>)) => void) => ({
  setWaveformStyle: (style: 'modern' | 'classic') => {
    set({ waveformStyle: style });
    saveWaveformStyle(style);
  },

  setWaveformNormalize: (normalize: boolean) => {
    set({ waveformNormalize: normalize });
    saveWaveformNormalize(normalize);
  },

  zoomIn: () => {
    set((state: AudioStore) => ({
      zoomLevel: state.zoomLevel < 10
        ? state.zoomLevel + 1
        : state.zoomLevel + 10
    }));
  },

  zoomOut: () => {
    set((state: AudioStore) => ({
      zoomLevel: state.zoomLevel > 10
        ? state.zoomLevel - 10
        : Math.max(state.zoomLevel - 1, 1)
    }));
  },

  setWaveformTimeline: (timeline: boolean) => {
    set({ waveformTimeline: timeline });
    saveWaveformTimeline(timeline);
  },

  setWaveformMinimap: (minimap: boolean) => {
    set({ waveformMinimap: minimap });
    saveWaveformMinimap(minimap);
  },
});
