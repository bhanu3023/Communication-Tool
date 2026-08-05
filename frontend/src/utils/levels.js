// Level progression (UI layer).
//
// Level 1 is the three existing tests. Level 2 is a SEPARATE portal with its own
// three tests, and it opens only once the candidate has PASSED all three Level 1
// sections — however many attempts that took.
//
// Levels are real end to end: `level` is a column on the session and on every content
// bank, and it travels as a request parameter (`?level=2`). The helpers here only
// derive display state from what the API already returns — the backend independently
// enforces the gate and the attempt limits, so nothing here is a security boundary.
import { PASS_MARK } from './format';

/** The three sections that make up a level, in the order they are shown. */
export const SECTION_CODES = ['LISTENING', 'SPEAKING', 'WRITING'];

/**
 * Per-level rules, mirroring AttemptPolicy on the server (Level 1: 2 attempts / 75,
 * Level 2: 2 attempts / 80). These are for COPY only — every card carries its own
 * authoritative passMark and attemptsAllowed from the API. Keep them in step with
 * AttemptPolicy so the prose never contradicts the numbers on the tiles.
 */
export const LEVEL_RULES = {
  1: { attempts: 2, passMark: PASS_MARK },
  2: { attempts: 2, passMark: 80 },
};

export const levelRules = (level) => LEVEL_RULES[level] || LEVEL_RULES[1];

/** "2 attempts · pass mark 80" — one phrasing of the rules, used across the UI. */
export const rulesSummary = (level) => {
  const r = levelRules(level);
  return `${r.attempts} attempt${r.attempts === 1 ? '' : 's'} per section · pass mark ${r.passMark}`;
};

/**
 * Per-level visual identity. Both levels share the SAME layout — hero, three section
 * tiles, attempt history — so only the accent changes. That is deliberate: identical
 * structure keeps the app learnable, while a different accent (indigo -> teal) plus
 * the level badge makes it immediately obvious which level you are standing in.
 */
export const LEVEL_THEME = {
  1: {
    label: 'Level 1',
    tagline: 'Foundations',
    accent: '#3000ae',
    hero: 'linear-gradient(120deg, #ffffff 55%, #efeafc 100%)',
    heroText: '#1a2233',
    onAccent: '#fff',
  },
  2: {
    label: 'Level 2',
    tagline: 'Advanced',
    accent: '#00838f',
    hero: 'linear-gradient(120deg, #06323a 0%, #0b5c66 55%, #00acc1 100%)',
    heroText: '#ffffff',
    onAccent: '#fff',
  },
};

/**
 * Locked look. A level you have not earned must never wear its own accent — teal on a
 * locked portal reads as "go", which is exactly the wrong signal. Locked is neutral
 * slate; the accent arrives WITH the unlock, which makes the colour itself the reward.
 */
export const LOCKED_THEME = {
  label: 'Locked',
  tagline: 'Locked',
  accent: '#5a6b85',
  hero: 'linear-gradient(120deg, #2b3245 0%, #3b4459 100%)',
  heroText: '#ffffff',
  onAccent: '#fff',
  muted: '#c3cbd8',
};

export const levelTheme = (level) => LEVEL_THEME[level] || LEVEL_THEME[1];

/** Registered levels for UI toggles — add entries to LEVEL_THEME when new levels ship. */
export const levelCatalog = () =>
  Object.entries(LEVEL_THEME)
    .map(([n, t]) => ({
      n: Number(n),
      label: t.label,
      shortLabel: t.label.replace('Level ', 'L'),
      tagline: t.tagline,
    }))
    .sort((a, b) => a.n - b.n);

/** Level portals — used by in-page navigation (Test page level toggles). */
export const LEVELS_NAV = [
  { n: 1, label: 'Level 1', path: '/test?level=1' },
  { n: 2, label: 'Level 2', path: '/test?level=2' },
];

/** Hint shown when a level is still locked (e.g. "Complete Level 1 to unlock"). */
export const levelUnlockHint = (level) => {
  if (level <= 1) return '';
  const prev = levelCatalog().find((l) => l.n === level - 1);
  return `Complete ${prev?.label ?? `Level ${level - 1}`} to unlock`;
};

/** Employee test hub with optional level query. */
export const testPath = (level = 1) => `/test?level=${level}`;

export const sectionTitle = (code) => code.charAt(0) + code.slice(1).toLowerCase();

/** A section counts as passed when its BEST attempt cleared that section's pass mark. */
export const isSectionPassed = (card) => {
  if (!card || card.bestScore == null) return false;
  return card.bestScore >= (card.passMark ?? PASS_MARK);
};

/**
 * Per-section progress toward the Level 2 gate, always in SECTION_CODES order so the
 * checklist never reorders between loads.
 */
export const gateProgress = (cards) =>
  SECTION_CODES.map((code) => {
    const card = (cards || []).find((c) => c.section === code);
    const mark = card?.passMark ?? PASS_MARK;
    const best = card?.bestScore ?? null;
    const passed = isSectionPassed(card);
    return {
      section: code,
      title: sectionTitle(code),
      passed,
      attempted: !!card && card.attemptsUsed > 0,
      bestScore: best,
      passMark: mark,
      // How many points short this section still is (null once passed / untouched).
      shortfall: passed || best == null ? null : Math.round((mark - best) * 10) / 10,
    };
  });

export const passedCount = (cards) => gateProgress(cards).filter((p) => p.passed).length;

/** The gate itself: all three Level 1 sections passed. */
export const isLevel1Complete = (cards) => passedCount(cards) === SECTION_CODES.length;

// --- one-time unlock celebration -------------------------------------------------
// The "Level 2 unlocked" moment is what makes the progression feel earned, so it must
// fire once and never again. Until the backend can say "this is new", remember locally.

const CELEBRATED_KEY = 'level2UnlockCelebrated';

export const isUnlockCelebrated = () => {
  try {
    return window.localStorage.getItem(CELEBRATED_KEY) === '1';
  } catch {
    return true; // private mode: prefer silence over a dialog on every load
  }
};

export const markUnlockCelebrated = () => {
  try {
    window.localStorage.setItem(CELEBRATED_KEY, '1');
  } catch {
    /* non-fatal */
  }
};
