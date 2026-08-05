import { useCallback, useEffect, useState } from 'react';
import { Box, Fade, Grid, Paper, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import LoadingScreen from '../../components/LoadingScreen';
import { LevelToggleRow } from '../../components/LevelToggle';
import { getDashboard, getSections } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { isLevel1Complete } from '../../utils/levels';

const COLUMNS = [
  {
    key: 'strengths',
    title: 'Strengths',
    icon: <CheckCircleIcon />,
    color: '#2e7d32',
    tint: 'rgba(46,125,50,0.08)',
    border: 'rgba(46,125,50,0.25)',
    empty: 'Complete a section to start building strengths.',
  },
  {
    key: 'weaknesses',
    title: 'Focus Areas',
    icon: <ReportProblemIcon />,
    color: '#ed6c02',
    tint: 'rgba(237,108,2,0.08)',
    border: 'rgba(237,108,2,0.25)',
    empty: 'No focus areas yet.',
  },
  {
    key: 'suggestions',
    title: 'Suggestions',
    icon: <LightbulbOutlinedIcon />,
    color: '#3000ae',
    tint: 'rgba(48,0,174,0.06)',
    border: 'rgba(48,0,174,0.2)',
    empty: 'Suggestions will appear as you attempt sections.',
  },
];

function FeedbackColumn({ col, items }) {
  const list = items && items.length ? items : [col.empty];
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 3, height: '100%', borderColor: col.border, bgcolor: col.tint }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            color: col.color,
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: col.border,
          }}
        >
          {col.icon}
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {col.title}
        </Typography>
      </Stack>

      <Stack spacing={1.25}>
        {list.map((text, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ color: col.color, mt: '2px', display: 'flex', flexShrink: 0 }}>{col.icon}</Box>
            <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
              {text}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

export default function AICoach() {
  const [data, setData] = useState(null);
  const [level1Cards, setLevel1Cards] = useState(null);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const level2Unlocked = isLevel1Complete(level1Cards);
  const isUnlocked = useCallback((n) => n === 1 || level2Unlocked, [level2Unlocked]);

  useEffect(() => {
    if (level !== 1 && level1Cards && !isUnlocked(level)) {
      setLevel(1);
    }
  }, [level, level1Cards, isUnlocked]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDashboard(level, { ai: true })
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) showToast('Failed to load AI coach', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [level, showToast]);

  useEffect(() => {
    getSections(1)
      .then(setLevel1Cards)
      .catch(() => setLevel1Cards(null));
  }, []);

  if (loading) return <LoadingScreen />;
  if (!data) return null;

  const fb = data.aiFeedback || {};

  return (
    <Box>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(120deg, #ffffff 50%, #efeafc 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  bgcolor: 'primary.main',
                }}
              >
                <AutoAwesomeIcon />
              </Box>
              <Typography variant="h4">AI Coach</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
              Section-by-section coaching that updates after each attempt.
            </Typography>
          </Box>
          <LevelToggleRow value={level} onChange={setLevel} isUnlocked={isUnlocked} />
        </Stack>
      </Paper>

      <Fade in timeout={260} key={`coach-${level}`}>
        <Grid container spacing={2.5}>
          {COLUMNS.map((col) => (
            <Grid item xs={12} md={4} key={col.key}>
              <FeedbackColumn col={col} items={fb[col.key]} />
            </Grid>
          ))}
        </Grid>
      </Fade>
    </Box>
  );
}
