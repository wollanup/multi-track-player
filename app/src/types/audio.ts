export interface AudioTrack {
  id: string;
  name: string;
  file: File;
  volume: number; // 0-1
  isMuted: boolean;
  isSolo: boolean;
  color: string;
  isLoading?: boolean; // True during file import/loading
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number; // 0.5 - 2.0
}

// Loop v2 types
export interface Marker {
  id: string;
  time: number;
  createdAt: number;
  label?: string;
}

export interface Loop {
  id: string;
  startMarkerId: string;
  endMarkerId: string;
  enabled: boolean;
  createdAt: number;
}

export interface LoopState {
  markers: Marker[];
  loops: Loop[];
  activeLoopId: string | null;
  editMode: boolean;
}

export interface AudioStore {
  tracks: AudioTrack[];
  playbackState: PlaybackState;
  loopState: LoopState; // Loop v2
  audioContext: AudioContext | null;
  masterVolume: number; // 0-1
  showLoopPanel: boolean;
  zoomLevel: number;
  waveformStyle: 'modern' | 'classic';
  waveformNormalize: boolean;
  waveformTimeline: boolean;
  waveformMinimap: boolean;
  _preserveLoopOnNextSeek?: boolean; // Internal flag for loop activation
  
  addTrack: (file: File) => void;
  removeTrack: (id: string) => void;
  removeAllTracks: () => void;
  updateTrack: (id: string, updates: Partial<AudioTrack>) => void;
  setVolume: (id: string, volume: number) => void;
  toggleMute: (id: string) => void;
  toggleSolo: (id: string) => void;
  exclusiveSolo: (id: string) => void;
  unmuteAll: () => void;
  
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setMasterVolume: (volume: number) => void;
  
  toggleLoopPanel: () => void;

  // Loop v2 actions
  toggleLoopEditMode: () => void;
  addMarker: (time: number, label?: string) => string;
  removeMarker: (id: string) => void;
  updateMarkerTime: (id: string, time: number) => void;
  createLoop: (startMarkerId: string, endMarkerId: string) => string;
  removeLoop: (id: string) => void;
  toggleLoopById: (id: string) => void;
  setActiveLoop: (id: string | null) => void;

  zoomIn: () => void;
  zoomOut: () => void;
  setWaveformStyle: (style: 'modern' | 'classic') => void;
  setWaveformNormalize: (normalize: boolean) => void;
  setWaveformTimeline: (timeline: boolean) => void;
  setWaveformMinimap: (minimap: boolean) => void;
  
  initAudioContext: () => void;
}
