import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CircularTimer from '../../components/CircularTimer';
import ScoreGauge from '../../components/ScoreGauge';
import LockedVideo from '../../components/LockedVideo';
import ExamWarningDialog from '../../components/ExamWarningDialog';
import ScoringScreen from '../../components/ScoringScreen';
import { useCountdown, formatTime } from '../../hooks/useCountdown';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useExamMode } from '../../hooks/useExamMode';
import { recordViolation, startListening, submitListening } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';

export default function Listening() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { speak, cancel, supported } = useSpeechSynthesis();

  const [phase, setPhase] = useState('intro'); // intro | listening | answering | result
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const questions = data?.questions || [];
  const current = questions[index];

  const endExam = useCallback(() => {
    cancel();
    showToast('Exam ended — you left fullscreen too many times.', 'error');
    navigate('/dashboard');
  }, [cancel, navigate, showToast]);
  const active = phase === 'listening' || phase === 'answering';
  const { enter, leave, continueExam, warningOpen, warningCount, warningReason, maxWarnings } = useExamMode({
    active,
    allowTyping: false, // no keyboard needed for listening
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
      cancel();
      try {
        const payload = {
          sessionId: data.sessionId,
          answers: questions.map((q) => ({ questionId: q.id, selectedOption: answers[q.id] || null })),
        };
        const res = await submitListening(payload);
        setResult(res);
        setPhase('result');
        leave();
        if (auto) showToast('Time is up — listening section submitted automatically.', 'warning');
      } catch (e) {
        showToast(e?.response?.data?.message || 'Failed to submit', 'error');
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [answers, cancel, data, leave, questions, showToast],
  );

  // Overall answering timer — starts only once we reach the answering phase.
  const answeringLeft = useCountdown(data?.answeringSeconds ?? 0, {
    active: phase === 'answering',
    onExpire: () => submit(true),
    onTick: (left) => {
      if (left === 60) showToast('1 minute left', 'warning');
      else if (left === 10) showToast('10 seconds left!', 'error');
    },
  });

  // Countdown shown while the audio plays. It's an estimate of the narration
  // length; it also acts as a safety cap that moves on if playback ever stalls.
  const audioLeft = useCountdown(data?.audioSeconds ?? 0, {
    active: phase === 'listening' && audioPlaying,
    onExpire: () => {
      if (phase === 'listening') {
        cancel();
        setPhase('answering');
      }
    },
  });

  // The candidate starts the audio with a Play button. It plays once; when it
  // finishes, the questions and timer appear. No pause/rewind/replay.
  const playAudio = () => {
    setAudioPlaying(true);
    speak(data.storyScript, { onEnd: () => setPhase('answering') });
  };

  const start = async () => {
    enter(); // inside the click gesture
    try {
      const res = await startListening();
      setData(res);
      setAudioPlaying(false);
      // Always show the intro video before every Listening attempt.
      setVideoEnded(false);
      setPhase('video');
    } catch (e) {
      leave();
      showToast(e?.response?.data?.message || 'Could not start listening', 'error');
      if (e?.response?.status === 409) navigate('/assessment');
    }
  };

  // ---------- Intro ----------
  if (phase === 'intro') {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 5 }}>
          <HeadphonesIcon color="primary" sx={{ fontSize: 56 }} />
          <Typography variant="h5" gutterBottom>
            Listening Assessment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', mb: 2 }}>
            You will hear a short story (about 2 minutes). Press <strong>Play audio</strong> when ready;
            it plays <strong>once</strong> — you cannot pause, rewind or replay it. When the audio
            finishes, 10 questions about the story appear and a 5-minute timer starts. The test runs in
            fullscreen — leaving fullscreen gives a warning (3 allowed) before the exam ends.
          </Typography>
          {!supported && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Your browser does not support audio playback. The story will be shown as text instead.
            </Alert>
          )}
          <Button variant="contained" size="large" onClick={start}>
            Start
          </Button>
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
            A quick guide to the Listening test — please watch it fully before you begin.
          </Typography>
          <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
            <LockedVideo
              src="/listening-intro.mp4"
              onEnded={() => setVideoEnded(true)}
              onError={() => setVideoEnded(true)}
            />
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="contained" size="large" disabled={!videoEnded} onClick={() => setPhase('listening')}>
              {videoEnded ? 'Continue to Listening' : 'Please watch the full video'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // ---------- Listening (audio plays once) ----------
  if (phase === 'listening') {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 5 }}>
          <VolumeUpIcon color="secondary" sx={{ fontSize: 56 }} />
          <Typography variant="h5" gutterBottom>
            {data.storyTitle}
          </Typography>
          {supported ? (
            !audioPlaying ? (
              <>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  When you are ready, play the audio.
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  It plays only once — you cannot pause, rewind or replay it. Questions appear when it
                  finishes.
                </Typography>
                <Chip
                  icon={<VolumeUpIcon />}
                  label={`Approx. audio length: ${formatTime(data.audioSeconds)}`}
                  variant="outlined"
                  sx={{ mb: 3 }}
                />
                <Box>
                  <Button variant="contained" size="large" startIcon={<PlayArrowIcon />} onClick={playAudio}>
                    Play audio
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Now playing — listen carefully.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  No pause or replay. Questions will appear when the audio finishes.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                  <CircularTimer secondsLeft={audioLeft} totalSeconds={data.audioSeconds} label="Audio time" />
                </Box>
                <Chip icon={<VolumeUpIcon />} label="Playing audio…" color="secondary" />
              </>
            )
          ) : (
            <>
              <Alert severity="info" sx={{ textAlign: 'left', my: 2 }}>
                {data.storyScript}
              </Alert>
              <Button variant="contained" onClick={() => setPhase('answering')}>
                I have read the story — start questions
              </Button>
            </>
          )}
        </CardContent>
        <ExamWarningDialog open={warningOpen} count={warningCount} max={maxWarnings} reason={warningReason} onContinue={continueExam} />
      </Card>
    );
  }

  // ---------- Result ----------
  if (phase === 'result' && result) {
    const details = result.details || {};
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Listening Complete
          </Typography>
          <Box sx={{ my: 2 }}>
            <ScoreGauge score={result.score} label="Listening Score" />
          </Box>
          <Chip
            color={result.score >= 75 ? 'success' : 'error'}
            label={result.score >= 75 ? 'Passed ✓ (pass mark 75)' : 'Below the 75 pass mark'}
            sx={{ mb: 2, fontWeight: 700 }}
          />
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
            <Chip color="success" label={`Correct: ${details.correctCount ?? '—'}`} />
            <Chip color="error" label={`Wrong: ${details.wrongCount ?? '—'}`} />
          </Stack>
          <Button variant="contained" onClick={() => navigate('/assessment')} sx={{ mr: 1 }}>
            Continue Assessment
          </Button>
          <Button variant="text" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (submitting) return <ScoringScreen />;

  // ---------- Answering ----------
  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems="stretch">
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Question {index + 1} of {questions.length}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={questions.length ? ((index + 1) / questions.length) * 100 : 0}
            sx={{ mt: 1, borderRadius: 2, height: 8 }}
          />
          <Typography variant="caption" color="text.secondary">
            {Object.keys(answers).length} of {questions.length} answered
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', position: 'sticky', top: 80, zIndex: 2 }}>
          <CircularTimer secondsLeft={answeringLeft} totalSeconds={data.answeringSeconds} label="Time left" />
        </Paper>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {current.questionText}
          </Typography>

          <RadioGroup
            value={answers[current.id] || ''}
            onChange={(e) => setAnswers((a) => ({ ...a, [current.id]: e.target.value }))}
          >
            {['A', 'B', 'C', 'D'].map((opt) => (
              <FormControlLabel
                key={opt}
                value={opt}
                control={<Radio />}
                label={`${opt}. ${current[`option${opt}`]}`}
                sx={{ border: '1px solid #eef2f8', borderRadius: 2, m: 0.5, px: 1 }}
              />
            ))}
          </RadioGroup>

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
            <Button disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
              Previous
            </Button>
            {index + 1 < questions.length ? (
              <Button variant="contained" onClick={() => setIndex((i) => i + 1)}>
                Next
              </Button>
            ) : (
              <Button variant="contained" color="success" onClick={() => submit(false)}>
                Submit Listening
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
      <ExamWarningDialog open={warningOpen} count={warningCount} max={maxWarnings} reason={warningReason} onContinue={continueExam} />
    </Box>
  );
}
