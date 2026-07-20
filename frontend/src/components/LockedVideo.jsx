import { useRef } from 'react';

/**
 * A video that cannot be fast-forwarded. Normal playback and rewinding are allowed,
 * but the user cannot drag/seek past the furthest point they've actually watched.
 * Keeps the standard controls (play/pause/volume) but removes download and speed.
 */
export default function LockedVideo({ src, onEnded, onError, style }) {
  const ref = useRef(null);
  const maxTime = useRef(0);

  const handleTimeUpdate = () => {
    const v = ref.current;
    if (!v) return;
    const t = v.currentTime;
    if (t > maxTime.current && t - maxTime.current < 1.5) {
      maxTime.current = t; // normal forward playback
    } else if (t > maxTime.current + 0.5) {
      v.currentTime = maxTime.current; // a forward jump slipped through — snap back
    }
  };

  const handleSeeking = () => {
    const v = ref.current;
    if (!v) return;
    if (v.currentTime > maxTime.current + 0.5) {
      v.currentTime = maxTime.current; // block seeking ahead of what was watched
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={ref}
      src={src}
      controls
      autoPlay
      controlsList="nodownload noplaybackrate noremoteplayback"
      disablePictureInPicture
      onTimeUpdate={handleTimeUpdate}
      onSeeking={handleSeeking}
      onEnded={onEnded}
      onError={onError}
      style={{ width: '100%', display: 'block', maxHeight: '70vh', ...style }}
    />
  );
}
