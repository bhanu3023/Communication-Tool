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
 * for Azure pronunciation assessment. Audio is captured via Web Audio and routed
 * through a muted gain node, so nothing plays back to the speakers (no echo).
 */
export function useAudioRecorder() {
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const [recording, setRecording] = useState(false);

  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const procRef = useRef(null);
  const chunksRef = useRef([]);
  const rateRef = useRef(16000);

  const cleanup = useCallback(() => {
    if (procRef.current) {
      procRef.current.disconnect();
      procRef.current.onaudioprocess = null;
      procRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      rateRef.current = ctx.sampleRate;
      const source = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;
      chunksRef.current = [];
      proc.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      const mute = ctx.createGain();
      mute.gain.value = 0; // do not play the mic back to the speakers
      source.connect(proc);
      proc.connect(mute);
      mute.connect(ctx.destination);
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [supported]);

  // Returns base64 WAV (data URL) or null.
  const stop = useCallback(async () => {
    const chunks = chunksRef.current;
    const inRate = rateRef.current;
    setRecording(false);
    cleanup();
    const len = chunks.reduce((a, c) => a + c.length, 0);
    chunksRef.current = [];
    if (len === 0) return null;
    const flat = new Float32Array(len);
    let off = 0;
    chunks.forEach((c) => {
      flat.set(c, off);
      off += c.length;
    });
    const wav = encodeWav(downsample(flat, inRate, 16000), 16000);
    return blobToBase64(wav);
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { supported, recording, start, stop };
}
