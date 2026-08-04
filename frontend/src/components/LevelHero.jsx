import { useNavigate } from 'react-router-dom';
import { Button, Chip, Grid, Stack, Tooltip, Typography } from '@mui/material';
import Paper from '@mui/material/Paper';
import LockIcon from '@mui/icons-material/Lock';
import { LEVELS_NAV, LOCKED_THEME, isLevel1Complete, levelTheme } from '../utils/levels';

/**
 * Shared hero for both level pages. Same shape on Level 1 and Level 2 — eyebrow,
 * title, blurb, primary action — with two things that make the level switch
 * impossible to miss: the accent/background flips (light indigo -> deep teal) and a
 * large level numeral sits behind the content.
 *
 * The level pills double as navigation, so moving between levels is one click from
 * either side.
 */
export default function LevelHero({ level, title, blurb, action, cards, locked = false }) {
  const navigate = useNavigate();
  // A locked portal wears the neutral slate look, not its own accent — see LOCKED_THEME.
  const t = locked ? { ...levelTheme(level), ...LOCKED_THEME } : levelTheme(level);
  const onDark = locked || level !== 1;
  const level2Open = isLevel1Complete(cards);

  return (
    <Paper
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 3, md: 4 },
        mb: 3,
        borderRadius: 3,
        color: t.heroText,
        background: t.hero,
        transition: 'background .35s ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {/* Oversized level numeral — the ambient "which level am I in" cue. */}
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          right: { xs: -8, md: 24 },
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: { xs: 120, md: 168 },
          fontWeight: 800,
          lineHeight: 1,
          opacity: onDark ? 0.14 : 0.06,
          color: onDark ? '#fff' : t.accent,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {level}
      </Typography>

      <Grid container spacing={2} alignItems="center" sx={{ position: 'relative' }}>
        <Grid item xs={12} md={8}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            {LEVELS_NAV.map((lvl) => {
              const active = lvl.n === level;
              const locked = lvl.n === 2 && !level2Open;
              const pill = (
                <Chip
                  key={lvl.n}
                  size="small"
                  icon={locked ? <LockIcon /> : undefined}
                  label={lvl.label}
                  onClick={active ? undefined : () => navigate(lvl.path)}
                  sx={{
                    fontWeight: active ? 700 : 500,
                    cursor: active ? 'default' : 'pointer',
                    color: active ? t.onAccent : onDark ? 'rgba(255,255,255,0.85)' : 'text.secondary',
                    bgcolor: active ? t.accent : onDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.06)',
                    '& .MuiChip-icon': { color: 'inherit', fontSize: 14 },
                    '&:hover': { bgcolor: active ? t.accent : onDark ? 'rgba(255,255,255,0.26)' : 'rgba(0,0,0,0.1)' },
                  }}
                />
              );
              return locked ? (
                <Tooltip key={lvl.n} title="Pass all three Level 1 tests to unlock" arrow>
                  {pill}
                </Tooltip>
              ) : (
                pill
              );
            })}
            <Typography variant="overline" sx={{ letterSpacing: 2, opacity: 0.7 }}>
              {t.tagline}
            </Typography>
          </Stack>

          <Typography variant="h4" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ maxWidth: 580, opacity: onDark ? 0.9 : 1 }} color={onDark ? 'inherit' : 'text.secondary'}>
            {blurb}
          </Typography>
        </Grid>

        {action && (
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' }, position: 'relative' }}>
            {action}
          </Grid>
        )}
      </Grid>
    </Paper>
  );
}

/** Convenience wrapper so both pages style their hero CTA identically. */
export function HeroButton({ level, children, sx, ...rest }) {
  const onDark = level !== 1;
  return (
    <Button
      variant="contained"
      size="large"
      sx={{
        ...(onDark && {
          bgcolor: 'rgba(255,255,255,0.18)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
        }),
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}
