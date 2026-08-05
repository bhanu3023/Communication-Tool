import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Test from './Test';
import { ToastProvider } from '../../contexts/ToastContext';

vi.mock('../../services/assessmentService', () => ({
  getSections: vi.fn(),
  requestAttempt: vi.fn(),
}));

import { getSections } from '../../services/assessmentService';

function l1Card(section, bestScore, passed) {
  return {
    section,
    level: 1,
    levelUnlocked: true,
    status: 'Completed',
    latestScore: bestScore,
    bestScore,
    improvement: null,
    attemptsUsed: bestScore != null ? 1 : 0,
    attemptsAllowed: 2,
    canStart: bestScore == null,
    exhausted: false,
    requestPending: false,
    passMark: 75,
    passed,
    result: passed ? 'Passed' : bestScore != null ? 'In progress' : 'Not started',
  };
}

function l2Card(section, unlocked) {
  return {
    section,
    level: 2,
    levelUnlocked: unlocked,
    status: 'Not Started',
    latestScore: null,
    bestScore: null,
    improvement: null,
    attemptsUsed: 0,
    attemptsAllowed: 2,
    canStart: unlocked,
    exhausted: false,
    requestPending: false,
    passMark: 80,
    passed: false,
    result: 'Not started',
  };
}

function renderTest(initial = '/test?level=1') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <ToastProvider>
        <Test />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the next level when the gate is closed', async () => {
    const l1 = [
      l1Card('LISTENING', 80, true),
      l1Card('SPEAKING', 70, false),
      l1Card('WRITING', null, false),
    ];
    const l2 = [l2Card('LISTENING', false), l2Card('SPEAKING', false), l2Card('WRITING', false)];
    getSections.mockImplementation((level) => Promise.resolve(level === 2 ? l2 : l1));

    renderTest();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Level 1 tests' })).toBeEnabled();
    });
    expect(screen.getByRole('button', { name: 'Level 2 tests' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Start Writing/i })).toBeInTheDocument();
  });

  it('shows sections when the next level is unlocked', async () => {
    const l1 = [
      l1Card('LISTENING', 80, true),
      l1Card('SPEAKING', 76, true),
      l1Card('WRITING', 75, true),
    ];
    getSections.mockImplementation((level) =>
      Promise.resolve(
        level === 2
          ? [l2Card('LISTENING', true), l2Card('SPEAKING', true), l2Card('WRITING', true)]
          : l1,
      ),
    );

    renderTest('/test?level=2');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Level 2 tests' })).toBeEnabled();
      expect(screen.getByRole('heading', { name: 'Listening' })).toBeInTheDocument();
    });
  });
});
