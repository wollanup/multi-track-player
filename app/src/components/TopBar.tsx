import { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Slider,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  DarkMode,
  DeleteSweep,
  Edit,
  GraphicEq,
  HelpOutline,
  LightMode,
  MoreVert,
  Refresh,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { StemuxIcon } from './StemuxIcon';

interface TopBarProps {
  hasLoadedTracks: boolean;
  zoomLevel: number;
  sliderValue: number;
  loopEditMode: boolean;
  prefersDarkMode: boolean;
  isMobile: boolean;
  tracksCount: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onZoomChange: (value: number) => void;
  onSliderDragStart: (value: number) => void;
  onSliderDragEnd: () => void;
  onToggleLoopEditMode: () => void;
  onOpenHelp: () => void;
  onOpenThemeDialog: () => void;
  onOpenSettings: () => void;
  onOpenDeleteAllDialog: () => void;
}

const TopBar = ({
  hasLoadedTracks,
  zoomLevel,
  sliderValue,
  loopEditMode,
  prefersDarkMode,
  isMobile,
  tracksCount,
  onZoomOut,
  onZoomIn,
  onZoomChange,
  onSliderDragStart,
  onSliderDragEnd,
  onToggleLoopEditMode,
  onOpenHelp,
  onOpenThemeDialog,
  onOpenSettings,
  onOpenDeleteAllDialog,
}: TopBarProps) => {
  const { t } = useTranslation();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <AppBar position="fixed" elevation={2} color="default" sx={{ bgcolor: 'background.paper' }}>
      <Toolbar>
        <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
          <StemuxIcon size={28} />
        </Box>
        <Typography variant="body1" component="div">
          Stemux
        </Typography>
        <Box sx={{ flexGrow: 1 }} />

        {/* Zoom controls */}
        <IconButton
          color="inherit"
          onClick={onZoomOut}
          disabled={!hasLoadedTracks || zoomLevel <= 0}
          aria-label="Zoom out"
        >
          <ZoomOut />
        </IconButton>

        <Slider
          value={sliderValue}
          onChange={(_, value) => {
            const newValue = value as number;
            onSliderDragStart(newValue);
            onZoomChange(newValue);
          }}
          onChangeCommitted={onSliderDragEnd}
          min={0}
          max={100}
          disabled={!hasLoadedTracks}
          size="small"
          color="secondary"
          sx={{ width: 120, mx: 1 }}
          aria-label="Zoom"
        />

        <IconButton
          color="inherit"
          onClick={onZoomIn}
          disabled={!hasLoadedTracks || zoomLevel >= 500}
          aria-label="Zoom in"
          sx={{ mr: 1 }}
        >
          <ZoomIn />
        </IconButton>

        <Stack gap={2} direction="row" alignItems="center">
          {/* Loop v2 Edit Mode button */}
          {isMobile ? (
            <IconButton
              color={loopEditMode ? 'warning' : 'secondary'}
              onClick={onToggleLoopEditMode}
              disabled={!hasLoadedTracks}
              aria-label={t('markers.editMode')}
            >
              <Edit />
            </IconButton>
          ) : (
            <Button
              variant={loopEditMode ? 'contained' : 'outlined'}
              color="secondary"
              onClick={onToggleLoopEditMode}
              disabled={!hasLoadedTracks}
              aria-label={t('markers.editMode')}
              startIcon={<Edit />}
              size="small"
            >
              {t('markers.title')}
            </Button>
          )}

          {/* Menu button */}
          <IconButton
            color="inherit"
            onClick={(e) => setMenuAnchorEl(e.currentTarget)}
            aria-label={t('menu.title')}
          >
            <MoreVert />
          </IconButton>
        </Stack>

        {/* Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              setMenuAnchorEl(null);
              onOpenHelp();
            }}
          >
            <ListItemIcon>
              <HelpOutline fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('help.title')}</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={() => {
              setMenuAnchorEl(null);
              onOpenThemeDialog();
            }}
          >
            <ListItemIcon>
              {prefersDarkMode ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{t('menu.theme')}</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={(e) => {
              setMenuAnchorEl(null);
              // Blur the button to avoid aria-hidden focus conflict
              if (e.currentTarget) {
                (e.currentTarget as HTMLElement).blur();
              }
              setTimeout(() => onOpenSettings(), 50);
            }}
          >
            <ListItemIcon>
              <GraphicEq fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('menu.interface')}</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={() => {
              setMenuAnchorEl(null);
              onOpenDeleteAllDialog();
            }}
            disabled={tracksCount === 0}
          >
            <ListItemIcon>
              <DeleteSweep fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('menu.deleteAllTracks')}</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={async () => {
              setMenuAnchorEl(null);
              // Unregister all service workers and hard reload
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map((reg) => reg.unregister()));
              }
              // Hard reload bypassing all caches
              window.location.reload();
            }}
          >
            <ListItemIcon>
              <Refresh fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('menu.refresh')}</ListItemText>
          </MenuItem>

          <MenuItem disabled sx={{ opacity: '0.6 !important' }}>
            <ListItemText
              primary={`v${import.meta.env.VITE_APP_VERSION || '0.0.0'}`}
              slotProps={{
                primary: {
                  variant: 'caption',
                  color: 'text.secondary',
                },
              }}
            />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
