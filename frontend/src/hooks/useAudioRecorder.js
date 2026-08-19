import { useCallback, useEffect, useMemo, useRef, useState } from 'react';


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
    case 'empty-recording':
      return 'Nothing was captured — your microphone sent no sound. Check it is not muted or '
        + 'set to the wrong device, then record this sentence again.';
    case 'decode-failed':
      return 'Your voice was captured but this browser could not process the recording. '
        + 'Please record this sentence again, and use Chrome or Edge if it keeps happening.';
    case 'silent-recording':
      return 'Your microphone was connected but sent no sound, so the recording came out empty. '
        + 'Check that the right microphone is selected and not muted — in Windows, Settings → '
        + 'System → Sound → Input — then record this sentence again.';
    case 'no-recorder':
      return 'The recording had already stopped. Please record this sentence again.';
    default:
      return 'The microphone could not be started. Please press Record again.';
  }
}

/**
 * Decodes compressed audio to PCM, tolerating Safari's older API.
 *
 * <p>Safari before 14.1 implements ONLY the callback form of decodeAudioData and returns
 * undefined from the promise form. `await ctx.decodeAudioData(buf)` therefore resolves to
 * undefined and the very next line throws on `.getChannelData` — which the old catch swallowed,
 * so the take vanished with no explanation. Calling the callback form and ALSO honouring a
 * returned promise covers both.
 */
function decodeToPcm(ctx, arrayBuf) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ok = (buf) => { if (!settled) { settled = true; resolve(buf); } };
    const bad = (e) => { if (!settled) { settled = true; reject(e || new Error('decodeAudioData failed')); } };
    let maybePromise;
    try {
      maybePromise = ctx.decodeAudioData(arrayBuf, ok, bad);
    } catch (e) {
      bad(e);
      return;
    }
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(ok, bad);
    }
  });
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
  const trackRef = useRef(null);

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
      // A track that is `muted` is connected but delivering silence -- the device is being held
      // by something else, or the OS is routing from a different input. That produces a
      // container with no audio frames, which decodes to zero samples, which is a 0:00 take.
      trackRef.current = stream.getAudioTracks()[0] || null;
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

  // Returns { base64, mime, duration } for the take, or null when nothing usable was captured.
  //
  // The recording is handed back in the container the browser produced -- it is NOT converted to
  // WAV here any more. That conversion ran the bytes through an AudioContext, and on some
  // machines the decode returned zero samples, so a candidate who had read the sentence aloud
  // had their answer replaced by an empty 44-byte file. The transcriber accepts webm, mp4 and
  // ogg directly, so there is no reason to decode anything in the browser at all.
  //
  // The decode still happens, but ONLY to measure the take and catch genuine silence, and it can
  // no longer destroy a recording: if it fails, the raw audio is uploaded regardless and the
  // server decides what it hears.
  const stop = useCallback(async () => {
    setRecording(false);
    const recorder = recorderRef.current;
    if (!recorder) {
      cleanup();
      setError('no-recorder');
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
    const track = trackRef.current;
    cleanup();
    const chunkCount = chunksRef.current.length;
    chunksRef.current = [];
    const mime = blob?.type || mimeRef.current || 'audio/webm';

    if (!blob || blob.size === 0) {
      // The encoder handed back nothing at all: a muted or wrong input device, or a
      // MediaRecorder that never emitted a chunk.
      console.warn('[recorder] empty recording', {
        chunks: chunkCount,
        mime,
        trackMuted: track?.muted,
        trackEnabled: track?.enabled,
        trackState: track?.readyState,
        trackLabel: track?.label,
      });
      setError('empty-recording');
      return null;
    }

    // Measure the take. Advisory only -- see above.
    let duration = null;
    let ctx = null;
    try {
      const arrayBuf = await blob.slice(0).arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
        const audioBuf = await decodeToPcm(ctx, arrayBuf);
        if (audioBuf && typeof audioBuf.getChannelData === 'function') {
          duration = audioBuf.duration;
          if (audioBuf.length === 0 || audioBuf.duration === 0) {
            console.warn('[recorder] the microphone delivered no audio', {
              blobSize: blob.size,
              mime,
              chunks: chunkCount,
              decodedSamples: audioBuf.length,
              sampleRate: audioBuf.sampleRate,
              trackMuted: track?.muted,
              trackEnabled: track?.enabled,
              trackState: track?.readyState,
              trackLabel: track?.label,
            });
            setError('silent-recording');
            return null;
          }
        }
      }
    } catch (e) {
      // The browser could not decode its own recording. That used to lose the take; now it only
      // means we cannot show a duration, and the audio is uploaded for the server to transcribe.
      console.warn('[recorder] could not measure the take locally (uploading it anyway)', {
        blobSize: blob.size,
        mime,
        chunks: chunkCount,
        error: e?.name,
        message: e?.message,
      });
    } finally {
      if (ctx) ctx.close().catch(() => {});
    }

    setError(null);
    return { base64: await blobToBase64(blob), mime, duration };
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { supported, reason, error, recording, start, stop };
}
