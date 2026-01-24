import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import { Loop as LoopIcon } from '@mui/icons-material';
import type { Loop, Marker } from '../types/audio';

interface LoopZoneProps {
  loop: Loop;
  startMarker: Marker;
  endMarker: Marker;
  startMarkerIndex: number;
  endMarkerIndex: number;
  duration: number;
  onClick?: (id: string) => void;
}

const LoopZone = ({
  loop,
  startMarker,
  endMarker,
  startMarkerIndex,
  endMarkerIndex,
  duration,
  onClick,
}: LoopZoneProps) => {
  const startPercent = (startMarker.time / duration) * 100;
  const endPercent = (endMarker.time / duration) * 100;
  const widthPercent = endPercent - startPercent;

  const handleClick = () => {
    if (onClick) {
      onClick(loop.id);
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        left: `${startPercent}%`,
        top: 0,
        bottom: 0,
        width: `${widthPercent}%`,
        zIndex: 5,
        pointerEvents: 'auto',
        cursor: loop.enabled ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
      onClick={handleClick}
    >
      {/* Background zone */}
      <Box
        sx={{
          position: 'absolute',
          inset: '8px 0',
          bgcolor: loop.enabled 
            ? 'rgba(25, 118, 210, 0.2)' // primary with opacity
            : 'rgba(158, 158, 158, 0.1)', // grey with opacity
          border: '3px',
          borderStyle: loop.enabled ? 'solid' : 'dashed',
          borderColor: loop.enabled ? 'primary.main' : 'grey.500',
          borderRadius: 2,
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: loop.enabled 
              ? 'rgba(25, 118, 210, 0.3)'
              : 'rgba(158, 158, 158, 0.15)',
          },
        }}
      />

      {/* Label */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          color: loop.enabled ? 'primary.main' : 'grey.500',
          pointerEvents: 'none',
        }}
      >
        {loop.enabled && <LoopIcon sx={{ fontSize: 16 }} />}
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            fontSize: '11px',
          }}
        >
          LOOP #{startMarkerIndex + 1} ↔ #{endMarkerIndex + 1}
        </Typography>
      </Box>

      {/* Left handle */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          bgcolor: loop.enabled ? 'primary.main' : 'grey.500',
          border: '2px solid',
          borderColor: 'background.paper',
          cursor: 'ew-resize',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translate(-50%, -50%) scale(1.3)',
          },
        }}
      />

      {/* Right handle */}
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translate(50%, -50%)',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          bgcolor: loop.enabled ? 'primary.main' : 'grey.500',
          border: '2px solid',
          borderColor: 'background.paper',
          cursor: 'ew-resize',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translate(50%, -50%) scale(1.3)',
          },
        }}
      />
    </Box>
  );
};

export default memo(LoopZone);
