import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SaveIcon from '@mui/icons-material/Save';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ScoreGauge from '../../components/ScoreGauge';
import LockedVideo from '../../components/LockedVideo';
import CircularTimer from '../../components/CircularTimer';
import { WritingSection } from '../../components/AttemptReview';
import { useCountdown } from '../../hooks/useCountdown';
import { useExamMode } from '../../hooks/useExamMode';
import ExamWarningDialog from '../../components/ExamWarningDialog';
import ScoringScreen from '../../components/ScoringScreen';
import { recordViolation, saveDraft, startWriting, submitWriting } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';

/** Builds a fill-in skeleton from the outline: each point becomes a line to complete. */
function buildTemplate(prompt) {
  const outline = prompt?.outline || [];
  if (!outline.length) return '';
  return outline.map((o) => `[${o}]`).join('\n\n');
}

export default function Writing() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [phase, setPhase] = useState('intro'); // intro | thinking | writing | result
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [content, setContent] = useState({}); // promptId -> text
  const [writeLeft, setWriteLeft] = useState({}); // index -> seconds remaining (banked per task)
  const [visited, setVisited] = useState({}); // index -> true once writing has started
  const [videoEnded, setVideoEnded] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const contentRef = useRef(content);
  contentRef.current = content;
  const metricsRef = useRef({});

  const prompts = data?.prompts || [];
  const current = prompts[index];
  const qSeconds = data?.questionSeconds ?? 360;

  const recordKeystroke = (promptId, e) => {
    const m = metricsRef.current[promptId] || { keystrokes: 0, backspaces: 0, start: 0, last: 0 };
    if (!m.start) m.start = Date.now();
    m.last = Date.now();
    if (e.key === 'Backspace' || e.key === 'Delete') m.backspaces += 1;
    else if (e.key && e.key.length === 1) m.keystrokes += 1;
    metricsRef.current[promptId] = m;
  };

  const endExam = useCallback(() => {
    showToast('Exam ended — you left fullscreen too many times.', 'error');
    navigate('/dashboard');
  }, [navigate, showToast]);
  const { enter, leave, continueExam, warningOpen, warningCount, warningReason, maxWarnings } = useExamMode({
    active: phase === 'thinking' || phase === 'writing',
    allowTyping: true,
    onExceed: endExam,
    onBlockedKey: (m) => showToast(m, 'warning'),
    onViolation: (reason) => {
      if (data?.sessionId) recordViolation(data.sessionId, reason).catch(() => {});
    },
  });

  const submit = useCallback(
    async (auto = false) => {
      if (submittingRef.current || !data) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const payload = {
          sessionId: data.sessionId,
          answers: prompts.map((p) => {
            const m = metricsRef.current[p.id] || {};
            const typingSeconds = m.start && m.last ? (m.last - m.start) / 1000 : 0;
            return {
              promptId: p.id,
              content: contentRef.current[p.id] || '',
              keystrokes: m.keystrokes || 0,
              backspaces: m.backspaces || 0,
              typingSeconds,
            };
          }),
        };
        const res = await submitWriting(payload);
        setResult(res);
        setPhase('result');
        leave();
        if (auto) showToast('Time is up — writing submitted automatically.', 'warning');
      } catch (e) {
        showToast(e?.response?.data?.message || 'Failed to submit', 'error');
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [data, leave, prompts, showToast],
  );

  // Enter the writing screen for task i: pre-fill the skeleton (once) and mark visited.
  const enterWriting = useCallback((i) => {
    const p = prompts[i];
    if (p) {
      setContent((c) => (c[p.id] === undefined || c[p.id] === '' ? { ...c, [p.id]: buildTemplate(p) } : c));
    }
    setVisited((v) => ({ ...v, [i]: true }));
    setWriteLeft((w) => (w[i] === undefined ? { ...w, [i]: qSeconds } : w));
    setIndex(i);
    setPhase('writing');
  }, [prompts, qSeconds]);

  // Move to the next task (its thinking screen if unvisited), or submit after the last.
  const goNext = useCallback(() => {
    const j = index + 1;
    if (j >= prompts.length) { submit(false); return; }
    if (visited[j]) enterWriting(j);
    else { setIndex(j); setPhase('thinking'); }
  }, [index, prompts.length, visited, enterWriting, submit]);

  const goPrevious = useCallback(() => {
    const j = index - 1;
    if (j >= 0) enterWriting(j);
  }, [index, enterWriting]);

  // Ref so the ticking interval always calls the latest "time up" behaviour.
  const onTimeUpRef = useRef(() => {});
  onTimeUpRef.current = () => {
    showToast('Time is up for this task.', 'warning');
    const j = index + 1;
    if (j >= prompts.length) submit(true);
    else if (visited[j]) enterWriting(j);
    else { setIndex(j); setPhase('thinking'); }
  };

  // Banked per-task writing timer: only the active task's time ticks down.
  useEffect(() => {
    if (phase !== 'writing' || !data) return undefined;
    const id = setInterval(() => {
      setWriteLeft((prev) => {
        const cur = prev[index] ?? qSeconds;
        const next = cur - 1;
        if (next <= 0) {
          clearInterval(id);
          setTimeout(() => onTimeUpRef.current(), 0);
          return { ...prev, [index]: 0 };
        }
        if (next === 60) showToast('1 minute left on this task', 'warning');
        return { ...prev, [index]: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, index, data, qSeconds, showToast]);

  // Per-task 2-minute reading/thinking time (fresh for each task).
  const thinkingLeft = useCountdown(data?.thinkingSeconds ?? 0, {
    active: phase === 'thinking',
    resetKey: index,
    onExpire: () => enterWriting(index),
  });

  const wordCount = (text) => {
    const t = (text || '').trim();
    return t ? t.split(/\s+/).length : 0;
  };

  useEffect(() => {
    if (phase !== 'writing' || !data || !current) return undefined;
    const id = setInterval(() => {
      saveDraft({ sessionId: data.sessionId, promptId: current.id, content: contentRef.current[current.id] || '' })
        .then(() => setSavedAt(new Date()))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [phase, data, current]);

  const start = async () => {
    enter();
    try {
      const res = await startWriting();
      setData(res);
      setIndex(0);
      // Always show the intro video before every Writing attempt.
      setVideoEnded(false);
      setPhase('video');
    } catch (e) {
      leave();
      showToast(e?.response?.data?.message || 'Could not start writing', 'error');
      if (e?.response?.status === 409) navigate('/assessment');
    }
  };

  // ---------- Intro ----------
  if (phase === 'intro') {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 5 }}>
          <EditNoteIcon sx={{ fontSize: 56, color: '#7b1fa2' }} />
          <Typography variant="h5" gutterBottom>Writing Assessment</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', mb: 2 }}>
            You get <strong>2 real-world tasks</strong> — a customer email and one other message. For each
            task you first get <strong>2 minutes to read &amp; plan</strong> (no typing), then{' '}
            <strong>6 minutes to write it</strong>. The answer box starts with an <strong>outline to fill
            in</strong>. You can go <strong>back</strong> to a task while it still has time. Your work
            auto-saves. The test runs in fullscreen — leaving it gives a warning (3 allowed).
          </Typography>
          <Button variant="contained" size="large" onClick={start}>Start</Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- Intro video (first attempt only) ----------
  if (phase === 'video') {
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom textAlign="center">
            Watch this before you begin
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
            A quick guide to the Writing test — please watch it fully before you begin.
          </Typography>
          <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
            <LockedVideo
              src="/writing-intro.mp4"
              onEnded={() => setVideoEnded(true)}
              onError={() => setVideoEnded(true)}
            />
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="contained" size="large" disabled={!videoEnded} onClick={() => setPhase('thinking')}>
              {videoEnded ? 'Continue to Writing' : 'Please watch the full video'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // ---------- Per-task reading & thinking time ----------
  if (phase === 'thinking' && current) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        <Paper sx={{ p: 2.5, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 2, background: 'linear-gradient(120deg,#f3eefc,#ffffff)' }}>
          <Box>
            <Typography variant="h6">Task {index + 1} of {prompts.length} — read &amp; plan</Typography>
            <Typography variant="body2" color="text.secondary">
              Read the scenario. Writing (and the 6-minute timer) starts when this ends — or press the button.
            </Typography>
          </Box>
          <CircularTimer secondsLeft={thinkingLeft} totalSeconds={data.thinkingSeconds} label="Think time" />
        </Paper>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Chip size="small" label={current.category} color="primary" variant="outlined" />
              <Chip size="small" variant="outlined" icon={<AccessTimeIcon />} label={`${Math.round(qSeconds / 60)} min to write`} />
              <Typography variant="caption" color="text.secondary">aim for {current.minWords}+ words</Typography>
            </Stack>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{current.prompt}</Typography>
          </CardContent>
        </Card>

        <Button variant="contained" size="large" onClick={() => enterWriting(index)}>
          I’m ready — start writing
        </Button>
        <ExamWarningDialog open={warningOpen} count={warningCount} max={maxWarnings} reason={warningReason} onContinue={continueExam} />
      </Box>
    );
  }

  // ---------- Result ----------
  if (phase === 'result' && result) {
    return (
      <Box sx={{ maxWidth: 820, mx: 'auto' }}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h5" gutterBottom>Writing Complete</Typography>
            <Box sx={{ my: 2 }}><ScoreGauge score={result.score} label="Writing Score" /></Box>
            <Chip
              color={result.score >= 75 ? 'success' : 'error'}
              label={result.score >= 75 ? 'Passed ✓ (pass mark 75)' : 'Below the 75 pass mark'}
              sx={{ mb: 1, fontWeight: 700 }}
            />
          </CardContent>
        </Card>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, px: 0.5 }}>Your feedback</Typography>
        <Card sx={{ mb: 2 }}>
          <CardContent><WritingSection details={result.details} score={result.score} showHeader={false} /></CardContent>
        </Card>
        <Stack direction="row" spacing={1} sx={{ mb: 4 }}>
          <Button variant="contained" onClick={() => navigate('/assessment')}>Back to Assessment</Button>
          <Button variant="text" onClick={() => navigate('/dashboard')}>My Dashboard</Button>
        </Stack>
      </Box>
    );
  }

  if (submitting) return <ScoringScreen />;
  if (!current) return null;

  // ---------- Writing ----------
  const minW = current.minWords || 40;
  const count = wordCount(content[current.id]);
  const met = count >= minW;
  const timeLeft = writeLeft[index] ?? qSeconds;
  const prevHasTime = index > 0 && (writeLeft[index - 1] ?? qSeconds) > 0;

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems="stretch">
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="overline" color="text.secondary">Task {index + 1} of {prompts.length}</Typography>
          <LinearProgress variant="determinate" value={((index + 1) / prompts.length) * 100}
            sx={{ mt: 1, borderRadius: 2, height: 8 }} />
        </Paper>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', position: 'sticky', top: 80, zIndex: 2 }}>
          <CircularTimer secondsLeft={timeLeft} totalSeconds={qSeconds} label="Time left" />
        </Paper>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            <Chip size="small" label={current.category} color="primary" variant="outlined" />
            <Chip size="small" color={met ? 'success' : 'default'}
              label={met ? `${count} words ✓` : `${count} words (aim ${minW}+)`} />
          </Stack>
          <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{current.prompt}</Typography>

          <TextField
            multiline
            minRows={12}
            fullWidth
            placeholder="Write your response here…"
            value={content[current.id] || ''}
            onKeyDown={(e) => recordKeystroke(current.id, e)}
            onChange={(e) => setContent((c) => ({ ...c, [current.id]: e.target.value }))}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Replace each [outline point] with your own writing.
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={1} alignItems="center">
              {prevHasTime && (
                <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={goPrevious}>
                  Previous
                </Button>
              )}
              <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                <SaveIcon fontSize="small" color="disabled" />
                <Typography variant="caption" color="text.secondary">
                  {savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : 'Auto-save every 15s'}
                </Typography>
              </Stack>
            </Stack>
            {index + 1 < prompts.length ? (
              <Button variant="contained" onClick={goNext}>Next Task</Button>
            ) : (
              <Button variant="contained" color="success" onClick={() => submit(false)}>Submit Writing</Button>
            )}
          </Stack>
        </CardContent>
      </Card>
      <ExamWarningDialog open={warningOpen} count={warningCount} max={maxWarnings} reason={warningReason} onContinue={continueExam} />
    </Box>
  );
}
