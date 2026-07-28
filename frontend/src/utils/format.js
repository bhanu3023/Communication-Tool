// Pass mark is 75 (AttemptPolicy.PASS_MARK). Scores are pass/fail: green at or above
// the pass mark, red below it — no in-between colors. Computed from the score at render
// time, so it applies uniformly to existing attempts and new ones.
export const PASS_MARK = 75;
export const scoreColor = (score) => {
  if (score == null) return 'default';
  return score >= PASS_MARK ? 'success' : 'error';
};

// Show the true score, not a rounded one — rounding 74.7 up to "75" contradicts the
// "below the 75 pass mark" message. Whole numbers show plainly; fractions show 1 decimal.
export const fmtScore = (score) =>
  score == null ? '—' : Number.isInteger(score) ? `${score}` : score.toFixed(1);

export const prettySection = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
