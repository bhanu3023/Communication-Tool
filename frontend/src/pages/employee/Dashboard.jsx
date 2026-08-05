import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import DashboardProgress from '../../components/DashboardProgress';
import AttemptHistoryTable from '../../components/AttemptHistoryTable';
import LoadingScreen from '../../components/LoadingScreen';
import { getDashboard } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { sectionTitle, testPath } from '../../utils/levels';

const LEVEL = 1;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    getDashboard(LEVEL)
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) showToast('Failed to load dashboard', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const hasStarted = useMemo(
    () => (data?.cards || []).some((c) => c.attemptsUsed > 0),
    [data?.cards],
  );

  const coachHint = useMemo(() => {
    const attempted = (data?.cards || []).filter((c) => c.bestScore != null);
    if (!attempted.length) return null;
    const top = attempted.reduce((a, b) => (b.bestScore > a.bestScore ? b : a));
    const low = attempted.reduce((a, b) => (b.bestScore < a.bestScore ? b : a));
    return { top, low };
  }, [data?.cards]);

  if (loading) return <LoadingScreen />;
  if (!data) return null;

  return (
    <Box>
      <Paper sx={{ p: { xs: 3, md: 4 }, mb: 3, borderRadius: 3, background: 'linear-gradient(120deg, #ffffff 55%, #efeafc 100%)' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Welcome back, {data.name.split(' ')[0]} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
          {hasStarted
            ? 'Here is how you are doing across Listening, Speaking, and Writing.'
            : 'Your progress will appear here once you begin. Each section tracks separately.'}
        </Typography>
      </Paper>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        Your progress
      </Typography>
      <DashboardProgress
        cards={data.cards}
        history={data.history}
        onStartTest={!hasStarted ? () => navigate(testPath(1)) : undefined}
      />

      {hasStarted && (
        <Card sx={{ mt: 3, mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <AutoAwesomeIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Coaching
              </Typography>
            </Stack>
            {!coachHint ? (
              <Typography variant="body2" color="text.secondary">
                Complete at least one section to unlock personalised tips in AI Coach.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                AI Coach breaks down what to keep doing in {sectionTitle(coachHint.top.section)} and practical
                steps to strengthen {sectionTitle(coachHint.low.section)}.
              </Typography>
            )}
            <Button
              variant="text"
              size="small"
              endIcon={<ArrowForwardIcon />}
              sx={{ mt: 1.5, px: 0 }}
              onClick={() => navigate('/coach')}
            >
              Open AI Coach
            </Button>
          </CardContent>
        </Card>
      )}

      <AttemptHistoryTable
        rows={data.history}
        showLevelBadge={false}
        onTestClick={!hasStarted ? () => navigate(testPath(1)) : undefined}
      />
    </Box>
  );
}
