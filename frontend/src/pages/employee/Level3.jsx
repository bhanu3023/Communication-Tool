import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Fade,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LoadingScreen from '../../components/LoadingScreen';
import { getHistory, getLevelReadiness, getSections } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import {
  LOCKED_THEME,
  SECTION_CODES,
  levelRules,
  levelTheme,
  rulesSummary,
  sectionTitle,
} from '../../utils/levels';

const LEVEL = 3;
const BELOW = 2;

const SECTION_META = {
  LISTENING: {
    icon: <HeadphonesIcon />,
    brief: 'A long, dense briefing played once, with questions whose answers are implied rather than stated.',
  },
  SPEAKING: {
    icon: <MicIcon />,
    brief: 'Extended passages read aloud, judged on the English you produce rather than how exactly you echo it.',
  },
  WRITING: {
    icon: <EditNoteIcon />,
    brief: 'A situation with several things to hold together at once, marked hardest on completeness and precision.',
  },
};

/* ------------------------------------------------------------------ small parts */

/**
 * The three-dot readiness meter in the command bar. Filled = section passed at this level,
 * so a candidate can read their standing without parsing three numbers.
 */
function Readiness({ cards, tone }) {
  const passed = (cards || []).filter((c) => c.passed).length;
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Stack direction="row" spacing={0.6}>
        {SECTION_CODES.map((code, i) => (
          <Box
            key={code}
            sx={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              bgcolor: i < passed ? '#fff' : 'rgba(255,255,255,0.28)',
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          />
        ))}
      </Stack>
      <Typography variant="caption" sx={{ color: tone, opacity: 0.9, letterSpacing: 0.3 }}>
        {passed} of {SECTION_CODES.length} passed
      </Typography>
    </Stack>
  );
}

/**
 * Attempt scores as a bar strip. Deliberately not a chart library: three to six bars carry
 * the trend on their own, and the page already asks a lot of the eye.
 */
function Sparkline({ scores, accent }) {
  if (!scores.length) return null;
  return (
    <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 34 }}>
      {scores.map((s, i) => (
        <Tooltip key={i} title={`Attempt ${i + 1} · ${Math.round(s)}`} arrow>
          <Box
            sx={{
              width: 10,
              borderRadius: '3px 3px 0 0',
              height: `${Math.max(12, (s / 100) * 34)}px`,
              bgcolor: accent,
              opacity: 0.35 + (i / Math.max(1, scores.length - 1)) * 0.65,
            }}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}

/** One row of the left rail. The rail IS the navigation, so the whole row is the target. */
function RailRow({ card, meta, selected, locked, accent, onSelect }) {
  const title = sectionTitle(card.section);
  const state = locked
    ? 'Locked'
    : card.passed
      ? `Passed · ${Math.round(card.bestScore)}`
      : card.exhausted
        ? 'No attempts left'
        : card.attemptsUsed > 0
          ? `${card.attemptsAllowed - card.attemptsUsed} of ${card.attemptsAllowed} left`
          : 'Not started';

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(card.section)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(card.section)}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        px: 2,
        py: 1.75,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: selected ? '#fff' : 'transparent',
        borderLeft: '3px solid',
        borderColor: selected ? accent : 'transparent',
        transition: 'background-color .16s ease, border-color .16s ease',
        '&:hover': { bgcolor: selected ? '#fff' : 'rgba(1,41,172,0.05)' },
        '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: -2 },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Box
        sx={{
          color: locked ? 'text.disabled' : selected ? accent : 'text.secondary',
          display: 'flex',
          '& svg': { fontSize: 20 },
        }}
      >
        {locked ? <LockIcon /> : meta.icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: selected ? 600 : 500, color: locked ? 'text.disabled' : 'text.primary' }}
        >
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {state}
        </Typography>
      </Box>
      {card.passed && !locked && <CheckCircleIcon sx={{ fontSize: 17, color: 'success.main' }} />}
    </Box>
  );
}

/* ------------------------------------------------------------------ the page */

/**
 * Level 3 — the top of the ladder, and the one portal that is NOT built from the Level 1/2
 * blocks (hero, three tiles, history table). It is a console: a command bar that always states
 * where you stand and what to do next, a rail of the three sections, and one detail panel for
 * whichever you are looking at.
 *
 * Why not reuse the tile grid: three equal tiles say "these are three things"; at this level the
 * useful question is "what do I do next, and how close am I?" — which is a focus problem, not a
 * grid problem. The rail answers the first and the panel answers the second, and there is room in
 * the panel for detail that would never fit in a tile.
 *
 * Everything here is server state: the gate, the attempt counts and the pass marks all come from
 * `/employee/sections?level=3`, and the backend refuses a locked start independently of what this
 * page renders. The readiness call is the one addition — Level 3 ships before its questions do,
 * so the portal says that out loud rather than letting a candidate spend an attempt to find out.
 */
export default function Level3() {
  const [cards, setCards] = useState(null);
  const [belowCards, setBelowCards] = useState(null);
  const [history, setHistory] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [selected, setSelected] = useState(SECTION_CODES[0]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const t = levelTheme(LEVEL);

  const load = useCallback(
    () =>
      Promise.all([
        getSections(LEVEL),
        getSections(BELOW),
        getHistory(LEVEL),
        getLevelReadiness(LEVEL).catch(() => null),
      ])
        .then(([l3, l2, hist, ready]) => {
          setCards(l3);
          setBelowCards(l2);
          setHistory(hist || []);
          setReadiness(ready);
        })
        .catch(() => showToast('Could not load Level 3', 'error')),
    [showToast],
  );

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const unlocked = !!cards && cards.every((c) => c.levelUnlocked);
  const accent = unlocked ? t.accent : LOCKED_THEME.accent;
  const card = useMemo(
    () => (cards || []).find((c) => c.section === selected) || (cards || [])[0],
    [cards, selected],
  );

  // What to do next: the first section that is neither passed nor out of attempts.
  const next = useMemo(
    () => (cards || []).find((c) => !c.passed && c.canStart) || null,
    [cards],
  );

  const sectionReady = (code) =>
    !readiness || (readiness.sections || []).find((s) => s.section === code)?.ready !== false;

  const scoresFor = (code) =>
    history
      .filter((h) => h.section === code && h.score != null)
      .map((h) => h.score)
      .reverse();

  if (loading) return <LoadingScreen />;

  const passedBelow = (belowCards || []).filter((c) => c.passed).length;

  return (
    <Box>
      {/* ---------------------------------------------------------- command bar */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          mb: 2.5,
          background: unlocked ? t.hero : LOCKED_THEME.hero,
          color: '#fff',
        }}
      >
        <Box sx={{ px: { xs: 2.5, md: 3.5 }, py: { xs: 2.5, md: 2.75 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <WorkspacePremiumIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: 2, fontWeight: 600, opacity: 0.9, lineHeight: 1.4 }}
                >
                  Level 3 · Mastery
                </Typography>
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.75 }}>
                {unlocked ? 'The top of the ladder' : 'Locked until Level 2 is complete'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, maxWidth: 560 }}>
                {unlocked
                  ? `The same three sections, judged at the highest bar the app sets — ${rulesSummary(LEVEL)}. Your Level 1 and Level 2 results are untouched by anything you do here.`
                  : `Pass all three Level 2 sections to open this portal. Level 3 keeps the same three sections at ${rulesSummary(LEVEL)}.`}
              </Typography>
            </Box>

            <Stack spacing={1.5} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
              <Readiness cards={unlocked ? cards : belowCards} tone="#fff" />
              {unlocked ? (
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  disabled={!next || !sectionReady(next.section)}
                  onClick={() => navigate(`/assessment?level=${LEVEL}`)}
                  sx={{
                    bgcolor: '#fff',
                    color: t.accent,
                    fontWeight: 600,
                    px: 2.5,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                    '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.8)' },
                  }}
                >
                  {next ? `Begin ${sectionTitle(next.section)}` : 'All sections done'}
                </Button>
              ) : (
                <Box sx={{ width: { xs: '100%', md: 220 } }}>
                  <LinearProgress
                    variant="determinate"
                    value={(passedBelow / SECTION_CODES.length) * 100}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.22)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#fff', borderRadius: 3 },
                    }}
                  />
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>
                    {passedBelow}/{SECTION_CODES.length} Level 2 sections passed
                  </Typography>
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* ------------------------------------------------- content-not-seeded notice */}
      {unlocked && readiness && !readiness.ready && (
        <Fade in timeout={260}>
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
              Level 3 questions are still being written
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The portal is live and your attempts are reserved, but a section can only be started
              once its questions are published:{' '}
              {(readiness.sections || [])
                .map((s) => `${sectionTitle(s.section)} — ${s.label}`)
                .join(' · ')}
              .
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* ---------------------------------------------------------- rail + panel */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: t.line,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: 320,
        }}
      >
        {/* Rail */}
        <Box
          sx={{
            width: { xs: '100%', md: 232 },
            flexShrink: 0,
            bgcolor: t.wash,
            borderRight: { md: '1px solid' },
            borderBottom: { xs: '1px solid', md: 'none' },
            borderColor: `${t.line} !important`,
            py: 1,
          }}
        >
          {(cards || []).map((c) => (
            <RailRow
              key={c.section}
              card={c}
              meta={SECTION_META[c.section] || {}}
              selected={card?.section === c.section}
              locked={!unlocked}
              accent={t.accent}
              onSelect={setSelected}
            />
          ))}
        </Box>

        {/* Detail panel */}
        <Box sx={{ flex: 1, p: { xs: 2.5, md: 3 }, minWidth: 0 }}>
          {card && (
            <Fade in key={card.section} timeout={200}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {sectionTitle(card.section)}
                  </Typography>
                  <Chip
                    size="small"
                    label={`Pass mark ${Math.round(card.passMark)}`}
                    sx={{ bgcolor: `${t.accent}14`, color: t.accent, fontWeight: 600 }}
                  />
                  {card.passed && (
                    <Chip size="small" color="success" label="Passed" sx={{ fontWeight: 600 }} />
                  )}
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 620 }}>
                  {SECTION_META[card.section]?.brief}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {/* Numbers that matter, on one line */}
                <Stack
                  direction="row"
                  spacing={{ xs: 3, md: 5 }}
                  alignItems="flex-end"
                  useFlexGap
                  flexWrap="wrap"
                  sx={{ mb: 2.5 }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Best
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                      {card.bestScore != null ? Math.round(card.bestScore) : '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Latest
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                      {card.latestScore != null ? Math.round(card.latestScore) : '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Attempts
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                      {card.attemptsUsed}
                      <Typography component="span" variant="body2" color="text.secondary">
                        {' '}
                        / {card.attemptsAllowed}
                      </Typography>
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto' }}>
                    <Sparkline scores={scoresFor(card.section)} accent={t.accent} />
                  </Box>
                </Stack>

                {/* The one action, with the reason when it is unavailable */}
                {!unlocked ? (
                  <Typography variant="body2" color="text.secondary">
                    Complete Level 2 to open this section.
                  </Typography>
                ) : !sectionReady(card.section) ? (
                  <Button variant="outlined" disabled sx={{ borderColor: t.line }}>
                    Questions not published yet
                  </Button>
                ) : card.canStart ? (
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate(`/assessment?level=${LEVEL}`)}
                    sx={{ bgcolor: t.accent, fontWeight: 600, '&:hover': { bgcolor: '#01218c' } }}
                  >
                    Begin {sectionTitle(card.section)}
                  </Button>
                ) : card.passed ? (
                  <Typography variant="body2" color="text.secondary">
                    Passed at {Math.round(card.bestScore)}. Nothing further is needed here.
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {card.requestPending
                      ? 'Your request for another attempt is with your manager.'
                      : 'No attempts left at this level — ask your manager for another.'}
                  </Typography>
                )}
              </Box>
            </Fade>
          )}
        </Box>
      </Paper>

      {/* ---------------------------------------------------------- gate / timeline */}
      {!unlocked ? (
        <Paper elevation={0} sx={{ mt: 2.5, p: 2.5, borderRadius: 3, border: '1px solid', borderColor: t.line }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            What opens Level 3
          </Typography>
          <Stack spacing={1.25}>
            {SECTION_CODES.map((code) => {
              const c = (belowCards || []).find((x) => x.section === code);
              const mark = c?.passMark ?? 80;
              const best = c?.bestScore ?? null;
              const done = !!c?.passed;
              return (
                <Stack key={code} direction="row" alignItems="center" spacing={1.5}>
                  {done ? (
                    <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                  ) : (
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: 'divider',
                      }}
                    />
                  )}
                  <Typography variant="body2" sx={{ minWidth: 92, fontWeight: done ? 600 : 400 }}>
                    {sectionTitle(code)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {done
                      ? `Level 2 passed at ${Math.round(best)}`
                      : best == null
                        ? `Not attempted at Level 2 — needs ${Math.round(mark)}`
                        : `${Math.round(best)} at Level 2 — ${Math.round(mark - best)} short of ${Math.round(mark)}`}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ mt: 2.5, p: 2.5, borderRadius: 3, border: '1px solid', borderColor: t.line }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: history.length ? 2 : 0.5 }}>
            Attempt timeline
          </Typography>
          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No Level 3 attempts yet. Whatever you take first appears here, newest on the right.
            </Typography>
          ) : (
            <Box sx={{ position: 'relative', overflowX: 'auto', pb: 1 }}>
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 17,
                  height: 2,
                  bgcolor: t.line,
                }}
              />
              <Stack direction="row" spacing={3} sx={{ position: 'relative', minWidth: 'min-content' }}>
                {[...history].reverse().map((h, i) => {
                  const passed = h.score != null && h.score >= levelRules(LEVEL).passMark;
                  return (
                    <Stack key={i} alignItems="center" spacing={0.75} sx={{ minWidth: 96 }}>
                      <Tooltip title={`${sectionTitle(h.section)} · attempt ${h.attemptNumber}`} arrow>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#fff',
                            bgcolor: passed ? 'success.main' : t.accent,
                            border: '3px solid #fff',
                          }}
                        >
                          {h.score != null ? Math.round(h.score) : '—'}
                        </Box>
                      </Tooltip>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {sectionTitle(h.section)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {h.date}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
