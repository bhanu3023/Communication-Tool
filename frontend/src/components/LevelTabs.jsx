import { Chip, Stack, Tooltip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { LEVELS_NAV, LOCKED_THEME, isLevel1Complete, levelTheme } from '../utils/levels';

/**
 * Compact level switcher for the inner pages (Feedback, AI Coach) — the same pills as
 * the level heroes, so switching level is the same gesture everywhere.
 *
 * A locked Level 2 stays SELECTABLE on purpose: choosing it shows the gate, which is
 * how the user finds out what is still missing. It just never wears the teal accent
 * until it is earned.
 */
export default function LevelTabs({ value, onChange, cards, sx, alwaysUnlocked = false }) {
  // Managers review Level 2 whether or not the employee has unlocked it, so the lock
  // is a candidate-side concept only.
  const level2Open = alwaysUnlocked || isLevel1Complete(cards);

  return (
    <Stack direction="row" spacing={1} sx={sx}>
      {LEVELS_NAV.map((lvl) => {
        const active = lvl.n === value;
        const locked = lvl.n === 2 && !level2Open;
        const accent = locked ? LOCKED_THEME.accent : levelTheme(lvl.n).accent;
        const pill = (
          <Chip
            key={lvl.n}
            icon={locked ? <LockIcon /> : undefined}
            label={lvl.label}
            onClick={() => onChange(lvl.n)}
            sx={{
              fontWeight: active ? 700 : 500,
              color: active ? '#fff' : 'text.secondary',
              bgcolor: active ? accent : 'rgba(0,0,0,0.06)',
              '& .MuiChip-icon': { color: 'inherit', fontSize: 15 },
              transition: 'background-color .18s ease, color .18s ease',
              '&:hover': { bgcolor: active ? accent : 'rgba(0,0,0,0.1)' },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          />
        );
        return locked ? (
          <Tooltip key={lvl.n} title="Locked — pass all three Level 1 tests" arrow>
            {pill}
          </Tooltip>
        ) : (
          pill
        );
      })}
    </Stack>
  );
}
