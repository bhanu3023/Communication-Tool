import { useCallback, useEffect, useRef, useState } from 'react';
import { enterFullscreen, exitFullscreen } from '../utils/fullscreen';

/**
 * Proctors an assessment section: fullscreen enforcement + anti-malpractice.
 *
 * WARNED actions (each counts toward the strike limit; after `maxWarnings`
 * the next one ends the exam via `onExceed`):
 *   - leaving fullscreen
 *   - switching browser tab / minimizing (visibilitychange -> hidden)
 *   - the window losing focus (another app/window/popup appears)
 *
 * HARD-BLOCKED actions (prevented, not counted):
 *   - context menu (right click)
 *   - copy / cut / paste
 *   - DevTools / View-Source / Save / Print keyboard shortcuts
 *   - printing (content hidden via CSS while `exam-active`)
 *
 * Programmatic fullscreen exits (normal submission via leave()) are flagged so
 * they never count as a violation.
 */
export function useExamMode({
  active,
  allowTyping = false,
  maxWarnings = 3,
  onExceed,
  onBlockedKey,
  onViolation,
}) {
  const onExceedRef = useRef(onExceed);
  onExceedRef.current = onExceed;
  const allowTypingRef = useRef(allowTyping);
  allowTypingRef.current = allowTyping;
  const onBlockedRef = useRef(onBlockedKey);
  onBlockedRef.current = onBlockedKey;
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  const programmaticRef = useRef(false);
  const countRef = useRef(0);
  const lastViolationRef = useRef(0);
  const lastNotifyRef = useRef(0);
  const warningOpenRef = useRef(false);

  const [warningOpen, setWarningOpen] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [warningReason, setWarningReason] = useState('');

  const registerViolation = useCallback(
    (reason) => {
      if (warningOpenRef.current) return; // already showing a warning
      const now = Date.now();
      if (now - lastViolationRef.current < 1000) return; // debounce one physical action
      lastViolationRef.current = now;

      const next = countRef.current + 1;
      countRef.current = next;
      if (onViolationRef.current) onViolationRef.current(reason, next); // record every warning
      if (next > maxWarnings) {
        setWarningOpen(false);
        warningOpenRef.current = false;
        if (onExceedRef.current) onExceedRef.current();
      } else {
        setWarningReason(reason);
        setWarningCount(next);
        setWarningOpen(true);
        warningOpenRef.current = true;
      }
    },
    [maxWarnings],
  );

  const enter = useCallback(() => {
    programmaticRef.current = false;
    enterFullscreen();
  }, []);

  const leave = useCallback(() => {
    programmaticRef.current = true; // expected exit — not a violation
    exitFullscreen();
  }, []);

  const continueExam = useCallback(() => {
    setWarningOpen(false);
    warningOpenRef.current = false;
    programmaticRef.current = false;
    enterFullscreen();
  }, []);

  useEffect(() => {
    if (!active) return undefined;

    document.body.classList.add('exam-active');

    const onFsChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (isFullscreen) return;
      if (programmaticRef.current) {
        programmaticRef.current = false;
        return;
      }
      registerViolation('You left fullscreen mode.');
    };
    const onVisibility = () => {
      if (document.hidden) registerViolation('You switched away from the exam tab.');
    };
    const onBlur = () => registerViolation('The exam window lost focus (another window or app appeared).');

    const block = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    const notifyBlocked = () => {
      const now = Date.now();
      if (now - lastNotifyRef.current < 1500) return; // throttle toasts
      lastNotifyRef.current = now;
      if (onBlockedRef.current) {
        onBlockedRef.current(
          allowTypingRef.current
            ? 'That key is disabled during the exam.'
            : 'The keyboard is disabled during this section.',
        );
      }
    };
    const onKeyDown = (e) => {
      const key = e.key || '';
      const combo = e.ctrlKey || e.metaKey || e.altKey;
      const isFunctionKey = /^F\d{1,2}$/.test(key);
      let blocked;
      if (!allowTypingRef.current) {
        blocked = true; // Listening/Speaking: no keyboard input at all
      } else {
        // Writing: allow plain typing, block shortcuts / function keys / Tab
        blocked = combo || isFunctionKey || key === 'Tab';
      }
      if (blocked) {
        block(e);
        notifyBlocked();
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    document.addEventListener('selectstart', block);
    document.addEventListener('dragstart', block);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.body.classList.remove('exam-active');
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('selectstart', block);
      document.removeEventListener('dragstart', block);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [active, registerViolation]);

  return { enter, leave, continueExam, warningOpen, warningCount, warningReason, maxWarnings };
}
