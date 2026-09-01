import { Chip, Stack, Tooltip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { LEVELS_NAV, LOCKED_THEME, isLevel1Complete, isLevelComplete, levelTheme } from '../utils/levels';

/**
 * Compact level switcher for the inner pages (Feedback, AI Coach) — the same pills as
 * the level heroes, so switching level is the same gesture everywhere.
 *
 * A locked level stays SELECTABLE on purpose: choosing it shows the gate, which is
 * how the user finds out what is still missing. It just never wears the level's accent
 * until it is earned.
 *
 * `cards` gates Level 2 (they are the Level 1 cards). `level2Cards` gates Level 3 the same
 * way; pages that do not fetch them get an unlocked-looking Level 3 pill, which is honest —
 * the gate itself is enforced server-side and shown on the portal, and a lock icon that is
 * wrong is worse than no lock icon at all.
 */
export default function LevelTabs({ value, onChange, cards, level2Cards, sx, alwaysUnlocked = false }) {
  // Managers review every level whether or not the employee has unlocked it, so the lock
  // is a candidate-side concept only.
  const level2Open = alwaysUnlocked || isLevel1Complete(cards);
  const level3Open = alwaysUnlocked || level2Cards === undefined || isLevelComplete(level2Cards);
  const openAt = { 1: true, 2: level2Open, 3: level3Open };

  return (
    <Stack direction="row" spacing={1} sx={sx}>
      {LEVELS_NAV.map((lvl) => {
        const active = lvl.n === value;
        const locked = !openAt[lvl.n];
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
          <Tooltip key={lvl.n} title={`Locked — pass all three Level ${lvl.n - 1} tests`} arrow>
            {pill}
          </Tooltip>
        ) : (
          pill
        );
      })}
    </Stack>
  );
}
