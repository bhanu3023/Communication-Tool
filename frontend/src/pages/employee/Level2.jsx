import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Fade, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LoadingScreen from '../../components/LoadingScreen';
import LevelHero, { HeroButton } from '../../components/LevelHero';
import SectionTile from '../../components/SectionTile';
import AttemptHistoryTable from '../../components/AttemptHistoryTable';
import Level2Gate from '../../components/Level2Gate';
import { getHistory, getSections } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { SECTION_CODES, levelTheme, rulesSummary } from '../../utils/levels';

const LEVEL = 2;

// Same sections, harder brief — the copy tells the candidate why this is a step up.
const LEVEL2_DETAIL = {
  LISTENING: 'One dense cutover briefing, played once. 10 inference questions — the answers are implied, not stated.',
  SPEAKING: '10 sentences of two lines each — migration terminology, business idiom and spoken figures.',
  WRITING: 'A live customer escalation and an incident report, marked hardest on completeness.',
};

/**
 * Level 2 — a separate portal built from the SAME blocks as Level 1 (hero, three
 * section tiles, attempt history) so nothing has to be relearned. The deep-teal
 * accent, the level pills and the large "2" mark the change.
 *
 * Everything here is real: cards, attempts, pass marks and the gate all come from
 * `/employee/sections?level=2`, and the backend refuses a locked Level 2 start
 * independently of what this page renders.
 */
export default function Level2() {
  const [cards, setCards] = useState(null);
  const [level1Cards, setLevel1Cards] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const t = levelTheme(LEVEL);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getSections(LEVEL), getSections(1), getHistory(LEVEL)])
      .then(([l2, l1, hist]) => {
        if (!active) return;
        setCards(l2);
        setLevel1Cards(l1);
        setHistory(hist || []);
      })
      .catch(() => {
        if (active) showToast('Could not load Level 2', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  // The gate is reported by the backend on every Level 2 card.
  const unlocked = !!cards && cards.every((c) => c.levelUnlocked);
  const passedLevel1 = (level1Cards || []).filter((c) => c.passed).length;

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <LevelHero
        level={LEVEL}
        locked={!unlocked}
        cards={level1Cards}
        title={unlocked ? 'Level 2 is open 🚀' : 'Level 2 — locked'}
        blurb={
          unlocked
            ? `Three tougher tests — ${rulesSummary(LEVEL)}. Take them in any order; your Level 1 results stay exactly as they are.`
            : `Pass all three Level 1 tests to open this portal. Level 2 keeps the same three sections at a harder level, with ${rulesSummary(LEVEL)}.`
        }
        action={
          unlocked ? (
            // Identical entry point to Level 1: the hero CTA leads to "Choose a Test".
            <HeroButton level={LEVEL} endIcon={<ArrowForwardIcon />} onClick={() => navigate(`/assessment?level=${LEVEL}`)}>
              Go to Test
            </HeroButton>
          ) : (
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {passedLevel1}/{SECTION_CODES.length}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Level 1 sections passed
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(passedLevel1 / SECTION_CODES.length) * 100}
                sx={{
                  mt: 1.5,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.22)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#fff', borderRadius: 4 },
                }}
              />
            </Box>
          )
        }
      />

      {/* Same three-tile row as Level 1 — dimmed and inert until the gate opens. */}
      <Grid
        container
        spacing={2}
        sx={{
          mb: 3,
          opacity: unlocked ? 1 : 0.6,
          pointerEvents: unlocked ? 'auto' : 'none',
          transition: 'opacity .3s ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        {(cards || []).map((card) => (
          <Grid item xs={12} md={4} key={card.section}>
            <SectionTile
              card={card}
              level={LEVEL}
              locked={!unlocked}
              detail={LEVEL2_DETAIL[card.section]}
            />
          </Grid>
        ))}
      </Grid>

      {/* The gate replaces the Level 1 banner in the same slot. */}
      {!unlocked ? (
        <Fade in timeout={300}>
          <Box sx={{ mb: 3 }}>
            <Level2Gate cards={level1Cards} />
          </Box>
        </Fade>
      ) : (
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: `${t.accent}0f` }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <RocketLaunchIcon sx={{ color: t.accent }} />
            <Box>
              <Typography variant="subtitle2">What changes in Level 2</Typography>
              <Typography variant="body2" color="text.secondary">
                Harder content, stricter marking, and a tighter margin: {rulesSummary(LEVEL)}. Attempts
                are counted separately from Level 1, so nothing you already earned is at risk.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      <AttemptHistoryTable
        rows={history}
        level={LEVEL}
        emptyMessage={
          unlocked ? 'No Level 2 attempts yet — press Go to Test to begin.' : 'Unlock Level 2 to start building history here.'
        }
      />

      {!unlocked && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip size="small" variant="outlined" label={`Level 2 rules · ${rulesSummary(LEVEL)}`} />
        </Stack>
      )}
    </Box>
  );
}
