import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import CircularTimer from '../../components/CircularTimer';
import ScoreGauge from '../../components/ScoreGauge';
import LockedVideo from '../../components/LockedVideo';
import ExamWarningDialog from '../../components/ExamWarningDialog';
import ScoringScreen from '../../components/ScoringScreen';
import { useCountdown } from '../../hooks/useCountdown';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useMicMeter } from '../../hooks/useMicMeter';
import { micProblemMessage, useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useExamMode } from '../../hooks/useExamMode';
import {
  recordViolation,
  startSpeaking,
  submitSpeaking,
  uploadSpeakingTake,
} from '../../services/assessmentService';
import { useToast } from '../../contexts/ToastContext';
import { levelRules } from '../../utils/levels';

// There is ONE text in this section, and it is the one being scored: after each take the
// recording is uploaded and transcribed on the server, and those words are shown straight back.
//
// It replaced two worse designs. The browser's live speech recognition showed a running text
// that was NOT what got graded — Chrome-only, missing the opening words — so a candidate could
// argue with a text that never counted. Playback replaced it, but a recording cannot tell you
// whether a word was misheard, and the player read 0:00 because a webm clip carries no duration
// metadata, which read as a broken test. Showing the graded words solves both: if a word came
// out wrong, they can see it and re-record while it still costs them nothing.

const INTRO_STEPS = [
  { icon: HeadphonesIcon, title: 'Wear earphones', desc: 'Put on your earphones for the clearest recording.' },
  { icon: MenuBookIcon, title: 'Read the sentence aloud', desc: 'A business-migration sentence appears — read it clearly and naturally.' },
  { icon: MicIcon, title: 'Press Record', desc: 'The microphone starts only when you press “Record answer”.' },
  { icon: HourglassTopIcon, title: 'Wait one second', desc: 'The mic takes a moment to start. Wait until it says “Listening…”, then begin — speaking too early cuts off your first word.' },
  { icon: ReplayIcon, title: 'Check what was heard', desc: 'Press Stop and your recording is checked straight away — the words it was heard to say appear on screen. Not right? Re-record once; the latest take is scored.' },
  { icon: ArrowForwardIcon, title: 'No sentence timer', desc: 'Take the time you need, then press “Next”. 10 sentences in total.' },
  { icon: InsightsIcon, title: 'AI feedback', desc: 'You get pronunciation, fluency and accuracy scores with tips to improve.' },
];

export default function Speaking() {
  const navigate = useNavigate();
  // Which level's test this is. Comes from the URL (?level=2) so the page itself
  // stays level-agnostic — the content, attempt count and pass mark all come back
  // from /start for that level.
  const [searchParams] = useSearchParams();
  const level = Number(searchParams.get('level')) === 2 ? 2 : 1;
  // The pass mark differs per level (75 / 80). This screen hardcoded 75, so a Level 2
  // candidate on 77 was congratulated and then found the section still failed.
  const passMark = levelRules(level).passMark;
  // Every exit from a Level 2 test returns to the Level 2 portal, never to Level 1.
  const homePath = level === 2 ? '/level-2' : '/dashboard';
  const hubPath = level === 2 ? '/level-2' : '/assessment';
  const { showToast } = useToast();
  // The browser's live speech recognition is GONE. It produced a second, different text from
  // the one being graded -- Chrome-only, missing the opening words, and trivially forged -- and
  // showing a candidate one text while scoring another could not be defended. Every take is now
  // transcribed server-side from the recording itself, and that single text is both what they
  // are shown and what is scored.
  const tts = useSpeechSynthesis();
  const mic = useMicMeter();
  const recorder = useAudioRecorder();

  const [phase, setPhase] = useState('intro');
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [result, setResult] = useState(null);
  const resultsRef = useRef({}); // sentenceId -> { heard }
  const recordingIdRef = useRef(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // How many times each sentence has been recorded: 0, 1, or 2 (1 original + 1 re-record).
  const [recordCounts, setRecordCounts] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  // Whether a take has been recorded for the current sentence. This used to hold the take's
  // base64 so an <audio> element could play it back, which meant several megabytes of string
  // sitting in React state per sentence for a player that has now been removed.
  const [hasTake, setHasTake] = useState(false);
  // How long the take ran, when the browser could measure it. This is why the playback control
  // was removed rather than fixed: a webm recording from MediaRecorder carries no duration
  // metadata, so the player read 0:00 for a good clip. The length is measured from the decoded
  // audio instead, and shown as text.
  const [takeDuration, setTakeDuration] = useState(null);
  // What the transcriber heard in the recording just uploaded. Null before any take,
  // { pending } while it is being transcribed, then { text, assessed } or { failed }.
  const [heard, setHeard] = useState(null);
  // Mic and recognizer are coming up but are not capturing yet — the candidate must not speak.
  const [preparing, setPreparing] = useState(false);
  const MAX_RECORDINGS = 2; // original attempt + one re-record

  // Audio is always captured (for playback + storage). Note: running the recorder
  // alongside Web Speech can slightly affect the recognizer on some machines.

  const sentences = data?.sentences || [];
  const current = sentences[index];
  const recordCount = current ? recordCounts[current.id] || 0 : 0;

  // Start (or re-start) capturing. Allowed up to MAX_RECORDINGS times per sentence.
  //
  // Both capture paths are awaited before the UI says we are recording. Neither is instant --
  // the recorder awaits getUserMedia and the recognizer needs the engine to come up -- and
  // announcing "Recording" first is what made the opening words of a sentence go missing. It
  // hurt the first sentence worst, where the permission prompt and a cold engine land together.
  const startRecording = async () => {
    if (!current || isRecording || preparing || (recordCounts[current.id] || 0) >= MAX_RECORDINGS) {
      return;
    }
    recordingIdRef.current = current.id;
    setHasTake(false); // a re-record replaces the previous take
    setPreparing(true);
    try {
      // Capture must be PROVEN before the UI says a word about recording. This used to start the
      // recorder, ignore whether it worked, and set isRecording in a finally -- so a candidate
      // whose microphone was blocked (or who was on an http:// origin, where the browser removes
      // the API outright) watched a running recorder, delivered a full answer, and lost it. If
      // capture cannot start we say exactly why and stay put: no attempt is consumed, because
      // recordCounts only advances when a take is finalised, so they can fix it and press Record
      // again.
      if (!recorder.supported) {
        showToast(micProblemMessage(recorder.reason), 'error');
        return;
      }
      // The recorder goes FIRST and is fully settled before the recognizer is allowed near the
      // microphone. Both open their own capture stream, and starting them together meant the
      // device was being reconfigured underneath the recorder at the exact moment it began
      // capturing -- which is where the damaged opening words come from. The recording is what
      // gets scored, so it gets the clean start; the recognizer is only an outage fallback and
      // can afford to miss the first word.
      const started = await recorder.start();
      if (!started) {
        showToast(micProblemMessage(recorder.error), 'error');
        return;
      }
      setIsRecording(true);
    } finally {
      setPreparing(false);
    }
  };

  // Stop the take, upload it, and show what the recording was actually heard to say.
  //
  // The upload happens HERE rather than at submit for two reasons. The candidate gets to see the
  // transcriber's words while they can still re-record, instead of discovering after the section
  // is scored that a sentence came out as silence. And the submit request no longer carries ten
  // recordings at once, which was several megabytes in a single POST -- the slowest and most
  // fragile request in the app.
  const finalizeRecording = useCallback(async () => {
    const id = recordingIdRef.current;
    setIsRecording(false);
    const take = recorder.supported ? await recorder.stop() : null;
    recordingIdRef.current = null;

    if (!take) {
      // Nothing usable was captured. Do NOT count it against the two chances: the candidate read
      // the sentence aloud and the browser lost it, and burning a re-record for that meant two
      // failed takes cost them the sentence outright, scored zero, with no way back.
      setHasTake(false);
      setHeard(null);
      showToast(micProblemMessage(recorder.error || recorder.reason), 'error');
      return;
    }

    // Play it back from the bytes we hold, not from the server: it is instant, and it is the
    // same audio that was just uploaded.
    setHasTake(true);
    setTakeDuration(take.duration);
    if (id != null) {
      setRecordCounts((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    }

    setHeard({ pending: true });
    try {
      const res = await uploadSpeakingTake({
        sessionId: data.sessionId,
        sentenceIndex: index,
        audioBase64: take.base64,
        mimeType: take.mime,
      });
      // `assessed` false means transcription could not run on our side. That is not the
      // candidate's fault and must not read as "you said nothing" -- their audio is stored and
      // will be transcribed when the section is scored.
      setHeard({ text: res.text || '', assessed: res.assessed, stored: res.stored });
      if (id != null) {
        resultsRef.current[id] = { heard: res.text || '' };
      }
    } catch {
      // The take is still in the browser and the section can still be submitted; the server
      // transcribes whatever it holds at scoring time.
      setHeard({ failed: true });
    }
  }, [recorder, data, index, showToast]);

  // Too many fullscreen exits ends the exam.
  const endExam = useCallback(() => {
    showToast('Exam ended — you left fullscreen too many times.', 'error');
    navigate(homePath);
  }, [navigate, showToast]);
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
          // Only the sentence ids travel now. Every take was uploaded and transcribed the
          // moment it was recorded, so the server already holds the audio and the text it was
          // heard to say -- and neither can be supplied by the client any more, which is what
          // used to make a forged transcript plus junk audio a route to full marks.
          results: sentences.map((s) => ({ sentenceId: s.id })),
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

  // Each sentence starts with a clean slate. The mic is NOT auto-started — the candidate
  // presses "Record" when they are ready.
  useEffect(() => {
    setHasTake(false);
    setHeard(null);
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
      const res = await startSpeaking(level);
      setData(res);
      // Always show the intro video before every Speaking attempt.
      setVideoEnded(false);
      setPhase('video');
    } catch (e) {
      leave();
      showToast(e?.response?.data?.message || 'Could not start speaking', 'error');
      if (e?.response?.status === 409) navigate(hubPath);
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
            <LockedVideo
              src="/speaking-intro.mp4"
              onEnded={() => setVideoEnded(true)}
              onError={() => setVideoEnded(true)}
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
          {recorder.reason && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {micProblemMessage(recorder.reason)}
            </Alert>
          )}

          {/* Explicit way back before the mic check and proctoring begin. */}
          <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 3 }}>
            <Button variant="outlined" size="large" startIcon={<ArrowBackIcon />} onClick={() => navigate(hubPath)}>
              Back
            </Button>
            <Button variant="contained" size="large" startIcon={<MicIcon />} onClick={goMicCheck}>
              Set up microphone
            </Button>
          </Stack>
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

          {/* A hard block -- an insecure origin or a browser with no MediaRecorder -- is not a
              microphone fault and no amount of retrying or granting permission fixes it, so it is
              reported first, in its own words, and it removes both ways into the test below. */}
          {recorder.reason && (
            <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
              {micProblemMessage(recorder.reason)}
            </Alert>
          )}
          {!recorder.reason && mic.status === 'denied' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Microphone access was blocked. Allow microphone permission in your browser, then retry.
            </Alert>
          )}
          {!recorder.reason && mic.status === 'error' && (
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
            {!recorder.reason && (mic.status === 'denied' || mic.status === 'error') && (
              <Button variant="outlined" onClick={() => mic.start()} sx={{ mr: 1 }}>
                Retry
              </Button>
            )}
            <Button
              variant="contained"
              size="large"
              disabled={mic.status !== 'ok' || !!recorder.reason}
              onClick={beginTest}
            >
              Start Speaking Test
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            The button enables once your microphone is detected.
          </Typography>
          {/* Offered only when capture is genuinely possible and the meter merely failed to see a
              voice -- a quiet mic still records. When the browser cannot capture at all this
              button guaranteed a zero, so it is not shown. */}
          {!recorder.reason && (
            <Button variant="text" size="small" color="secondary" sx={{ mt: 1 }} onClick={beginTest}>
              Microphone working but not detected? Start anyway
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (phase === 'result' && result) {
    const items = result.details?.items || [];
    // Green/red against THIS level's bar, not a fixed 75 — at Level 2 a 77 is not a pass.
    const scoreColor = (v) => (v >= passMark ? 'success' : 'error');
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
              <ScoreGauge score={result.score} label="Speaking Score" passMark={passMark} />
            </Box>
            <Chip
              color={result.score >= passMark ? 'success' : 'error'}
              label={result.score >= passMark
                  ? `Passed ✓ (pass mark ${passMark})`
                  : `Below the ${passMark} pass mark`}
              sx={{ mb: 1, fontWeight: 700 }}
            />

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

                {/* Feedback shows the text, not the audio — the player belongs to the test, where
                    they can still fix a bad take. What they get here is the transcript of the
                    recording, which is the same text that was scored. */}
                <Typography variant="caption" color="text.secondary" display="block">
                  What your recording was heard to say
                </Typography>
                <Typography
                  sx={{
                    mb: 2,
                    color: said ? 'primary.main' : 'error.main',
                    fontStyle: said ? 'normal' : 'italic',
                  }}
                >
                  {said
                    ? `“${said}”`
                    : it.transcriptionFailed
                      ? 'Your recording could not be processed this time, so there is no text to show. Your score is unaffected.'
                      : 'No speech was detected in your recording for this sentence.'}
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap
                  sx={{ mb: ev.suggestions?.length || ev.mistakes?.length ? 2 : 0 }}>
                  {DIMENSIONS.map(([label, key]) => (
                    <Chip key={key} size="small" variant="outlined" color={scoreColor(ev[key] ?? 0)}
                      label={`${label} ${Math.round(ev[key] ?? 0)}`} />
                  ))}
                </Stack>

                {/* Itemised corrections, small ones included. Shown before the coaching so the
                    candidate sees WHAT was wrong before reading what to do about it. */}
                {Array.isArray(ev.mistakes) && ev.mistakes.length > 0 && (
                  <Box sx={{ mb: ev.suggestions?.length ? 2 : 0 }}>
                    <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                      Mistakes ({ev.mistakes.length})
                    </Typography>
                    <Box component="ul" sx={{ m: '4px 0 0', pl: 2.5 }}>
                      {ev.mistakes.map((m, j) => (
                        <Typography key={j} component="li" variant="body2" sx={{ mb: 0.25 }}>
                          {m}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                {Array.isArray(ev.suggestions) && ev.suggestions.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Feedback & practice
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
          <Button variant="contained" onClick={() => navigate(hubPath)}>
            Continue Assessment
          </Button>
          <Button variant="text" onClick={() => navigate(homePath)}>
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
            {preparing ? (
              // Deliberately not "Recording": the mic is not capturing yet, and telling the
              // candidate otherwise is what lost the opening words of a sentence.
              <Button variant="contained" color="error" startIcon={<CircularProgress size={16} color="inherit" />} disabled>
                Getting the mic ready…
              </Button>
            ) : isRecording ? (
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
              color={preparing ? 'warning' : isRecording ? 'error' : recordCount >= 1 ? 'success' : 'default'}
              label={
                preparing
                  ? 'Wait — not capturing yet'
                  : isRecording
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
              Your recording
            </Typography>
            {hasTake ? (
              <Box>
                {/* No playback control here. It showed 0:00 for a perfectly good take -- a webm
                    recording from MediaRecorder carries no duration metadata, so the browser's
                    clock has nothing to read -- and once the transcribed words are shown below,
                    hearing the clip back adds nothing but a broken-looking timer. The audio is
                    still stored and can be replayed from the manager portal. */}
                {takeDuration != null && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {takeDuration.toFixed(1)} seconds recorded
                  </Typography>
                )}

                {/* What the transcriber heard. This is the ONLY text in the test now, and it is
                    the text the score is based on -- so a candidate can see a misheard word and
                    re-record while it still costs them nothing. */}
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e3e8ef' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    What your recording was heard to say
                  </Typography>
                  {heard?.pending ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <CircularProgress size={14} />
                      <Typography variant="body2" color="text.secondary">
                        Checking your recording…
                      </Typography>
                    </Stack>
                  ) : heard?.failed || heard?.assessed === false ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      We could not check your recording just now. It has been saved and will still
                      be scored — you do not need to record again.
                    </Typography>
                  ) : heard && heard.text ? (
                    <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                      “{heard.text}”
                    </Typography>
                  ) : heard ? (
                    <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                      No words were heard in this recording. Please record it again — speak
                      clearly and check your microphone is not muted.
                    </Typography>
                  ) : null}
                </Box>

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  This recording is what gets evaluated.
                  {recordCount < MAX_RECORDINGS
                    ? ' If it is not right, you can re-record once.'
                    : ' You have used your re-record for this sentence.'}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ mt: 0.5 }}>
                {preparing
                  ? 'Getting the mic ready — please wait before speaking…'
                  : isRecording
                    ? 'Recording… read the sentence aloud, then press “Stop recording”.'
                    : recordCount > 0 || recorder.error
                      ? micProblemMessage(recorder.error)
                      : 'Press “Record answer”, read the sentence aloud, then play it back here.'}
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
