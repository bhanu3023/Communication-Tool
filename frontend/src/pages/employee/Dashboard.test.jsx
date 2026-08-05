import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { ToastProvider } from '../../contexts/ToastContext';

vi.mock('../../services/assessmentService', () => ({
  getDashboard: vi.fn(),
}));

import { getDashboard } from '../../services/assessmentService';

function card(section, bestScore, passed) {
  return {
    section,
    level: 1,
    levelUnlocked: true,
    status: bestScore != null ? 'Completed' : 'Not Started',
    latestScore: bestScore,
    bestScore,
    improvement: null,
    attemptsUsed: bestScore != null ? 1 : 0,
    attemptsAllowed: 2,
    canStart: bestScore == null,
    exhausted: false,
    requestPending: false,
    passMark: 75,
    passed: passed ?? (bestScore != null && bestScore >= 75),
    result: passed ? 'Passed' : bestScore != null ? 'In progress' : 'Not started',
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows progress snapshot when some sections are attempted', async () => {
    getDashboard.mockResolvedValue({
      name: 'Alex Smith',
      level: 1,
      levelUnlocked: true,
      nextLevelUnlocked: false,
      cards: [
        card('LISTENING', 80, true),
        card('SPEAKING', 70, false),
        card('WRITING', null, false),
      ],
      history: [],
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Your progress/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Your snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Going well/i)).toBeInTheDocument();
    expect(screen.queryByText(/Level 2/i)).not.toBeInTheDocument();
  });

  it('links coaching to AI Coach', async () => {
    getDashboard.mockResolvedValue({
      name: 'Alex Smith',
      level: 1,
      levelUnlocked: true,
      nextLevelUnlocked: true,
      cards: [
        card('LISTENING', 80, true),
        card('SPEAKING', 76, true),
        card('WRITING', 75, true),
      ],
      history: [],
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open AI Coach/i })).toBeInTheDocument();
    });
  });
});
