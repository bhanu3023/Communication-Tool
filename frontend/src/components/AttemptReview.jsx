import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import MicIcon from '@mui/icons-material/Mic';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { getSpeakingRecording } from '../services/assessmentService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { scoreColor } from '../utils/format';

/** Lazily loads and plays one sentence's stored recording (fetched with auth). */
function RecordingPlayer({ sessionId, index }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const blob = await getSpeakingRecording(sessionId, index);
      setUrl(URL.createObjectURL(blob));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (url) {
    // Some browsers show 0:00 / 0:00 for blob-sourced audio until the duration is
    // known. Force it to resolve: on metadata load, if the duration is missing/infinite,
    // seek to the end and back so the element reports the real length.
    const fixDuration = (e) => {
      const a = e.currentTarget;
      if (!Number.isFinite(a.duration) || a.duration === 0) {
        const onUpdate = () => {
          a.currentTime = 0;
          a.removeEventListener('timeupdate', onUpdate);
        };
        a.addEventListener('timeupdate', onUpdate);
        a.currentTime = 1e101; // jump past the end to trigger duration calculation
      }
    };
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio
        controls
        preload="auto"
        src={url}
        onLoadedMetadata={fixDuration}
        style={{ width: '100%', height: 40, marginTop: 8 }}
      />
    );
  }
  return (
    <Button
      size="small"
      variant="outlined"
      onClick={load}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={14} /> : <PlayArrowIcon />}
      sx={{ mt: 1 }}
    >
      {error ? 'Recording unavailable' : loading ? 'Loading…' : 'Play my recording'}
    </Button>
  );
}

function MetricChips({ obj, keys }) {
  if (!obj) return null;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {keys.map((k) =>
        obj[k] != null ? (
          <Chip key={k} size="small" variant="outlined" color={scoreColor(obj[k])}
            label={`${k}: ${Math.round(obj[k])}`} />
        ) : null,
      )}
    </Stack>
  );
}

function SectionHeader({ icon, title, score, color }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {score != null && <Chip size="small" color={scoreColor(score)} label={`${score}/100`} />}
    </Stack>
  );
}

/** Listening feedback: score, correct/wrong, and the answer sheet. */
export function ListeningSection({ details, score, showHeader = true }) {
  const listening = details || {};
  const hasData = listening.answers || listening.correctCount != null;
  return (
    <Box>
      {showHeader && (
        <SectionHeader icon={<HeadphonesIcon />} title="Listening" score={score} color="#1565c0" />
      )}
      {hasData ? (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Chip size="small" color="success" label={`Correct: ${listening.correctCount ?? '—'}`} />
            <Chip size="small" color="error" label={`Wrong: ${listening.wrongCount ?? '—'}`} />
          </Stack>
          {Array.isArray(listening.answers) && (
            <Table size="small" sx={{ mb: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Question</TableCell>
                  <TableCell align="center">You</TableCell>
                  <TableCell align="center">Correct</TableCell>
                  <TableCell align="center">Result</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listening.answers.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.questionText}</TableCell>
                    <TableCell align="center">{a.selectedOption || '—'}</TableCell>
                    <TableCell align="center">{a.correctOption}</TableCell>
                    <TableCell align="center">
                      <Chip size="small" color={a.correct ? 'success' : 'error'} label={a.correct ? '✓' : '✗'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">No listening data.</Typography>
      )}
    </Box>
  );
}

/** Speaking feedback: per-sentence target vs said, sub-scores, tips, and recording. */
export function SpeakingSection({ details, score, showHeader = true, sessionId }) {
  const speaking = details || {};
  const tts = useSpeechSynthesis();
  return (
    <Box>
      {showHeader && (
        <SectionHeader icon={<MicIcon />} title="Speaking" score={score} color="#00acc1" />
      )}
      {Array.isArray(speaking.items) && speaking.items.length ? (
        speaking.items.map((it, i) => {
          const ev = it.evaluation || {};
          const said = (it.transcript || '').trim();
          return (
            <Paper variant="outlined" key={i} sx={{ p: 2, mb: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">Sentence {i + 1}</Typography>
                {ev.overall != null && (
                  <Chip size="small" color={scoreColor(ev.overall)} label={`${Math.round(ev.overall)} / 100`} />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">Target</Typography>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>“{it.expected}”</Typography>
              {tts.supported && (
                <Button size="small" startIcon={<VolumeUpIcon />} onClick={() => tts.speak(it.expected)} sx={{ mb: 1.5 }}>
                  Hear how to say it
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" display="block">You said</Typography>
              <Typography variant="body2"
                sx={{ mb: 1.5, color: said ? 'primary.main' : 'error.main', fontStyle: said ? 'normal' : 'italic' }}>
                {said ? `“${said}”` : 'No speech detected.'}
              </Typography>
              {sessionId && it.hasAudio && <RecordingPlayer sessionId={sessionId} index={i} />}
              <Box sx={{ mt: sessionId && it.hasAudio ? 1.5 : 0 }}>
                <MetricChips obj={ev}
                  keys={['pronunciation', 'accuracy', 'fluency', 'grammar', 'vocabulary', 'confidence']} />
              </Box>
              {Array.isArray(ev.suggestions) && ev.suggestions.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">How to improve</Typography>
                  <Box component="ul" sx={{ m: '4px 0 0', pl: 2.5 }}>
                    {ev.suggestions.map((s, j) => (
                      <Typography key={j} component="li" variant="body2">{s}</Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          );
        })
      ) : (
        <Typography variant="body2" color="text.secondary">No speaking data.</Typography>
      )}
    </Box>
  );
}

/** Writing feedback: per-prompt evaluation metrics and suggestions. */
export function WritingSection({ details, score, showHeader = true }) {
  const writing = details || {};
  return (
    <Box>
      {showHeader && (
        <SectionHeader icon={<EditNoteIcon />} title="Writing" score={score} color="#7b1fa2" />
      )}
      {Array.isArray(writing.items) && writing.items.length ? (
        writing.items.map((it, i) => {
          const ev = it.evaluation || {};
          return (
            <Paper variant="outlined" key={i} sx={{ p: 2, mb: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                {it.category && <Chip size="small" label={it.category} />}
                {ev.overall != null && (
                  <Chip size="small" color={scoreColor(ev.overall)} label={`${Math.round(ev.overall)} / 100`} />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">Task</Typography>
              <Typography variant="body2" sx={{ mb: 1.5, whiteSpace: 'pre-line' }}>{it.prompt}</Typography>

              <Typography variant="caption" color="text.secondary">What you wrote</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: '#f8fafd' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {(it.content || '').trim() || '— (nothing written)'}
                </Typography>
              </Paper>

              <MetricChips obj={ev}
                keys={['grammar', 'clarity', 'vocabulary', 'tone', 'professionalism', 'structure',
                  'readability', 'completeness', 'spelling', 'conciseness']} />

              {Array.isArray(ev.mistakes) && ev.mistakes.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="error.main">Mistakes</Typography>
                  <Box component="ul" sx={{ m: '4px 0 0', pl: 2.5 }}>
                    {ev.mistakes.map((m, j) => (
                      <Typography key={j} component="li" variant="body2">{m}</Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {Array.isArray(ev.suggestions) && ev.suggestions.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Where to improve</Typography>
                  <Box component="ul" sx={{ m: '4px 0 0', pl: 2.5 }}>
                    {ev.suggestions.map((sug, j) => (
                      <Typography key={j} component="li" variant="body2">{sug}</Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {ev.improvedVersion && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
                    How to write it (model answer)
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: '#f3fbf5', borderColor: '#c8e6c9' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{ev.improvedVersion}</Typography>
                  </Paper>
                </Box>
              )}
            </Paper>
          );
        })
      ) : (
        <Typography variant="body2" color="text.secondary">No writing data.</Typography>
      )}
    </Box>
  );
}

/**
 * Feedback for a single section attempt. Each attempt belongs to one section, so
 * this renders just that section's detail. Shared by dashboard + manager portal.
 */
export default function AttemptReview({ attempt }) {
  const { section, details, score, sessionId } = attempt;
  if (section === 'LISTENING') return <ListeningSection details={details} score={score} showHeader={false} />;
  if (section === 'SPEAKING') {
    return <SpeakingSection details={details} score={score} sessionId={sessionId} showHeader={false} />;
  }
  if (section === 'WRITING') return <WritingSection details={details} score={score} showHeader={false} />;
  return null;
}
