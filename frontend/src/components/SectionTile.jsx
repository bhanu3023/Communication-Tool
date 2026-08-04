import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { LOCKED_THEME, levelTheme, sectionTitle } from '../utils/levels';

const SECTION_META = {
  LISTENING: { icon: <HeadphonesIcon />, color: '#1565c0' },
  SPEAKING: { icon: <MicIcon />, color: '#00acc1' },
  WRITING: { icon: <EditNoteIcon />, color: '#7b1fa2' },
};

/** Small colored improvement indicator (vs the previous attempt of the section). */
export function Improvement({ value }) {
  if (value == null) return null;
  const up = value > 0;
  const flat = value === 0;
  const color = up ? 'success.main' : flat ? 'text.secondary' : 'error.main';
  const Icon = up ? TrendingUpIcon : flat ? TrendingFlatIcon : TrendingDownIcon;
  return (
    <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color }}>
      <Icon sx={{ fontSize: 16 }} />
      <Typography variant="caption" sx={{ fontWeight: 700, color }}>
        {up ? '+' : ''}
        {value} vs last
      </Typography>
    </Stack>
  );
}

/**
 * One section's status tile — identical anatomy on both levels (icon, attempts chip,
 * status chip, Latest / Best rows), so the pages read the same. The level only
 * changes the accent stripe and the level chip, plus whether a Start action is shown.
 */
export default function SectionTile({ card, level = 1, action, detail, locked = false }) {
  const t = levelTheme(level);
  const meta = SECTION_META[card.section] || {};
  const title = sectionTitle(card.section);

  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Accent stripe — the per-level tell, at the same spot on every tile. Locked
          tiles stay neutral so the level's colour only ever means "earned". */}
      <Box sx={{ height: 4, bgcolor: locked ? LOCKED_THEME.muted : t.accent }} />
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color: meta.color,
              bgcolor: `${meta.color}14`,
            }}
          >
            {meta.icon}
          </Box>
          <Typography variant="h6">{title}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            variant="outlined"
            color={card.exhausted ? 'default' : 'primary'}
            label={`${card.attemptsUsed}/${card.attemptsAllowed}`}
          />
        </Stack>

        <Box sx={{ mb: 1.5 }}>
          {card.result === 'Passed' ? (
            <Chip size="small" color="success" label={`Passed ✓ (best ≥ ${card.passMark})`} />
          ) : card.result === 'Not passed' ? (
            <Chip size="small" color="error" label={`Not passed — needed ${card.passMark}`} />
          ) : (
            <Chip size="small" variant="outlined" label={`Pass mark: ${card.passMark}`} />
          )}
        </Box>

        {detail && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {detail}
          </Typography>
        )}

        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Latest
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {card.latestScore == null ? '—' : `${card.latestScore}/100`}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Best
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Improvement value={card.improvement} />
            <Typography variant="body2" fontWeight={700}>
              {card.bestScore == null ? '—' : `${card.bestScore}/100`}
            </Typography>
          </Stack>
        </Stack>

        {action && (
          <Button
            variant={action.disabled ? 'outlined' : 'contained'}
            fullWidth
            disabled={action.disabled}
            sx={{
              mt: 2,
              ...(action.disabled
                ? {}
                : { bgcolor: t.accent, '&:hover': { bgcolor: t.accent, filter: 'brightness(0.92)' } }),
            }}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
