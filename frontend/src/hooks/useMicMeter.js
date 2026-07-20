import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Live microphone input-level meter for the pre-Speaking mic check.
 * Uses getUserMedia + Web Audio AnalyserNode to compute an RMS level (0-100)
 * so the candidate can confirm the system mic is capturing their voice.
 *
 * status: 'idle' | 'checking' | 'ok' | 'denied' | 'error'
 * ('ok' latches once a clear voice signal has been detected at least once.)
 */
export function useMicMeter() {
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState('idle');

  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const rafRef = useRef(null);
  const detectedRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setStatus('error');
      return;
    }
    setStatus('checking');
    detectedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      // Chrome creates the context suspended; resume it so the analyser reads real audio.
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          /* ignore */
        }
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const lvl = Math.min(100, Math.round(rms * 300));
        setLevel(lvl);
        if (lvl > 12) {
          detectedRef.current = true;
          setStatus('ok');
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      setStatus(e && e.name === 'NotAllowedError' ? 'denied' : 'error');
    }
  }, [supported]);

  useEffect(() => () => stop(), [stop]);

  return { supported, level, status, start, stop };
}
