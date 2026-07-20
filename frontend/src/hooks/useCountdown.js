import { useEffect, useRef, useState } from 'react';

/**
 * Counts down from `totalSeconds`. Calls onExpire once at zero and onTick every
 * second (useful for warning thresholds). Restarts when `resetKey` changes.
 */
export function useCountdown(totalSeconds, { onExpire, onTick, active = true, resetKey } = {}) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);
  const firedRef = useRef(false);

  onExpireRef.current = onExpire;
  onTickRef.current = onTick;

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    firedRef.current = false;
  }, [totalSeconds, resetKey]);

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next >= 0 && onTickRef.current) onTickRef.current(next);
        if (next <= 0 && !firedRef.current) {
          firedRef.current = true;
          if (onExpireRef.current) onExpireRef.current();
          return 0;
        }
        return next < 0 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, resetKey]);

  return secondsLeft;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
