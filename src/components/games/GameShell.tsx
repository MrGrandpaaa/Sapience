import { useState, useRef, useEffect } from 'react';
import {
  GameQuestion,
  QuestionEvaluation,
  REVIEW_GAMES_META,
  GameType,
} from '../../core/models/games';
import { reviewGameCoordinator } from '../../core/services/games/reviewGameCoordinator';
import { reviewSessionEngine } from '../../core/services/reviewSessionEngine';
import { GameCardListeningWriting } from './GameCardListeningWriting';
import { GameCardListeningMcq } from './GameCardListeningMcq';
import { GameCardMatching } from './GameCardMatching';
import { GameCardGender } from './GameCardGender';
import { GameCardVerbConjugation } from './GameCardVerbConjugation';
import { GameCardCloze } from './GameCardCloze';
import './GameShell.css';

interface GameShellProps {
  questions: GameQuestion[];
  onFinishSession: () => void;
  onExitGame: () => void;
  onPracticeAgain?: () => void;
}

export function GameShell({
  questions,
  onFinishSession,
  onExitGame,
  onPracticeAgain,
}: GameShellProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluation, setEvaluation] = useState<QuestionEvaluation | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    total: 0,
    streak: 0,
    maxStreak: 0,
    success: 0,
    borderline: 0,
    failure: 0,
  });

  const questionStartTimeRef = useRef<number>(Date.now());
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentIndex]);

  // Spacebar / Enter to continue to next question if evaluated
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (evaluation && (e.key === ' ' || e.key === 'Enter')) {
        // Prevent typing in input from triggering next immediately
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
        e.preventDefault();
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [evaluation]);

  if (questions.length === 0) {
    return (
      <div className="game-empty-state">
        <div className="empty-icon">⚠️</div>
        <h3>No eligible vocabulary for this game</h3>
        <p>
          The words in your list do not meet the criteria (e.g. Gender game only applies to Nouns, Construction game only applies to Verbs).
        </p>
        <button type="button" className="btn-game-exit" onClick={onExitGame}>
          Back to games list
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const meta = REVIEW_GAMES_META[currentQuestion.gameType];
  const isExtraPractice = questions.some((q) => q.isExtraPractice);

  const handleAnswerSubmit = (userAnswer: string) => {
    if (evaluation) return;

    const responseTimeMs = Date.now() - questionStartTimeRef.current;
    let result: QuestionEvaluation;

    const outcome = reviewSessionEngine.processRetrievalAttempt(
      currentIndex,
      userAnswer,
      responseTimeMs,
    );

    if (outcome) {
      result = outcome.evaluation;
    } else {
      result = reviewGameCoordinator.evaluateAndRecord(
        currentQuestion,
        userAnswer,
        responseTimeMs,
      );
    }

    setEvaluation(result);

    // Update stats
    setStats((prev) => {
      const isCorrect = result.isCorrect;
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        ...prev,
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        success: prev.success + (result.retrievalResult === 'success' ? 1 : 0),
        borderline: prev.borderline + (result.retrievalResult === 'borderline' ? 1 : 0),
        failure: prev.failure + (result.retrievalResult === 'failure' ? 1 : 0),
      };
    });

    // Auto-focus next button
    setTimeout(() => nextBtnRef.current?.focus(), 100);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setEvaluation(null);
      questionStartTimeRef.current = Date.now();
    } else {
      setSessionCompleted(true);
      reviewSessionEngine.concludeSession();
    }
  };

  const progressPercent = Math.round(
    ((currentIndex + (sessionCompleted ? 1 : 0)) / questions.length) * 100,
  );

  return (
    <div className="game-shell-container">
      {/* ── Top Bar ── */}
      <header className="game-shell-header">
        <button
          type="button"
          className="btn-shell-exit"
          onClick={onExitGame}
          title="Exit game"
        >
          ← Exit
        </button>

        <div className="game-meta-group">
          <span className="game-header-icon">{meta.icon}</span>
          <div className="game-header-titles">
            <span className="game-header-name">{meta.title}</span>
            <span className="game-header-sub">{meta.subtitle}</span>
          </div>
        </div>

        <div className="game-header-stats">
          {stats.streak >= 2 && (
            <span className="streak-badge" title="Consecutive correct answers streak">
              🔥 {stats.streak}
            </span>
          )}
          <span className="question-counter">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </header>

      {/* ── Progress Track ── */}
      <div className="game-shell-progress-track">
        <div
          className="game-shell-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── Game Body ── */}
      <div className="game-shell-body">
        {/* Extra Practice Notice Banner (Part 14) */}
        {isExtraPractice && !sessionCompleted && (
          <div className="extra-practice-banner" role="status">
            <span className="extra-practice-icon">⚡</span>
            <span className="extra-practice-text">
              <strong>EXTRA PRACTICE:</strong> This practice does not affect your spaced repetition schedule.
            </span>
          </div>
        )}

        {sessionCompleted ? (
          // ── Session Completed Screen (Part 15 & 16) ──
          <div className="game-completed-screen">
            <div className="completed-trophy">{isExtraPractice ? '⚡' : '🎉'}</div>
            <h2 className="completed-title">{meta.title} — Practice complete</h2>
            <p className="completed-subtext">
              {questions.length} / {questions.length}
              <br />
              {isExtraPractice
                ? 'This extra practice does not affect your spaced repetition schedule.'
                : 'SRS memory states have been automatically updated.'}
            </p>

            {/* Stats Summary Grid */}
            <div className="completed-metrics-grid">
              <div className="metric-box">
                <span className="metric-value">
                  {Math.round((stats.correct / questions.length) * 100)}%
                </span>
                <span className="metric-label">Accuracy</span>
              </div>
              <div className="metric-box">
                <span className="metric-value">
                  {stats.correct} / {questions.length}
                </span>
                <span className="metric-label">Correct Answers</span>
              </div>
              <div className="metric-box">
                <span className="metric-value">{stats.maxStreak}</span>
                <span className="metric-label">Best Streak</span>
              </div>
            </div>

            {/* SRS Memory State Updates (Only shown for real SRS review sessions) */}
            {!isExtraPractice && (
              <div className="srs-retrieval-summary">
                <span className="srs-summary-title">Memory state updates:</span>
                <div className="srs-summary-pills">
                  <span className="pill-srs-stat success">
                    ✓ {stats.success} advanced
                  </span>
                  <span className="pill-srs-stat borderline">
                    ~ {stats.borderline} reinforced
                  </span>
                  <span className="pill-srs-stat failure">
                    ✗ {stats.failure} rescheduled sooner
                  </span>
                </div>
              </div>
            )}

            <div className="completed-action-row">
              <button
                type="button"
                className="btn-completed-action primary"
                onClick={onPracticeAgain || onFinishSession}
              >
                Practice again ↺
              </button>
              <button
                type="button"
                className="btn-completed-action secondary"
                onClick={onExitGame}
              >
                Back to Games
              </button>
            </div>
          </div>
        ) : (
          // ── Active Game Card Presentation ──
          <div className="game-active-card">
            {currentQuestion.gameType === 'listening_writing' && (
              <GameCardListeningWriting
                question={currentQuestion as any}
                evaluation={evaluation}
                onSubmitAnswer={handleAnswerSubmit}
              />
            )}
            {currentQuestion.gameType === 'listening_mcq' && (
              <GameCardListeningMcq
                question={currentQuestion as any}
                evaluation={evaluation}
                onSubmitAnswer={handleAnswerSubmit}
              />
            )}
            {currentQuestion.gameType === 'matching' && (
              <GameCardMatching
                question={currentQuestion as any}
                evaluation={evaluation}
                onSubmitAnswer={handleAnswerSubmit}
              />
            )}
            {currentQuestion.gameType === 'gender' && (
              <GameCardGender
                question={currentQuestion as any}
                evaluation={evaluation}
                onSubmitAnswer={handleAnswerSubmit}
              />
            )}
            {currentQuestion.gameType === 'verb_conjugation' && (
              <GameCardVerbConjugation
                question={currentQuestion as any}
                evaluation={evaluation}
                onSubmitAnswer={handleAnswerSubmit}
              />
            )}
            {currentQuestion.gameType === 'cloze' && (
              <GameCardCloze
                question={currentQuestion as any}
                evaluation={evaluation}
                onSubmitAnswer={handleAnswerSubmit}
              />
            )}

            {/* ── Footer / Next Step Button ── */}
            {evaluation && (
              <div className="game-footer-actions">
                <button
                  ref={nextBtnRef}
                  type="button"
                  className="btn-next-question"
                  onClick={handleNextQuestion}
                >
                  {currentIndex + 1 < questions.length
                    ? 'Next Question'
                    : 'View Summary Results'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
