import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Wraps the Web Speech API speech recognition for the speaking assessment.
 * - Accumulates final results + shows interim text live.
 * - Auto-restarts if the engine ends early (Chrome stops on silence), so a
 *   pause mid-sentence doesn't kill capture.
 * - Surfaces the last error (e.g. 'not-allowed', 'network', 'audio-capture')
 *   so the UI can tell the candidate what's wrong.
 */
export function useSpeechRecognition() {
  const SpeechRecognition =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = Boolean(SpeechRecognition);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const wantListeningRef = useRef(false);
  const finalRef = useRef('');

  useEffect(() => {
    if (!supported) return undefined;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalRef.current += `${chunk} `;
        else interim += chunk;
      }
      setTranscript(`${finalRef.current}${interim}`.trim());
    };
    recognition.onerror = (event) => {
      // 'no-speech'/'aborted' are benign; keep others for the UI.
      if (event.error && event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error);
      }
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
    };
  }, [SpeechRecognition, supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    finalRef.current = '';
    setTranscript('');
    setError(null);
    wantListeningRef.current = true;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop, setTranscript };
}
