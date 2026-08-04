import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LoadingScreen from '../../components/LoadingScreen';
import LevelHero, { HeroButton } from '../../components/LevelHero';
import SectionTile from '../../components/SectionTile';
import AttemptHistoryTable from '../../components/AttemptHistoryTable';
import Level2Banner from '../../components/Level2Banner';
import Level2UnlockDialog from '../../components/Level2UnlockDialog';
import { getDashboard } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { isUnlockCelebrated, levelRules, markUnlockCelebrated } from '../../utils/levels';

const LEVEL = 1;

/**
 * Level 1 — the employee's landing page. Hero with the "Go to Test" entry point, a
 * read-only status tile per section, the Level 2 pointer, and the attempt history.
 * Level 2 (`pages/employee/Level2.jsx`) is built from the same three blocks in the
 * same order, so only the accent tells them apart.
 */
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUnlock, setShowUnlock] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    getDashboard(LEVEL)
      .then((d) => {
        setData(d);
        // The unlock moment: fires on the first dashboard load after the third
        // Level 1 section is passed, then never again. `nextLevelUnlocked` is the
        // server's own verdict, so the celebration can never disagree with the gate.
        if (d.nextLevelUnlocked && !isUnlockCelebrated()) setShowUnlock(true);
      })
      .catch(() => showToast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const closeUnlock = () => {
    markUnlockCelebrated();
    setShowUnlock(false);
  };

  if (loading) return <LoadingScreen />;
  if (!data) return null;

  return (
    <Box>
      <LevelHero
        level={LEVEL}
        cards={data.cards}
        title={`Welcome back, ${data.name.split(' ')[0]} 👋`}
        blurb={`Take Listening, Speaking and Writing in any order — each section is scored on its own, with up to ${levelRules(LEVEL).attempts} attempts. Pass all three to unlock Level 2.`}
        action={
          <HeroButton level={LEVEL} endIcon={<ArrowForwardIcon />} onClick={() => navigate('/assessment')}>
            Go to Test
          </HeroButton>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {data.cards.map((card) => (
          <Grid item xs={12} md={4} key={card.section}>
            <SectionTile card={card} level={LEVEL} />
          </Grid>
        ))}
      </Grid>

      {/* Pointer to the Level 2 portal (shows gate progress while still locked) */}
      <Level2Banner cards={data.cards} />

      <AttemptHistoryTable
        rows={data.history}
        level={LEVEL}
        emptyMessage={
          <>
            No attempts completed yet — press <strong>Go to Test</strong> to begin.
          </>
        }
      />

      <Level2UnlockDialog
        open={showUnlock}
        onEnter={() => {
          closeUnlock();
          navigate('/level-2');
        }}
        onClose={closeUnlock}
      />
    </Box>
  );
}
