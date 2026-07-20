import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Wraps the Web Speech API speech synthesis for the listening story.
 * Playback is one-shot (no replay/pause/seek exposed to the UI).
 *
 * Long passages are split into sentence-sized utterances and queued. This avoids
 * the well-known Chrome bug where a single long utterance stops after ~15s, and a
 * periodic resume() acts as a further keep-alive.
 */
export function useSpeechSynthesis() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  const keepAliveRef = useRef(null);

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    clearKeepAlive();
    setSpeaking(false);
  }, [supported, clearKeepAlive]);

  const speak = useCallback(
    (text, { onEnd } = {}) => {
      if (!supported || !text) {
        if (onEnd) onEnd();
        return;
      }
      window.speechSynthesis.cancel();

      // Split into sentences so each utterance is short and reliable.
      const chunks = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) || [text];

      chunks.forEach((chunk, i) => {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = 'en-US';
        u.rate = 0.98;
        u.pitch = 1;
        if (i === 0) {
          u.onstart = () => setSpeaking(true);
        }
        if (i === chunks.length - 1) {
          u.onend = () => {
            clearKeepAlive();
            setSpeaking(false);
            if (onEnd) onEnd();
          };
        }
        window.speechSynthesis.speak(u);
      });

      // Keep-alive: Chrome pauses long queues; nudging resume() keeps it going.
      clearKeepAlive();
      keepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        }
      }, 8000);
    },
    [supported, clearKeepAlive],
  );

  useEffect(() => () => cancel(), [cancel]);

  return { supported, speaking, speak, cancel };
}
