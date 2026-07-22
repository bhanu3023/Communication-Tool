import { useCallback, useEffect, useRef, useState } from 'react';

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
 * Records microphone audio and returns it as a base64 WAV (16 kHz mono) suitable
 * for Azure / OpenAI pronunciation assessment.
 *
 * Capture uses the standard MediaRecorder API (reliable across browsers and secure
 * production origins), then the recorded blob is decoded to PCM and re-encoded to
 * 16 kHz mono WAV. This replaces the deprecated ScriptProcessorNode approach, which
 * silently produced empty recordings in some production environments.
 */
export function useAudioRecorder() {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined';
  const [recording, setRecording] = useState(false);

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

  const start = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      recorder.start(200); // emit chunks periodically so nothing is lost
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [supported]);

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

  return { supported, recording, start, stop };
}
