import { Box, Button, Stack, Tooltip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { levelCatalog, levelTheme, levelUnlockHint } from '../utils/levels';

/** Compact level toggle — tagline on hover when unlocked; unlock hint when locked. */
export default function LevelToggle({ n, active, unlocked, onSelect }) {
  const theme = levelTheme(n);
  const entry = levelCatalog().find((l) => l.n === n);
  const label = entry?.shortLabel ?? `L${n}`;
  const tooltip = unlocked ? entry?.tagline ?? '' : levelUnlockHint(n);

  const button = (
    <Button
      size="small"
      disabled={!unlocked}
      aria-label={entry?.label ? `${entry.label} tests` : `Level ${n} tests`}
      aria-pressed={active}
      onClick={() => unlocked && onSelect(n)}
      startIcon={!unlocked ? <LockIcon sx={{ fontSize: 16 }} /> : undefined}
      sx={{
        minWidth: 88,
        px: 2,
        py: 0.75,
        fontWeight: 700,
        textTransform: 'none',
        borderRadius: 2,
        border: '1.5px solid',
        borderColor: active ? theme.accent : 'divider',
        bgcolor: active ? `${theme.accent}14` : 'background.paper',
        color: active ? theme.accent : unlocked ? 'text.primary' : 'text.disabled',
        '&:hover': unlocked
          ? { bgcolor: active ? `${theme.accent}20` : 'action.hover', borderColor: theme.accent }
          : {},
        '&.Mui-disabled': { opacity: 0.55, borderColor: 'divider', bgcolor: 'action.disabledBackground' },
      }}
    >
      {label}
    </Button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip title={tooltip} arrow placement="top">
      <Box component="span" sx={{ display: 'inline-flex' }}>
        {button}
      </Box>
    </Tooltip>
  );
}

/** Row of level toggles (Test, AI Coach, etc.). */
export function LevelToggleRow({ value, onChange, isUnlocked, sx }) {
  return (
    <Stack direction="row" spacing={1} sx={sx}>
      {levelCatalog().map(({ n }) => (
        <LevelToggle
          key={n}
          n={n}
          active={value === n}
          unlocked={isUnlocked(n)}
          onSelect={onChange}
        />
      ))}
    </Stack>
  );
}
