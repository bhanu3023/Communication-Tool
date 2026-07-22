export const scoreColor = (score) => {
  if (score == null) return 'default';
  if (score >= 80) return 'success';
  if (score >= 65) return 'primary';
  return 'warning';
};

// Show the true score, not a rounded one — rounding 74.7 up to "75" contradicts the
// "below the 75 pass mark" message. Whole numbers show plainly; fractions show 1 decimal.
export const fmtScore = (score) =>
  score == null ? '—' : Number.isInteger(score) ? `${score}` : score.toFixed(1);

export const prettySection = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
