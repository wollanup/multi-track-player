import { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useAudioStore } from '../hooks/useAudioStore';
import { useTranslation } from 'react-i18next';

interface FullScreenDropZoneProps {
  isDragging: boolean;
  onDragLeave: () => void;
}

const FullScreenDropZone = ({ isDragging, onDragLeave }: FullScreenDropZoneProps) => {
  const { addTrack, tracks } = useAudioStore();
  const { t } = useTranslation();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        if (file.type.includes('audio') && tracks.length < 8) {
          addTrack(file);
        }
      });
      onDragLeave();
    },
    [addTrack, tracks.length, onDragLeave]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!isDragging || tracks.length >= 8) {
    return null;
  }

  return (
    <Box
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        bgcolor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
        border: '4px dashed',
        borderColor: 'primary.main',
      }}
    >
      <CloudUpload sx={{ fontSize: 120, color: 'primary.main', mb: 3 }} />
      <Typography variant="h3" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
        {t('upload.dropHere')}
      </Typography>
      <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
        {t('upload.description')}
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 3 }}>
        {t('track.count', { current: tracks.length, max: 8 })}
      </Typography>
    </Box>
  );
};

export default FullScreenDropZone;
