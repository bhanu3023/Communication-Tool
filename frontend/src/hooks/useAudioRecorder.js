import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// --- WAV helpers: downsample to 16 kHz mono and encode 16-bit PCM ---
function downsample(buffer, inRate, outRate) {
  if (outRate >= inRate) return buffer;
  const ratio = inRate / outRate;
  const newLen = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLen);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < newLen) {
    const nextOffset = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffset && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = count ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffset;
  }
  return result;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o, s) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([view], { type: 'audio/wav' });
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/**
 * Capture constraints, chosen from measurement rather than the browser defaults.
 *
 * <p>`audio: true` lets Chrome apply its telephony processing chain, and it was hurting us. Every
 * stored recording peaks at exactly -0.0 dBFS, i.e. automatic gain control had driven the signal
 * into clipping, and clipping distorts precisely the stressed syllables a transcriber leans on.
 *
 * <p>None of that processing is needed here. Transcription accuracy was measured on deliberately
 * degraded audio: at 10 dB signal-to-noise it was 0% word error, at 5 dB 2.2%, and a recording
 * quietened by 20 dB still came back word perfect. The transcriber is robust to noise and
 * indifferent to level, so noise suppression and gain control can only take away detail. Echo
 * cancellation has nothing to cancel: nothing is playing while the candidate speaks.
 */
const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  },
};

/** How long to keep quiet after audio starts flowing, before inviting the candidate to speak. */
const SETTLE_MS = 400;

const settle = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Resolves once the recorder has emitted its first audio chunk, or after a second, whichever
 * comes first. The timeout matters: if a browser never fires the event we must still let the
 * candidate record rather than stranding them on "Getting the mic ready".
 */
function firstAudioOrTimeout(recorder) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      recorder.removeEventListener('dataavailable', finish);
      resolve();
    };
    recorder.addEventListener('dataavailable', finish);
    setTimeout(finish, 1000);
  });
}

/**
 * Why microphone capture is impossible in this browser, or null when it is available.
 *
 * 'insecure-origin' is the one that bites in production and gets reported as "the browser is not
 * allowing it". getUserMedia is gated on a secure context, so on a plain http:// page
 * navigator.mediaDevices is simply UNDEFINED -- Chrome, Edge and Firefox remove the API outright
 * rather than prompting, and there is no permission the candidate can grant to get it back. Only
 * localhost is exempt, which is exactly why this never reproduces in local testing. The app is
 * served over https, so this shows up when someone reaches it through an http:// link, a raw IP
 * address, or an internal hostname with no TLS. It must be named precisely: reported as a broken
 * microphone it sends the candidate hunting through browser settings that cannot fix it.
 */
function detectUnavailable() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported-browser';
  if (window.isSecureContext === false) return 'insecure-origin';
  if (!navigator.mediaDevices?.getUserMedia) {
    // Secure but still missing: an old browser, or a WebView with media disabled.
    return 'unsupported-browser';
  }
  if (typeof window.MediaRecorder === 'undefined') return 'unsupported-browser';
  return null;
}

/** Maps a getUserMedia / MediaRecorder rejection onto something the candidate can act on. */
function captureErrorCode(e) {
  switch (e?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'no-mic';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in-use';
    default:
      return 'failed';
  }
}

/**
 * Plain-English, actionable text for a capture problem. Lives here so the mic check screen and
 * the exam itself cannot drift into describing the same fault two different ways.
 */
export function micProblemMessage(code) {
  switch (code) {
    case 'insecure-origin':
      return 'Recording is blocked because this page was not opened over a secure (https) connection. '
        + 'Browsers only allow the microphone on https. Please open the official https link for the app.';
    case 'unsupported-browser':
      return 'This browser cannot record audio. Please use an up-to-date Chrome, Edge, Firefox or Safari.';
    case 'denied':
      return 'Microphone permission is blocked. Allow it from the lock icon in the address bar, '
        + 'then press Record again.';
    case 'no-mic':
      return 'No microphone was found. Connect or unmute one, then press Record again.';
    case 'in-use':
      return 'Your microphone is being used by another app (Teams, Zoom or Meet). '
        + 'Close it, then press Record again.';
    default:
      return 'The microphone could not be started. Please press Record again.';
  }
}

/**
 * Records microphone audio and returns it as a base64 WAV (16 kHz mono) suitable
 * for Azure / OpenAI pronunciation assessment.
 *
 * Capture uses the standard MediaRecorder API (reliable across browsers and secure
 * production origins), then the recorded blob is decoded to PCM and re-encoded to
 * 16 kHz mono WAV. This replaces the deprecated ScriptProcessorNode approach, which
 * silently produced empty recordings in some production environments.
 */
export function useAudioRecorder() {
  // Why capture cannot work at all here (null when it can). Computed once: none of it changes
  // for the life of the page.
  const reason = useMemo(detectUnavailable, []);
  const supported = reason === null;
  const [recording, setRecording] = useState(false);
  // The last reason a start() attempt failed, so the caller can tell the candidate. This used to
  // be swallowed entirely.
  const [error, setError] = useState(null);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeRef = useRef('');

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  // Returns TRUE only when audio is genuinely being captured. The caller must not announce
  // "Recording" on a false: this swallowed every failure and returned as though it had worked, so
  // a candidate whose microphone was blocked was shown a running recorder, spoke a full answer
  // into nothing, and only found out when the take came back empty.
  const start = useCallback(async () => {
    if (!supported) {
      setError(reason);
      return false;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      streamRef.current = stream;
      // Pick a container the browser actually supports (Chrome/Edge: webm/opus,
      // Safari: mp4). We transcode to WAV on stop, so the container doesn't matter.
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mime = candidates.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || '';
      mimeRef.current = mime;
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      // Report "recording" only once the encoder has actually handed us audio, and then give
      // it a moment more to settle. Opening a capture stream is not instant and the first
      // fraction of a second comes back damaged: in every stored recording the file begins with
      // 300ms of digital silence and then speech at full level with no fade-in, and the opening
      // word transcribes as gibberish ("Please confirm the folder" was heard as "Count down the
      // total"; the first 1.5s on its own reads "Come from that floor over"). Whatever the browser
      // is doing in that window, the candidate must not be speaking into it -- so the UI stays on
      // "Getting the mic ready" until it has passed.
      recorder.start(200); // emit chunks periodically so nothing is lost
      await firstAudioOrTimeout(recorder);
      await settle(SETTLE_MS);
      setRecording(true);
      return true;
    } catch (e) {
      // Release anything that did open -- getUserMedia can succeed and the MediaRecorder
      // construction still throw, which would otherwise leave the mic light on with no recorder.
      cleanup();
      setRecording(false);
      setError(captureErrorCode(e));
      return false;
    }
  }, [supported, reason, cleanup]);

  // Returns base64 WAV (data URL) or null.
  const stop = useCallback(async () => {
    setRecording(false);
    const recorder = recorderRef.current;
    if (!recorder) {
      cleanup();
      return null;
    }
    // Wait for MediaRecorder to flush all buffered audio.
    const blob = await new Promise((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' }));
      try {
        recorder.stop();
      } catch {
        resolve(new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' }));
      }
    });
    cleanup();
    chunksRef.current = [];
    if (!blob || blob.size === 0) return null;

    // Decode the recorded audio to PCM, then downsample to 16 kHz mono WAV.
    try {
      const arrayBuf = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      const channel = audioBuf.getChannelData(0); // mono (first channel)
      const wav = encodeWav(downsample(channel, audioBuf.sampleRate, 16000), 16000);
      ctx.close().catch(() => {});
      return blobToBase64(wav);
    } catch {
      return null;
    }
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { supported, reason, error, recording, start, stop };
}
