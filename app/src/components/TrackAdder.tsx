import { useCallback } from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';
import { Add, Mic } from '@mui/icons-material';
import { useAudioStore } from '../hooks/useAudioStore';
import { useTranslation } from 'react-i18next';

const TrackAdder = () => {
  const { addTrack, addRecordableTrack, tracks, isRecordingSupported } = useAudioStore();
  const { t } = useTranslation();

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        if (tracks.length < 8) {
          addTrack(file);
        }
      });
    },
    [addTrack, tracks.length]
  );

  if (tracks.length >= 8) {
    return null;
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Track counter - always visible */}
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ mb: 2, textAlign: 'center' }}
      >
        {t('track.count', { current: tracks.length, max: 8 })}
      </Typography>

      {/* Buttons */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={2} 
        sx={{ justifyContent: 'center' }}
      >
        {/* Import audio file button */}
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => document.getElementById('file-input')?.click()}
          component="label"
        >
          {t('track.importAudioTrack')}
        </Button>

        {/* Add recordable track button */}
        {isRecordingSupported && (
          <Button
            variant="outlined"
            startIcon={<Mic />}
            onClick={addRecordableTrack}
          >
            {t('track.addRecordableTrack')}
          </Button>
        )}
      </Stack>

      {/* Hidden file input */}
      <input
        id="file-input"
        type="file"
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </Box>
  );
};

export default TrackAdder;
