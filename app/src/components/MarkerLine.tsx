import { memo } from 'react';
import { Box } from '@mui/material';
import type { Marker } from '../types/audio';

interface MarkerLineProps {
  marker: Marker;
  index: number;
  duration: number;
  isInActiveLoop: boolean;
  onClick?: (id: string) => void;
}

const MarkerLine = ({
  marker,
  index,
  duration,
  isInActiveLoop,
  onClick,
}: MarkerLineProps) => {
  // Calculate position as percentage (works with any zoom level!)
  const leftPercent = (marker.time / duration) * 100;

  const handleClick = () => {
    if (onClick) {
      onClick(marker.id);
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: 0,
        bottom: 0,
        width: 0,
        zIndex: 10,
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      onClick={handleClick}
    >
      {/* Vertical line */}
      <Box
        sx={{
          position: 'absolute',
          left: '-1px',
          top: 0,
          bottom: 0,
          width: '2px',
          bgcolor: isInActiveLoop ? 'primary.main' : 'grey.500',
          transition: 'background-color 0.2s',
          '&:hover': {
            bgcolor: isInActiveLoop ? 'primary.dark' : 'grey.700',
          },
        }}
      />

      {/* Marker number */}
      <Box
        sx={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '10px',
          fontWeight: 600,
          color: isInActiveLoop ? 'primary.main' : 'grey.500',
          bgcolor: 'background.paper',
          px: 0.5,
          borderRadius: 0.5,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        #{index + 1}
      </Box>

      {/* Draggable handle */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          bgcolor: isInActiveLoop ? 'primary.main' : 'grey.500',
          border: '2px solid',
          borderColor: 'background.paper',
          cursor: 'grab',
          transition: 'transform 0.2s, background-color 0.2s',
          '&:hover': {
            transform: 'translate(-50%, -50%) scale(1.3)',
            bgcolor: isInActiveLoop ? 'primary.dark' : 'grey.700',
          },
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      />

      {/* Label if exists */}
      {marker.label && (
        <Box
          sx={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '11px',
            color: 'text.secondary',
            bgcolor: 'background.paper',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            maxWidth: '100px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {marker.label}
        </Box>
      )}
    </Box>
  );
};

export default memo(MarkerLine);
