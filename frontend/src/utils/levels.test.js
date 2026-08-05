import { describe, expect, it } from 'vitest';
import {
  SECTION_CODES,
  gateProgress,
  isLevel1Complete,
  isSectionPassed,
} from '../utils/levels';

const card = (section, bestScore, passMark = 75, attemptsUsed = 1) => ({
  section,
  bestScore,
  passMark,
  attemptsUsed,
});

describe('levels.js', () => {
  describe('isSectionPassed', () => {
    it('returns false when bestScore is null', () => {
      expect(isSectionPassed(card('LISTENING', null))).toBe(false);
    });

    it('uses card passMark (Level 2 = 80)', () => {
      expect(isSectionPassed(card('SPEAKING', 79, 80))).toBe(false);
      expect(isSectionPassed(card('SPEAKING', 80, 80))).toBe(true);
    });

    it('defaults to PASS_MARK 75 when passMark omitted', () => {
      expect(isSectionPassed({ section: 'WRITING', bestScore: 74, attemptsUsed: 1 })).toBe(false);
      expect(isSectionPassed({ section: 'WRITING', bestScore: 75, attemptsUsed: 1 })).toBe(true);
    });
  });

  describe('gateProgress', () => {
    it('returns all three sections in SECTION_CODES order', () => {
      const progress = gateProgress([card('WRITING', 80, 75)]);
      expect(progress.map((p) => p.section)).toEqual(SECTION_CODES);
      expect(progress.find((p) => p.section === 'WRITING').passed).toBe(true);
      expect(progress.find((p) => p.section === 'LISTENING').attempted).toBe(false);
    });

    it('computes shortfall when below pass mark', () => {
      const progress = gateProgress([card('LISTENING', 70, 75)]);
      expect(progress[0].shortfall).toBe(5);
    });
  });

  describe('isLevel1Complete', () => {
    it('is false until all three sections pass', () => {
      const partial = [
        card('LISTENING', 80),
        card('SPEAKING', 76),
        card('WRITING', 74),
      ];
      expect(isLevel1Complete(partial)).toBe(false);

      const complete = [
        card('LISTENING', 75),
        card('SPEAKING', 90),
        card('WRITING', 80),
      ];
      expect(isLevel1Complete(complete)).toBe(true);
    });
  });
});
