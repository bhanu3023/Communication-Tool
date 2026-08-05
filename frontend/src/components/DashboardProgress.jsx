import { Box, Button, Card, CardContent, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { scoreColor } from '../utils/format';
import { SECTION_CODES, sectionTitle } from '../utils/levels';

const SECTION_META = {
  LISTENING: { icon: HeadphonesIcon, color: '#1565c0' },
  SPEAKING: { icon: MicIcon, color: '#00acc1' },
  WRITING: { icon: EditNoteIcon, color: '#7b1fa2' },
};

function TrendLabel({ delta }) {
  if (delta == null) return null;
  const up = delta > 0;
  const flat = delta === 0;
  const Icon = up ? TrendingUpIcon : flat ? TrendingFlatIcon : TrendingDownIcon;
  const color = up ? 'success.main' : flat ? 'text.secondary' : 'warning.main';
  const text = up ? `Up ${delta} since your first try` : flat ? 'Holding steady' : `Down ${Math.abs(delta)} from first try`;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color, mt: 0.5 }}>
      <Icon sx={{ fontSize: 15 }} />
      <Typography variant="caption">{text}</Typography>
    </Stack>
  );
}

function sectionTrend(history, section) {
  const rows = (history || [])
    .filter((h) => h.section === section && h.score != null)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
  if (rows.length < 2) return null;
  return Math.round((rows[rows.length - 1].score - rows[0].score) * 10) / 10;
}

/**
 * Visual snapshot of how the candidate is doing — scores, trends, and plain-language
 * takeaways. Dashboard-only; detailed rules live on the Test page.
 */
export default function DashboardProgress({ cards = [], history = [], onStartTest }) {
  const bySection = Object.fromEntries(cards.map((c) => [c.section, c]));
  const attempted = cards.filter((c) => c.bestScore != null);

  const strongest = attempted.length
    ? attempted.reduce((a, b) => (b.bestScore > a.bestScore ? b : a))
    : null;
  const focus = attempted.length
    ? attempted.reduce((a, b) => (b.bestScore < a.bestScore ? b : a))
    : null;

  const passedCount = cards.filter((c) => c.passed).length;
  const startedCount = cards.filter((c) => c.attemptsUsed > 0).length;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {SECTION_CODES.map((code) => {
          const card = bySection[code];
          const meta = SECTION_META[code];
          const Icon = meta.icon;
          const score = card?.bestScore;
          const hasScore = score != null;
          const trend = sectionTrend(history, code);

          return (
            <Grid item xs={12} md={4} key={code}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
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
                      <Icon fontSize="small" />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {sectionTitle(code)}
                      </Typography>
                      {card?.passed ? (
                        <Chip size="small" color="success" label="Passed" sx={{ mt: 0.5, height: 22 }} />
                      ) : hasScore ? (
                        <Chip size="small" variant="outlined" label="In progress" sx={{ mt: 0.5, height: 22 }} />
                      ) : (
                        <Chip size="small" variant="outlined" label="Not started" sx={{ mt: 0.5, height: 22 }} />
                      )}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: hasScore ? 'text.primary' : 'text.disabled' }}>
                      {hasScore ? score : '—'}
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={hasScore ? score : 0}
                    color={hasScore ? scoreColor(score) : 'inherit'}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': { borderRadius: 4 },
                    }}
                  />
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      Best score
                    </Typography>
                    {card?.improvement != null && (
                      <Typography variant="caption" color="text.secondary">
                        {card.improvement > 0 ? '+' : ''}
                        {card.improvement} vs previous
                      </Typography>
                    )}
                  </Stack>
                  <TrendLabel delta={trend} />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Card sx={{ borderRadius: 3, bgcolor: 'rgba(48,0,174,0.04)' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Your snapshot
          </Typography>
          {startedCount === 0 ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                You have not started yet. Your scores and trends will show up here after your first attempt.
              </Typography>
              {onStartTest && (
                <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={onStartTest} sx={{ alignSelf: 'flex-start' }}>
                  Go to Test
                </Button>
              )}
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>Progress:</strong> {passedCount} of {SECTION_CODES.length} sections passed
                {startedCount < SECTION_CODES.length
                  ? ` · ${SECTION_CODES.length - startedCount} still to try`
                  : ''}
                .
              </Typography>
              {strongest && (
                <Typography variant="body2">
                  <strong>Going well:</strong> {sectionTitle(strongest.section)} is your strongest area right now
                  (best {strongest.bestScore}/100).
                </Typography>
              )}
              {focus && focus.section !== strongest?.section && !focus.passed && (
                <Typography variant="body2">
                  <strong>Focus next:</strong> A little more practice in {sectionTitle(focus.section)} could make
                  the biggest difference (best {focus.bestScore}/100).
                </Typography>
              )}
              {focus?.passed && strongest && (
                <Typography variant="body2" color="text.secondary">
                  Keep building consistency — retakes can still raise your best scores.
                </Typography>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
