import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ReplayIcon from '@mui/icons-material/Replay';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InsightsIcon from '@mui/icons-material/Insights';
import CircularTimer from '../../components/CircularTimer';
import ScoreGauge from '../../components/ScoreGauge';
import ExamWarningDialog from '../../components/ExamWarningDialog';
import ScoringScreen from '../../components/ScoringScreen';
import { useCountdown } from '../../hooks/useCountdown';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useMicMeter } from '../../hooks/useMicMeter';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useExamMode } from '../../hooks/useExamMode';
import { recordViolation, startSpeaking, submitSpeaking } from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';

const INTRO_STEPS = [
  { icon: HeadphonesIcon, title: 'Wear earphones', desc: 'Put on your earphones for the clearest recording.' },
  { icon: MenuBookIcon, title: 'Read the sentence aloud', desc: 'A business-migration sentence appears — read it clearly and naturally.' },
  { icon: MicIcon, title: 'Press Record', desc: 'The microphone starts only when you press “Record answer”.' },
  { icon: ReplayIcon, title: 'One re-record', desc: 'Disturbed? Press Stop, then Re-record once — the latest take is scored.' },
  { icon: ArrowForwardIcon, title: 'No sentence timer', desc: 'Take the time you need, then press “Next”. 10 sentences in total.' },
  { icon: InsightsIcon, title: 'AI feedback', desc: 'You get pronunciation, fluency and accuracy scores with tips to improve.' },
];

export default function Speaking() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { supported, transcript, error: speechError, start: startMic, stop: stopMic, setTranscript } =
    useSpeechRecognition();
  const tts = useSpeechSynthesis();
  const mic = useMicMeter();
  const recorder = useAudioRecorder();

  const [phase, setPhase] = useState('intro');
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [result, setResult] = useState(null);
  const resultsRef = useRef({}); // sentenceId -> { transcript, audio }
  const recordingIdRef = useRef(null);
  const transcriptRef = useRef('');
  transcriptRef.current = transcript;
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // How many times each sentence has been recorded: 0, 1, or 2 (1 original + 1 re-record).
  const [recordCounts, setRecordCounts] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const MAX_RECORDINGS = 2; // original attempt + one re-record

  // Audio is always captured (for playback + storage). Note: running the recorder
  // alongside Web Speech can slightly affect the recognizer on some machines.

  const sentences = data?.sentences || [];
  const current = sentences[index];
  const recordCount = current ? recordCounts[current.id] || 0 : 0;

  // Start (or re-start) capturing. Allowed up to MAX_RECORDINGS times per sentence.
  const startRecording = () => {
    if (!current || isRecording || (recordCounts[current.id] || 0) >= MAX_RECORDINGS) return;
    recordingIdRef.current = current.id;
    setTranscript(''); // fresh transcript for this take (a re-record replaces the previous one)
    setIsRecording(true);
    if (supported) startMic();
    // Always capture the audio so the candidate can replay each sentence later.
    if (recorder.supported) recorder.start();
  };

  // Stop and persist the current take (a re-record overwrites the previous take).
  const finalizeRecording = useCallback(async () => {
    const id = recordingIdRef.current;
    const audio = recorder.supported ? await recorder.stop() : null;
    stopMic();
    setIsRecording(false);
    if (id != null) {
      resultsRef.current[id] = {
        transcript: transcriptRef.current || '',
        audio: audio || null,
      };
      setRecordCounts((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    }
    recordingIdRef.current = null;
  }, [recorder, stopMic]);

  // Too many fullscreen exits ends the exam.
  const endExam = useCallback(() => {
    stopMic();
    showToast('Exam ended — you left fullscreen too many times.', 'error');
    navigate('/dashboard');
  }, [navigate, showToast, stopMic]);
  const { enter, leave, continueExam, warningOpen, warningCount, warningReason, maxWarnings } = useExamMode({
    active: phase === 'active',
    allowTyping: false, // speaking uses the mic, not the keyboard
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
      await finalizeRecording();
      try {
        const payload = {
          sessionId: data.sessionId,
          results: sentences.map((s) => {
            const r = resultsRef.current[s.id] || {};
            return {
              sentenceId: s.id,
              expected: s.text,
              transcript: r.transcript || '',
              // Always send the audio so it is stored server-side and can be replayed
              // later from the dashboard / manager portal (not just this results screen).
              audioBase64: r.audio || null,
            };
          }),
        };
        const res = await submitSpeaking(payload);
        setResult(res);
        setPhase('result');
        leave(); // programmatic exit — goes to results, not dashboard
        if (auto) showToast('Time is up — speaking section submitted automatically.', 'warning');
      } catch (e) {
        showToast(e?.response?.data?.message || 'Failed to submit', 'error');
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [data, finalizeRecording, leave, sentences, showToast],
  );

  const nextSentence = useCallback(async () => {
    await finalizeRecording();
    setIndex((i) => {
      if (i + 1 >= sentences.length) {
        submit(true);
        return i;
      }
      return i + 1;
    });
  }, [finalizeRecording, sentences.length, submit]);

  // Overall section timer only — there is no per-sentence timer, so a disturbance
  // never auto-advances; the candidate can stop and re-record before moving on.
  const overallLeft = useCountdown(data?.overallSeconds ?? 0, {
    active: phase === 'active',
    onExpire: () => submit(true),
    onTick: (left) => {
      if (left === 300) showToast('5 minutes left', 'info');
      else if (left === 60) showToast('1 minute left', 'warning');
      else if (left === 10) showToast('10 seconds left!', 'error');
    },
  });

  // Surface speech-recognition errors so the candidate knows what's wrong.
  useEffect(() => {
    if (!speechError) return;
    const msg =
      speechError === 'not-allowed'
        ? 'Microphone permission is blocked. Allow it in the browser (🔒 icon → Microphone).'
        : speechError === 'network'
          ? 'Speech recognition needs an internet connection (Chrome/Edge send audio to Google).'
          : speechError === 'audio-capture'
            ? 'No microphone was captured — it may be muted or used by another app.'
            : `Speech recognition error: ${speechError}`;
    showToast(msg, 'error');
  }, [speechError, showToast]);

  // Clear the transcript for each new sentence. The mic is NOT auto-started —
  // the candidate presses "Record" when ready.
  useEffect(() => {
    setTranscript('');
    stopMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Step 1: run the microphone check (this also grants mic permission up front).
  const goMicCheck = () => {
    setPhase('miccheck');
    mic.start();
  };

  // Step 2: once the mic is confirmed, release the meter and begin the test.
  const beginTest = async () => {
    mic.stop();
    enter(); // inside the click gesture
    try {
      const res = await startSpeaking();
      setData(res);
      // Always show the intro video before every Speaking attempt.
      setVideoEnded(false);
      setPhase('video');
    } catch (e) {
      leave();
      showToast(e?.response?.data?.message || 'Could not start speaking', 'error');
      if (e?.response?.status === 409) navigate('/assessment');
    }
  };

  if (phase === 'video') {
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom textAlign="center">
            Watch this before you begin
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
            A quick guide to the Speaking test — please watch it fully before you begin.
          </Typography>
          <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src="/speaking-intro.mp4"
              controls
              autoPlay
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              onEnded={() => setVideoEnded(true)}
              onError={() => setVideoEnded(true)}
              style={{ width: '100%', display: 'block', maxHeight: '70vh' }}
            />
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="contained" size="large" disabled={!videoEnded} onClick={() => setPhase('active')}>
              {videoEnded ? 'Continue to Speaking' : 'Please watch the full video'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'intro') {
    return (
      <Card sx={{ overflow: 'hidden' }}>
        {/* Animated header with a pulsing microphone */}
        <Box
          sx={{
            position: 'relative',
            textAlign: 'center',
            py: 6,
            color: '#fff',
            background: 'linear-gradient(135deg, #3000ae 0%, #6536d6 100%)',
          }}
        >
          <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.6)',
                  animation: 'ring 2.4s ease-out infinite',
                  animationDelay: `${i * 0.8}s`,
                  '@keyframes ring': {
                    '0%': { transform: 'scale(1)', opacity: 0.7 },
                    '100%': { transform: 'scale(2.3)', opacity: 0 },
                  },
                }}
              />
            ))}
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.18)',
                display: 'grid',
                placeItems: 'center',
                animation: 'bob 2s ease-in-out infinite',
                '@keyframes bob': {
                  '0%,100%': { transform: 'translateY(0)' },
                  '50%': { transform: 'translateY(-6px)' },
                },
              }}
            >
              <MicIcon sx={{ fontSize: 48 }} />
            </Box>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 3 }}>
            Speaking Assessment
          </Typography>
          <Typography sx={{ opacity: 0.9, mt: 1, px: 2 }}>
            Read business-migration sentences aloud — clear, confident and natural.
          </Typography>
        </Box>

        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            How it works
          </Typography>
          <Grid container spacing={2}>
            {INTRO_STEPS.map((s, i) => (
              <Grid item xs={12} sm={6} key={s.title}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    gap: 2,
                    alignItems: 'flex-start',
                    opacity: 0,
                    animation: 'fadeUp .5s ease forwards',
                    animationDelay: `${i * 0.12}s`,
                    '@keyframes fadeUp': {
                      from: { opacity: 0, transform: 'translateY(14px)' },
                      to: { opacity: 1, transform: 'none' },
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: '#e3f2fd',
                      color: '#1565c0',
                    }}
                  >
                    <s.icon />
                  </Box>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={i + 1} sx={{ height: 20, fontWeight: 700 }} />
                      <Typography sx={{ fontWeight: 700 }}>{s.title}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {s.desc}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Alert severity="info" icon={<HeadphonesIcon />} sx={{ mt: 3, textAlign: 'left' }}>
            The test runs in <strong>fullscreen</strong> — leaving fullscreen gives a warning (3 allowed)
            before the exam ends. Please put on your earphones before you begin.
          </Alert>
          {!supported && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Your browser does not support speech recognition. Please use Chrome or Edge.
            </Alert>
          )}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button variant="contained" size="large" startIcon={<MicIcon />} onClick={goMicCheck}>
              Set up microphone
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'miccheck') {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 5 }}>
          <MicIcon color="secondary" sx={{ fontSize: 48 }} />
          <Typography variant="h5" gutterBottom>
            Microphone Check
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 3 }}>
            Say a few words out loud — the bar below should move. This confirms your system microphone
            is capturing your voice. Headphones are recommended but not required.
          </Typography>

          {mic.status === 'denied' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Microphone access was blocked. Allow microphone permission in your browser, then retry.
            </Alert>
          )}
          {mic.status === 'error' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Could not access a microphone. Please check that one is connected and not muted.
            </Alert>
          )}

          <Box sx={{ maxWidth: 420, mx: 'auto', mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={mic.level}
              color={mic.status === 'ok' ? 'success' : 'secondary'}
              sx={{ height: 14, borderRadius: 2 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Input level
          </Typography>
          <Chip
            sx={{ mb: 3 }}
            color={mic.status === 'ok' ? 'success' : 'default'}
            label={mic.status === 'ok' ? 'Microphone detected ✓' : 'Waiting for your voice…'}
          />

          <Box>
            {(mic.status === 'denied' || mic.status === 'error') && (
              <Button variant="outlined" onClick={() => mic.start()} sx={{ mr: 1 }}>
                Retry
              </Button>
            )}
            <Button variant="contained" size="large" disabled={mic.status !== 'ok'} onClick={beginTest}>
              Start Speaking Test
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            The button enables once your microphone is detected.
          </Typography>
          <Button variant="text" size="small" color="secondary" sx={{ mt: 1 }} onClick={beginTest}>
            Microphone working but not detected? Start anyway
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'result' && result) {
    const items = result.details?.items || [];
    const scoreColor = (v) => (v >= 80 ? 'success' : v >= 60 ? 'warning' : 'error');
    const DIMENSIONS = [
      ['Pronunciation', 'pronunciation'],
      ['Fluency', 'fluency'],
      ['Accuracy', 'accuracy'],
      ['Grammar', 'grammar'],
      ['Vocabulary', 'vocabulary'],
      ['Confidence', 'confidence'],
    ];
    // Average each dimension across all sentences to find where to focus.
    const dimAvg = (key) =>
      items.length ? items.reduce((s, it) => s + (it.evaluation?.[key] ?? 0), 0) / items.length : 0;
    const weakest = DIMENSIONS.map(([label, key]) => ({ label, val: dimAvg(key) }))
      .sort((a, b) => a.val - b.val)
      .slice(0, 2)
      .filter((w) => w.val < 85);
    const missedCount = items.filter((it) => !(it.transcript || '').trim()).length;

    return (
      <Box sx={{ maxWidth: 780, mx: 'auto' }}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h5" gutterBottom>
              Speaking Complete
            </Typography>
            <Box sx={{ my: 2 }}>
              <ScoreGauge score={result.score} label="Speaking Score" />
            </Box>

            {/* Where to focus */}
            {(weakest.length > 0 || missedCount > 0) && (
              <Box sx={{ textAlign: 'left', mt: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Where to improve
                </Typography>
                {weakest.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                      Focus most on:
                    </Typography>
                    {weakest.map((w) => (
                      <Chip key={w.label} size="small" color={scoreColor(w.val)}
                        label={`${w.label} (${Math.round(w.val)})`} />
                    ))}
                  </Stack>
                )}
                {missedCount > 0 && (
                  <Typography variant="body2" color="error.main">
                    {missedCount} sentence{missedCount > 1 ? 's' : ''} had no speech detected — make sure
                    you press <strong>Record</strong> and speak clearly for each one.
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Per-sentence: what you said vs the target + how to improve */}
        {items.length > 0 && (
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, px: 0.5 }}>
            Sentence-by-sentence feedback
          </Typography>
        )}
        {items.map((it, i) => {
          const ev = it.evaluation || {};
          const said = (it.transcript || '').trim();
          return (
            <Card key={i} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sentence {i + 1}
                  </Typography>
                  <Chip size="small" color={scoreColor(ev.overall ?? 0)}
                    label={`${Math.round(ev.overall ?? 0)} / 100`} />
                </Stack>

                <Typography variant="caption" color="text.secondary">
                  Target — what you should say
                </Typography>
                <Typography sx={{ mb: 0.5, fontWeight: 500 }}>“{it.expected}”</Typography>
                {tts.supported && (
                  <Button size="small" startIcon={<VolumeUpIcon />} onClick={() => tts.speak(it.expected)} sx={{ mb: 1.5 }}>
                    Hear how to say it
                  </Button>
                )}

                <Typography variant="caption" color="text.secondary" display="block">
                  You said
                </Typography>
                <Typography
                  sx={{
                    mb: 2,
                    color: said ? 'primary.main' : 'error.main',
                    fontStyle: said ? 'normal' : 'italic',
                  }}
                >
                  {said ? `“${said}”` : 'No speech was detected for this sentence.'}
                </Typography>

                {(() => {
                  const sid = sentences[i]?.id;
                  const audioSrc = sid != null ? resultsRef.current[sid]?.audio : null;
                  return audioSrc ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Your recording — listen to what you said
                      </Typography>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio controls src={audioSrc} style={{ width: '100%', height: 40 }} />
                    </Box>
                  ) : null;
                })()}

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: ev.suggestions?.length ? 2 : 0 }}>
                  {DIMENSIONS.map(([label, key]) => (
                    <Chip key={key} size="small" variant="outlined" color={scoreColor(ev[key] ?? 0)}
                      label={`${label} ${Math.round(ev[key] ?? 0)}`} />
                  ))}
                </Stack>

                {Array.isArray(ev.suggestions) && ev.suggestions.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      How to improve
                    </Typography>
                    <Box component="ul" sx={{ m: '4px 0 0', pl: 2.5 }}>
                      {ev.suggestions.map((s, j) => (
                        <Typography key={j} component="li" variant="body2" sx={{ mb: 0.25 }}>
                          {s}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}

        <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 4 }}>
          <Button variant="contained" onClick={() => navigate('/assessment')}>
            Continue Assessment
          </Button>
          <Button variant="text" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </Stack>
      </Box>
    );
  }

  if (submitting) return <ScoringScreen />;

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Sentence {index + 1} of {sentences.length}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={((index + 1) / sentences.length) * 100}
            sx={{ mt: 1, borderRadius: 2, height: 8 }}
          />
        </Paper>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', position: 'sticky', top: 80, zIndex: 2 }}>
          <CircularTimer secondsLeft={overallLeft} totalSeconds={data.overallSeconds} label="Overall time" />
        </Paper>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Read this sentence aloud:
          </Typography>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            “{current.text}”
          </Typography>

          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            {isRecording ? (
              <Button variant="outlined" color="error" startIcon={<StopIcon />} onClick={finalizeRecording}>
                Stop recording
              </Button>
            ) : recordCount === 0 ? (
              <Button variant="contained" color="error" startIcon={<MicIcon />} onClick={startRecording}>
                Record answer
              </Button>
            ) : recordCount === 1 ? (
              <Button variant="outlined" color="warning" startIcon={<ReplayIcon />} onClick={startRecording}>
                Re-record answer (1 chance left)
              </Button>
            ) : (
              <Button variant="outlined" color="success" startIcon={<CheckCircleIcon />} disabled>
                Recorded
              </Button>
            )}
            <Chip
              icon={recordCount >= 1 ? <CheckCircleIcon /> : <RecordVoiceOverIcon />}
              color={isRecording ? 'error' : recordCount >= 1 ? 'success' : 'default'}
              label={
                isRecording
                  ? 'Listening…'
                  : recordCount >= 2
                    ? 'Answer recorded (re-record used)'
                    : recordCount === 1
                      ? 'Answer recorded — you may re-record once'
                      : 'Not recording'
              }
            />
          </Stack>

          <Paper variant="outlined" sx={{ p: 2, minHeight: 72, bgcolor: '#f8fafd' }}>
            <Typography variant="caption" color="text.secondary">
              Recognized transcript
            </Typography>
            <Typography>{transcript || (isRecording ? 'Listening… start speaking' : '—')}</Typography>
            {speechError && (
              <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                Recognition error: {speechError}
              </Typography>
            )}
          </Paper>

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            {index + 1 < sentences.length ? (
              <Button variant="contained" onClick={nextSentence}>
                Next Sentence
              </Button>
            ) : (
              <Button variant="contained" color="success" onClick={() => submit(false)}>
                Submit Speaking
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
      <ExamWarningDialog open={warningOpen} count={warningCount} max={maxWarnings} reason={warningReason} onContinue={continueExam} />
    </Box>
  );
}
