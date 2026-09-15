import { useState, useEffect, useRef } from 'react';
import { VocabularyItem } from '../core/models/vocabulary';
import { RetrievalEvaluationInput } from '../core/models/srs';
import { reviewPriorityService, PriorityScoreBreakdown } from '../core/services/reviewPriorityService';
import { GameSelectionDecision } from '../core/services/games/gameSelectionEngine';
import { reviewSessionEngine } from '../core/services/reviewSessionEngine';
import {
  GameQuestion,
  QuestionEvaluation,
  REVIEW_GAMES_META,
} from '../core/models/games';
import { GameCardListeningWriting } from './games/GameCardListeningWriting';
import { GameCardListeningMcq } from './games/GameCardListeningMcq';
import { GameCardMatching } from './games/GameCardMatching';
import { GameCardGender } from './games/GameCardGender';
import { GameCardVerbConjugation } from './games/GameCardVerbConjugation';
import { GameCardCloze } from './games/GameCardCloze';
import { FormatADisplay } from './FormatADisplay';
import { SkillPerformanceBadge } from './SkillPerformanceBadge';
import './ReviewSessionModal.css';
import './games/GameShell.css';

interface ReviewSessionModalProps {
  queue: VocabularyItem[];
  isOpen: boolean;
  onClose: () => void;
  onRecordRetrieval?: (id: string, input: RetrievalEvaluationInput) => void;
  resumeSession?: boolean;
}

export function ReviewSessionModal({
  queue,
  isOpen,
  onClose,
  onRecordRetrieval,
  resumeSession = false,
}: ReviewSessionModalProps) {
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [decisions, setDecisions] = useState<GameSelectionDecision[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluation, setEvaluation] = useState<QuestionEvaluation | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showFormatA, setShowFormatA] = useState(false);
  const [testedHistory, setTestedHistory] = useState<{
    item: VocabularyItem;
    evaluation: QuestionEvaluation;
  }[]>([]);
  const [stats, setStats] = useState({
    correct: 0,
    total: 0,
    success: 0,
    borderline: 0,
    failure: 0,
    skillsTrained: {} as Record<string, number>,
  });

  const questionStartTimeRef = useRef<number>(Date.now());
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // Initialize or resume questions and algorithm decisions when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = resumeSession ? reviewSessionEngine.resumeSession() : null;

    // If no existing active session to resume, start fresh session via ReviewSessionEngine
    if (!active && queue.length > 0) {
      active = reviewSessionEngine.startSession(queue.length, { allowNonDue: true });
    }

    if (active && active.serializedQuestions && active.serializedQuestions.length > 0) {
      setQuestions(active.serializedQuestions);
      setCurrentIndex(active.currentIndex);
      setStats(active.stats);
      setTestedHistory(active.testedHistory || []);
      setEvaluation(null);
      setSessionCompleted(false);
      setShowFormatA(false);

      // Reconstruct decisions matching questions
      const decs: GameSelectionDecision[] = active.serializedQuestions.map((q) => ({
        selectedGame: q.gameType,
        selectionReason: q.selectionReason || 'Algorithm selected for priority retrieval',
        supportLevel: q.supportLevel || 'medium_support',
        candidateScores: [],
      }));
      setDecisions(decs);
      questionStartTimeRef.current = Date.now();
    }
  }, [isOpen, queue, resumeSession]);

  // Spacebar / Enter shortcut to advance to next question after answering
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (evaluation && (e.key === ' ' || e.key === 'Enter')) {
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
        e.preventDefault();
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [evaluation]);

  if (!isOpen || questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const currentDecision = decisions[currentIndex];
  const currentItem = currentQuestion?.targetItem;

  const priorityBreakdown: PriorityScoreBreakdown | null = currentItem
    ? reviewPriorityService.calculatePriorityScore(currentItem)
    : null;

  const gameMeta = currentQuestion ? REVIEW_GAMES_META[currentQuestion.gameType] : null;

  const handleAnswerSubmit = (userAnswer: string) => {
    if (evaluation || !currentQuestion) return;

    const responseTimeMs = Date.now() - questionStartTimeRef.current;

    // Delegate scoring, SRS level updates, skill weights, and attempt recording to ReviewSessionEngine
    const outcome = reviewSessionEngine.processRetrievalAttempt(
      currentIndex,
      userAnswer,
      responseTimeMs,
    );

    if (outcome) {
      setEvaluation(outcome.evaluation);
      setTestedHistory(outcome.session.testedHistory);
      setStats(outcome.session.stats);
    }

    // Auto-focus next button
    setTimeout(() => nextBtnRef.current?.focus(), 150);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setEvaluation(null);
      setShowFormatA(false);
      questionStartTimeRef.current = Date.now();
    } else {
      setSessionCompleted(true);
      reviewSessionEngine.concludeSession();
    }
  };

  const progressPercent = Math.round(
    ((currentIndex + (sessionCompleted ? 1 : 0)) / questions.length) * 100,
  );

  const getSupportLabel = (level?: string) => {
    switch (level) {
      case 'high_support':
        return 'Support: High';
      case 'medium_support':
        return 'Support: Medium';
      case 'low_support':
        return 'Support: Minimal';
      default:
        return 'Adaptive';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card review-session-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header with Progress ── */}
        <div className="review-modal-header">
          <div className="review-progress-info">
            <span className="review-queue-title">SRS Priority Review Session</span>
            <span className="review-queue-count">
              {sessionCompleted ? questions.length : currentIndex + 1} / {questions.length}
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close review session"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="review-progress-track">
          <div
            className="review-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ── Modal Body ── */}
        <div className="review-modal-body">
          {sessionCompleted ? (
            // ── Session Completed View ──
            <div className="review-completed-view">
              <div className="completed-icon">🎉</div>
              <h3 className="completed-title">Review Session Completed!</h3>
              <p className="completed-desc">
                You have completed retrieval and updated memory states for{' '}
                <strong>{questions.length}</strong> vocabulary items according to the priority algorithm.
              </p>

              {/* Accuracy Metric */}
              <div className="completed-accuracy-banner">
                <span className="accuracy-percent">
                  {Math.round((stats.correct / questions.length) * 100)}%
                </span>
                <span className="accuracy-label">
                  Accuracy ({stats.correct} / {questions.length} correct)
                </span>
              </div>

              {/* SRS Memory State Updates */}
              <div className="completed-summary-grid">
                <div className="summary-pill summary-pill--success">
                  <span className="pill-number">{stats.success}</span>
                  <span className="pill-label">Retrieved (Promoted)</span>
                </div>
                <div className="summary-pill summary-pill--borderline">
                  <span className="pill-number">{stats.borderline}</span>
                  <span className="pill-label">Borderline (Reinforced)</span>
                </div>
                <div className="summary-pill summary-pill--failure">
                  <span className="pill-number">{stats.failure}</span>
                  <span className="pill-label">Forgotten (Demoted)</span>
                </div>
              </div>

              {/* Skills Trained Summary */}
              {Object.keys(stats.skillsTrained).length > 0 && (
                <div className="skills-trained-summary">
                  <span className="skills-summary-title">Language skills trained:</span>
                  <div className="skills-summary-tags">
                    {Object.entries(stats.skillsTrained).map(([skill, cnt]) => (
                      <span key={skill} className="skill-summary-tag">
                        #{skill}: {cnt} items
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tested items summary with skill performance */}
              {testedHistory.length > 0 && (
                <div className="completed-items-history">
                  <span className="skills-summary-title">
                    Vocabulary performance updates:
                  </span>
                  <div className="history-items-list">
                    {testedHistory.map(({ item, evaluation }, idx) => (
                      <div key={`${item.id}-${idx}`} className="history-item-row">
                        <div className="history-item-header">
                          <span className="history-item-word">{item.surface_form}</span>
                          <span className={`history-item-result result-${evaluation.retrievalResult}`}>
                            {evaluation.retrievalResult === 'success'
                              ? '✓ Consolidated'
                              : evaluation.retrievalResult === 'borderline'
                              ? '~ Reinforced'
                              : '✗ Demoted'}
                          </span>
                          {item.item_mastery?.isMastered && (
                            <span className="item-mastered-pill">★ Mastered</span>
                          )}
                        </div>
                        <SkillPerformanceBadge item={item} compact={true} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                className="btn-finish-review"
                onClick={onClose}
              >
                Finish &amp; View Vocabulary List
              </button>
            </div>
          ) : currentQuestion && currentItem ? (
            // ── Active Question View ──
            <div className="review-interactive-container">
              {/* Game Title & Instruction (No game number, no algorithm) */}
              {gameMeta && (
                <div className="review-game-header-bar">
                  <span className="game-header-icon">{gameMeta.icon}</span>
                  <div className="game-header-titles">
                    <span className="game-header-name">{gameMeta.title}</span>
                    <span className="game-header-sub">{gameMeta.subtitle}</span>
                  </div>
                </div>
              )}

              {/* 3. Interactive Game Card Component */}
              <div className="review-game-card-wrapper">
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
              </div>

              {/* 4. After-Answer Actions & Format A Inspector */}
              {evaluation && (
                <div className="review-post-eval-actions">
                  {/* Granular Skill Delta & Matrix */}
                  {evaluation.skillDelta && (
                    <div
                      className={`eval-skill-feedback-card ${
                        evaluation.skillDelta.isCoreError
                          ? 'eval-skill--core-error'
                          : evaluation.errorCategory === 'minor'
                          ? 'eval-skill--minor-error'
                          : 'eval-skill--success'
                      }`}
                    >
                      <div className="eval-skill-feedback-title">
                        {evaluation.skillDelta.isCoreError ? (
                          <span>⚠️ <strong>Core Lexical Error:</strong> Heavy penalty weight α = 0.50 (Resets mastery streak)</span>
                        ) : evaluation.errorCategory === 'minor' ? (
                          <span>ℹ️ <strong>Minor Error:</strong> Accent / Minor spelling (Penalty weight α = 0.20)</span>
                        ) : (
                          <span>✨ <strong>Successful Retrieval:</strong> Consolidated skill mastery</span>
                        )}
                      </div>

                      <div className="eval-skill-flow-row">
                        <span className="eval-skill-label">
                          Skill: <strong>{evaluation.skillDelta.skill.toUpperCase()}</strong>
                        </span>
                        <span className="eval-skill-score-shift">
                          {evaluation.skillDelta.previousScore !== null
                            ? evaluation.skillDelta.previousScore.toFixed(2)
                            : '0.00'}{' '}
                          →{' '}
                          <strong>
                            {evaluation.skillDelta.newScore !== null
                              ? evaluation.skillDelta.newScore.toFixed(2)
                              : '0.00'}
                          </strong>
                          {evaluation.skillDelta.previousScore !== null &&
                            evaluation.skillDelta.newScore !== null && (
                              <span
                                className={`score-delta-tag ${
                                  evaluation.skillDelta.newScore >=
                                  evaluation.skillDelta.previousScore
                                    ? 'positive'
                                    : 'negative'
                                }`}
                              >
                                {evaluation.skillDelta.newScore >=
                                evaluation.skillDelta.previousScore
                                  ? '+'
                                  : ''}
                                {(
                                  evaluation.skillDelta.newScore -
                                  evaluation.skillDelta.previousScore
                                ).toFixed(2)}
                              </span>
                            )}
                        </span>
                      </div>

                      <div className="eval-skill-current-matrix">
                        <SkillPerformanceBadge
                          item={evaluation.updatedItem || currentItem}
                          compact={true}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    ref={nextBtnRef}
                    type="button"
                    className="btn-next-question"
                    onClick={handleNextQuestion}
                  >
                    {currentIndex + 1 < questions.length
                      ? 'Next Question → (Spacebar)'
                      : 'View Final Summary →'}
                  </button>

                  <button
                    type="button"
                    className="btn-toggle-format-a"
                    onClick={() => setShowFormatA(!showFormatA)}
                    title={
                      showFormatA
                        ? 'Hide word details'
                        : '📖 View word details'
                    }
                  >
                    {showFormatA
                      ? '▲ Collapse word details'
                      : '📖 View word details'}
                  </button>

                  {showFormatA && currentItem.format_a && (
                    <div className="review-format-a-container">
                      <FormatADisplay data={currentItem.format_a} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
