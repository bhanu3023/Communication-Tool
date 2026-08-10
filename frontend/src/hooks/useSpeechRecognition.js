import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Recognition language. The candidates are CloudFuze employees speaking Indian English, and
 * en-US mis-hears that often enough to cost marks on words the candidate said correctly.
 * en-IN is the same language model tuned for that accent.
 */
const RECOGNITION_LANG = 'en-IN';

/** Longest we will wait for the engine to actually start before letting the candidate speak. */
const START_TIMEOUT_MS = 2000;
/** Longest we will wait after stop() for the engine to deliver its final result. */
const DRAIN_TIMEOUT_MS = 1200;

/**
 * Wraps the Web Speech API speech recognition for the speaking assessment.
 * - Accumulates final results + shows interim text live.
 * - Auto-restarts if the engine ends early (Chrome stops on silence), so a
 *   pause mid-sentence doesn't kill capture.
 * - Surfaces the last error (e.g. 'not-allowed', 'network', 'audio-capture')
 *   so the UI can tell the candidate what's wrong.
 *
 * `start()` and `stop()` return promises. `start()` resolves when the engine reports it is
 * actually listening, so the caller can avoid showing "Recording" while the first words are
 * still being dropped on the floor. `stop()` resolves once the engine has delivered its final
 * result, so the closing words of a sentence are not lost.
 *
 * Read `transcriptRef.current` when saving. The `transcript` state exists to render live text;
 * it lags behind by a render, and a candidate who clicks Next immediately after speaking would
 * otherwise have their last words dropped.
 */
export function useSpeechRecognition() {
  const SpeechRecognition =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = Boolean(SpeechRecognition);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscriptState] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const wantListeningRef = useRef(false);
  const finalRef = useRef('');
  const transcriptRef = useRef('');
  // Resolvers for the promises handed back by start()/stop().
  const startWaitersRef = useRef([]);
  const stopWaitersRef = useRef([]);

  const settle = (ref) => {
    const waiters = ref.current;
    ref.current = [];
    waiters.forEach((resolve) => resolve());
  };

  const applyTranscript = useCallback((value) => {
    transcriptRef.current = value;
    setTranscriptState(value);
  }, []);

  useEffect(() => {
    if (!supported) return undefined;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = RECOGNITION_LANG;

    recognition.onstart = () => {
      setListening(true);
      settle(startWaitersRef);
    };
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalRef.current += `${chunk} `;
        else interim += chunk;
      }
      transcriptRef.current = `${finalRef.current}${interim}`.trim();
      setTranscriptState(transcriptRef.current);
    };
    recognition.onerror = (event) => {
      // 'no-speech'/'aborted' are benign; keep others for the UI.
      if (event.error && event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error);
      }
      // Never leave a caller awaiting a start that will not happen.
      settle(startWaitersRef);
    };
    recognition.onend = () => {
      // Chrome ends on silence; restart while the candidate is still recording.
      if (wantListeningRef.current) {
        try {
          recognition.start();
        } catch {
          /* will retry on next end */
        }
      } else {
        setListening(false);
        settle(stopWaitersRef);
      }
    };
    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
      settle(startWaitersRef);
      settle(stopWaitersRef);
    };
  }, [SpeechRecognition, supported]);

  /** Resolves once the engine is really listening (or the timeout expires). */
  const start = useCallback(() => {
    if (!recognitionRef.current) return Promise.resolve();
    finalRef.current = '';
    transcriptRef.current = '';
    setTranscriptState('');
    setError(null);
    wantListeningRef.current = true;
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      startWaitersRef.current.push(finish);
      // Never block the candidate indefinitely on a stalled engine.
      window.setTimeout(finish, START_TIMEOUT_MS);
      try {
        recognitionRef.current.start();
      } catch {
        // Already started (the previous sentence's engine has not ended yet). onstart will
        // not fire again, so release immediately rather than waiting out the timeout.
        finish();
      }
    });
  }, []);

  /** Resolves once the engine has ended and delivered its final result. */
  const stop = useCallback(() => {
    wantListeningRef.current = false;
    if (!recognitionRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        setListening(false);
        resolve();
      };
      stopWaitersRef.current.push(finish);
      window.setTimeout(finish, DRAIN_TIMEOUT_MS);
      try {
        recognitionRef.current.stop();
      } catch {
        finish();
      }
    });
  }, []);

  const setTranscript = useCallback(
    (value) => {
      finalRef.current = typeof value === 'string' && value ? `${value} ` : '';
      applyTranscript(typeof value === 'string' ? value : '');
    },
    [applyTranscript],
  );

  return { supported, listening, transcript, transcriptRef, error, start, stop, setTranscript };
}
