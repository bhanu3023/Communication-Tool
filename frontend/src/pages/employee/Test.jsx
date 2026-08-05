import { useCallback, useEffect, useState } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import LoadingScreen from '../../components/LoadingScreen';
import LevelSectionPicker, { levelPickerBlurb } from '../../components/LevelSectionPicker';
import { LevelToggleRow } from '../../components/LevelToggle';
import { getSections, requestAttempt } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { isLevel1Complete, levelCatalog, levelTheme } from '../../utils/levels';

export default function Test() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLevel = Number(searchParams.get('level')) || 1;

  const [level1Cards, setLevel1Cards] = useState(null);
  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const level2Unlocked = isLevel1Complete(level1Cards);
  const isUnlocked = useCallback((n) => n === 1 || level2Unlocked, [level2Unlocked]);
  const level = isUnlocked(requestedLevel) ? requestedLevel : 1;
  const t = levelTheme(level);

  useEffect(() => {
    if (requestedLevel !== 1 && level1Cards && !isUnlocked(requestedLevel)) {
      setSearchParams({ level: '1' }, { replace: true });
    }
  }, [requestedLevel, level1Cards, isUnlocked, setSearchParams]);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([getSections(1), getSections(level)])
      .then(([l1, lx]) => {
        setLevel1Cards(l1);
        setCards(lx);
      })
      .catch(() => showToast('Could not load tests', 'error'))
      .finally(() => setLoading(false));
  }, [level, showToast]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getSections(1), getSections(level)])
      .then(([l1, lx]) => {
        if (!active) return;
        setLevel1Cards(l1);
        setCards(lx);
      })
      .catch(() => {
        if (active) showToast('Could not load tests', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [level, showToast]);

  const onRequest = (code) => {
    setRequesting(true);
    requestAttempt(code, level)
      .then(() => {
        showToast('Request sent to your manager.', 'success');
        load();
      })
      .catch((e) => showToast(e?.response?.data?.message || 'Could not send request', 'error'))
      .finally(() => setRequesting(false));
  };

  if (loading && !cards) return <LoadingScreen />;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Tests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pick a level, then choose a section.
          </Typography>
        </Box>
        <LevelToggleRow
          value={level}
          onChange={(lv) => setSearchParams({ level: String(lv) })}
          isUnlocked={isUnlocked}
        />
      </Stack>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, borderTop: `4px solid ${t.accent}` }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Choose a section
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {levelPickerBlurb(level)}
        </Typography>
      </Paper>

      <LevelSectionPicker
        level={level}
        cards={cards}
        level1Cards={level1Cards}
        requesting={requesting}
        onRequest={onRequest}
      />
    </Box>
  );
}
