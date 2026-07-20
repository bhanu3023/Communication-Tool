import { useEffect, useRef } from 'react';

/**
 * While `active`, pressing Escape ends the exam by calling `onEnd`.
 * (Testing aid — a single Escape press exits the assessment.)
 */
export function useEscapeToEnd(active, onEnd) {
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onEndRef.current) onEndRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active]);
}
