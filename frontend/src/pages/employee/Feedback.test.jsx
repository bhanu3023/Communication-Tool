import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Feedback from './Feedback';
import { ToastProvider } from '../../contexts/ToastContext';

vi.mock('../../services/assessmentService', () => ({
  getMyAttempts: vi.fn(),
  getSections: vi.fn(),
}));

import { getMyAttempts, getSections } from '../../services/assessmentService';

function renderFeedback() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Feedback />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSections.mockResolvedValue([
      { section: 'LISTENING', passed: true, bestScore: 80, passMark: 75, attemptsUsed: 1 },
      { section: 'SPEAKING', passed: true, bestScore: 76, passMark: 75, attemptsUsed: 1 },
      { section: 'WRITING', passed: true, bestScore: 75, passMark: 75, attemptsUsed: 1 },
    ]);
  });

  it('renders empty sections without crashing', async () => {
    getMyAttempts.mockResolvedValue([]);
    renderFeedback();
    await waitFor(() => {
      expect(screen.getByText('Feedback')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/No attempts yet/i).length).toBeGreaterThan(0);
  });

  it('renders listening attempt details without crashing', async () => {
    getMyAttempts.mockResolvedValue([
      {
        sessionId: 1,
        section: 'LISTENING',
        level: 1,
        attemptNumber: 1,
        date: '2026-01-01',
        score: 80,
        improvement: null,
        improvedAreas: null,
        declinedAreas: null,
        details: { correctCount: 8, wrongCount: 2, answers: [] },
      },
    ]);
    renderFeedback();
    await waitFor(() => {
      expect(screen.getByText(/Attempt #1/i)).toBeInTheDocument();
    });
  });

  it('renders speaking attempt details without crashing', async () => {
    getMyAttempts.mockResolvedValue([
      {
        sessionId: 2,
        section: 'SPEAKING',
        level: 1,
        attemptNumber: 1,
        date: '2026-01-01',
        score: 82,
        improvedAreas: ['Fluency (+5)'],
        declinedAreas: [],
        details: {
          items: [
            {
              expected: 'Please confirm the meeting time.',
              transcript: 'Please confirm the meeting.',
              evaluation: {
                overall: 82,
                fluency: 78,
                suggestions: ['Finish the full sentence.'],
              },
            },
          ],
        },
      },
    ]);
    renderFeedback();
    await waitFor(() => {
      expect(screen.getByText(/Attempt #1/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Please confirm the meeting time/i)).toBeInTheDocument();
  });

  it('tolerates malformed improvement fields', async () => {
    getMyAttempts.mockResolvedValue([
      {
        sessionId: 3,
        section: 'WRITING',
        level: 1,
        attemptNumber: 1,
        date: '2026-01-01',
        score: 70,
        improvedAreas: 'Grammar',
        declinedAreas: { bad: 'data' },
        details: {
          items: [
            {
              prompt: 'Write a short update.',
              content: 'Hello team.',
              evaluation: { overall: 70, mistakes: [{ msg: 'Too short' }], suggestions: ['Add detail'] },
            },
          ],
        },
      },
    ]);
    renderFeedback();
    await waitFor(() => {
      expect(screen.getByText(/Improved since your last attempt/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Write a short update/i)).toBeInTheDocument();
  });
});
