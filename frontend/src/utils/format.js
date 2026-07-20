export const scoreColor = (score) => {
  if (score == null) return 'default';
  if (score >= 80) return 'success';
  if (score >= 65) return 'primary';
  return 'warning';
};

export const fmtScore = (score) => (score == null ? '—' : `${Math.round(score)}`);

export const prettySection = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
