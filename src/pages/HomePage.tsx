import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVocabulary } from '../hooks/useVocabulary';
import { useDailyStreak } from '../hooks/useDailyStreak';
import { useActiveReviewSession } from '../hooks/useActiveReviewSession';
import { reviewDashboardService } from '../core/services/reviewDashboardService';
import { reviewSessionEngine } from '../core/services/reviewSessionEngine';
import { VocabularyItem } from '../core/models/vocabulary';
import { ReviewSessionModal } from '../components/ReviewSessionModal';
import './HomePage.css';

export function HomePage() {
  const { items, recordRetrieval } = useVocabulary();
  const { streak, recordActivity } = useDailyStreak(items);
  const { activeSession, hasActiveSession, clearSession } = useActiveReviewSession();
  const navigate = useNavigate();

  // Categorize items into strictly Overdue and Due (excluding future reviews)
  const { overdueItems, dueItems, totalDueCount } =
    reviewDashboardService.categorizeReviewItems(items);

  // Default review quantity must ALWAYS equal totalDueCount when items are due
  const minAllowed = totalDueCount > 0 ? 1 : 0;
  const defaultQuantity = totalDueCount > 0 ? totalDueCount : 20;

  const [reviewQuantity, setReviewQuantity] = useState<number>(defaultQuantity);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isResumeSession, setIsResumeSession] = useState(false);
  const [activeQueue, setActiveQueue] = useState<VocabularyItem[]>([]);
  const [showPracticeDrawer, setShowPracticeDrawer] = useState(false);
  const [practiceQuantity, setPracticeQuantity] = useState<number>(
    items.length >= 20 ? 20 : Math.max(1, items.length),
  );

  // Sync default quantity: ALWAYS equals totalDueCount
  useEffect(() => {
    if (totalDueCount > 0) {
      setReviewQuantity(totalDueCount);
      reviewDashboardService.setPreferredReviewQuantity(totalDueCount);
    }
  }, [totalDueCount]);

  // Keep practice quantity in bounds
  useEffect(() => {
    if (items.length > 0) {
      setPracticeQuantity((prev) => Math.min(Math.max(1, prev), items.length));
    }
  }, [items.length]);

  // Estimated time calculation:
  // Baseline = 30s per word, displayed estimate = 20% lower (N * 24s)
  // For 20 words = 8 min; for 32 words = 13 min; for 7 words = 3 min
  const activeQuantityForEstimate =
    totalDueCount > 0
      ? Math.max(minAllowed, reviewQuantity)
      : practiceQuantity;
  const estimatedMinutes = reviewDashboardService.calculateEstimatedMinutes(
    activeQuantityForEstimate,
  );

  // Resume existing active review session
  const handleContinueReview = () => {
    setIsResumeSession(true);
    setIsReviewModalOpen(true);
  };

  // Start fresh review queue with priority algorithm via ReviewSessionEngine
  const handleStartReview = () => {
    setIsResumeSession(false);
    const session = reviewSessionEngine.startSession(reviewQuantity);
    if (session && session.serializedQuestions.length > 0) {
      setActiveQueue(session.serializedQuestions.map((q) => q.targetItem));
      setIsReviewModalOpen(true);
      recordActivity();
    }
  };

  // Start practice session anyway when 0 due items
  const handleStartPracticeAnyway = () => {
    if (items.length === 0) {
      navigate('/vocabulary');
      return;
    }
    setIsResumeSession(false);
    const count = Math.max(1, practiceQuantity);
    const session = reviewSessionEngine.startSession(count, { allowNonDue: true });
    if (session && session.serializedQuestions.length > 0) {
      setActiveQueue(session.serializedQuestions.map((q) => q.targetItem));
      setIsReviewModalOpen(true);
      recordActivity();
    }
  };

  // Step quantity by exactly 1 unit
  const handleStepQuantity = (delta: number) => {
    setReviewQuantity((prev) => {
      const next = Math.max(minAllowed, prev + delta);
      reviewDashboardService.setPreferredReviewQuantity(next);
      return next;
    });
  };

  return (
    <div className="home-dashboard-container">
      {hasActiveSession && activeSession ? (
        /* ════════════════════════════════════════════════════════════════
           1. IN-PROGRESS REVIEW SESSION (Mid-Session Exit Resumption)
           ════════════════════════════════════════════════════════════════ */
        <div
          className="review-dashboard-card resume-session-card"
          role="region"
          aria-label="Active Review Session"
        >
          {/* ── Top Header: 🔔 IN PROGRESS ── */}
          <div className="dashboard-top-header">
            <div className="dashboard-title-tag resume-title-tag">
              <span className="dashboard-bell-icon">⏳</span>
              <span>IN PROGRESS</span>
            </div>
          </div>

          {/* ── Streak alongside review count / remaining count ── */}
          <div className="review-count-streak-row">
            <div className="review-total-headline">
              <span className="review-total-number highlight-number">
                {activeSession.totalWords - activeSession.completedCount}
              </span>
              <span className="review-total-label">WORDS REMAINING</span>
            </div>

            <div
              className="review-streak-badge"
              title="Consecutive review days streak"
            >
              <span className="streak-flame-icon">🔥</span>
              <span>{streak}-DAY STREAK</span>
            </div>
          </div>

          {/* ── Today's Progress Bar ── */}
          <div className="resume-progress-section">
            <div className="resume-progress-header">
              <span className="resume-progress-label">Today's Progress</span>
              <span className="resume-progress-count">
                {activeSession.completedCount} / {activeSession.totalWords}
              </span>
            </div>
            <div
              className="resume-progress-track"
              role="progressbar"
              aria-valuenow={activeSession.completedCount}
              aria-valuemin={0}
              aria-valuemax={activeSession.totalWords}
            >
              <div
                className="resume-progress-fill"
                style={{
                  width: `${Math.round(
                    (activeSession.completedCount / activeSession.totalWords) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* ── Estimated Time Row ── */}
          <div className="review-estimated-time">
            <span className="estimated-time-label">Estimated time:</span>
            <span className="estimated-time-val">
              {reviewDashboardService.calculateEstimatedMinutes(
                activeSession.totalWords - activeSession.completedCount,
              )}{' '}
              min
            </span>
            <span className="estimated-time-sub">
              ({activeSession.totalWords - activeSession.completedCount} words remaining)
            </span>
          </div>

          {/* ── Primary Action: [ CONTINUE ] ── */}
          <button
            type="button"
            className="btn-start-review-main btn-continue-review"
            onClick={handleContinueReview}
          >
            CONTINUE
          </button>

          {/* ── Secondary Option: Discard session ── */}
          <button
            type="button"
            className="btn-discard-session"
            onClick={clearSession}
            title="Discard current session and choose a fresh review queue"
          >
            Discard session & start fresh
          </button>
        </div>
      ) : totalDueCount > 0 ? (
        /* ════════════════════════════════════════════════════════════════
           2. ACTIVE REVIEW DASHBOARD (Fiery Hero Card + Controls)
           ════════════════════════════════════════════════════════════════ */
        <div className="review-dashboard-wrapper">
          {/* ── SEPARATE FIERY HERO CARD (Warm red/orange flame theme) ── */}
          <div
            className="review-fire-hero-card"
            onClick={handleStartReview}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStartReview();
              }
            }}
            title="Start review session"
            aria-label={`Review ${reviewQuantity} words due.`}
          >
            {/* Top row: Streak flame badge & Overdue pill (Strictly NO Due pill) */}
            <div className="fire-hero-top-row">
              <div className="fire-hero-flame-badge">
                <span className="fire-hero-flame-icon">🔥</span>
                <span>{streak}-DAY STREAK</span>
              </div>

              {overdueItems.length > 0 && (
                <div
                  className="fire-hero-overdue-pill"
                  title={`${overdueItems.length} words past scheduled review time`}
                >
                  <span className="status-dot">🔴</span>
                  <span className="fire-hero-overdue-count">{overdueItems.length}</span>
                  <span>OVERDUE</span>
                </div>
              )}
            </div>

            {/* Center: Large bold review number with flame decoration */}
            <div className="fire-hero-center-stat">
              <div className="fire-hero-count-wrapper">
                <span className="fire-hero-flame-side">🔥</span>
                <span className="fire-hero-number">{totalDueCount}</span>
                <span className="fire-hero-flame-side">🔥</span>
              </div>
              <span className="fire-hero-label">WORDS TO REVIEW</span>
            </div>
          </div>

          {/* ── REFINED MINIMAL CONTROLS (Neat and organized) ── */}
          <div className="review-dashboard-card review-controls-card">
            {/* Estimated Time Row */}
            <div className="review-estimated-time">
              <span className="estimated-time-label">Estimated time:</span>
              <span className="estimated-time-val">{estimatedMinutes} min</span>
              <span className="estimated-time-sub">
                (for {activeQuantityForEstimate} words)
              </span>
            </div>

            {/* Session Size Selector (Numeric Input, 1-unit step, defaults to totalDueCount) */}
            <div className="session-size-section">
              <label
                htmlFor="session-size-input"
                className="session-size-label"
              >
                How many words do you want to review?
              </label>

              <div className="session-size-controls">
                <button
                  type="button"
                  className="btn-step-qty"
                  onClick={() => handleStepQuantity(-1)}
                  disabled={reviewQuantity <= minAllowed}
                  aria-label="Decrease 1 word"
                >
                  −
                </button>

                <div className="session-size-input-wrapper">
                  <input
                    id="session-size-input"
                    type="number"
                    className="session-size-input"
                    min={minAllowed}
                    value={reviewQuantity}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      if (!isNaN(parsed)) {
                        setReviewQuantity(parsed);
                      } else {
                        setReviewQuantity(minAllowed);
                      }
                    }}
                    onBlur={() => {
                      if (reviewQuantity < minAllowed) {
                        setReviewQuantity(minAllowed);
                      }
                    }}
                    aria-describedby="session-size-hint"
                  />
                </div>

                <button
                  type="button"
                  className="btn-step-qty"
                  onClick={() => handleStepQuantity(1)}
                  aria-label="Increase 1 word"
                >
                  +
                </button>
              </div>

              <span id="session-size-hint" className="session-size-hint">
                Default: {totalDueCount} words • 1-unit step
              </span>

              {/* Quick Chips */}
              <div className="session-quick-chips">
                <button
                  type="button"
                  className={`quick-chip ${reviewQuantity === totalDueCount ? 'active' : ''}`}
                  onClick={() => setReviewQuantity(totalDueCount)}
                >
                  All ({totalDueCount})
                </button>
                {totalDueCount > 10 && (
                  <button
                    type="button"
                    className={`quick-chip ${reviewQuantity === 10 ? 'active' : ''}`}
                    onClick={() => setReviewQuantity(10)}
                  >
                    10 words
                  </button>
                )}
                {totalDueCount > 20 && (
                  <button
                    type="button"
                    className={`quick-chip ${reviewQuantity === 20 ? 'active' : ''}`}
                    onClick={() => setReviewQuantity(20)}
                  >
                    20 words
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════
           3. ALL CAUGHT UP VIEW (When there are 0 Overdue / Due items)
           ════════════════════════════════════════════════════════════════ */
        <div className="all-caught-up-card" role="region" aria-label="All Caught Up">
          <div className="all-caught-up-icon-circle">
            <span>✓</span>
          </div>

          <div className="all-caught-up-streak-box">
            <div className="review-streak-badge">
              <span className="streak-flame-icon">🔥</span>
              <span>{streak}-DAY STREAK</span>
            </div>
          </div>

          <h2 className="all-caught-up-title">ALL CAUGHT UP</h2>
          <p className="all-caught-up-sub">No words are due for review.</p>

          {/* Optional Practice Drawer */}
          {showPracticeDrawer ? (
            <div className="practice-drawer">
              {items.length > 0 ? (
                <>
                  <label
                    htmlFor="practice-quantity-input"
                    className="session-size-label"
                  >
                    Number of words to practice:
                  </label>
                  <div className="session-size-controls">
                    <button
                      type="button"
                      className="btn-step-qty"
                      onClick={() => setPracticeQuantity((prev) => Math.max(1, prev - 1))}
                      disabled={practiceQuantity <= 1}
                      aria-label="Decrease 1 word"
                    >
                      −
                    </button>
                    <div className="session-size-input-wrapper">
                      <input
                        id="practice-quantity-input"
                        type="number"
                        className="session-size-input"
                        min={1}
                        max={items.length}
                        value={practiceQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setPracticeQuantity(val);
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-step-qty"
                      onClick={() => setPracticeQuantity((prev) => Math.min(items.length, prev + 1))}
                      disabled={practiceQuantity >= items.length}
                      aria-label="Increase 1 word"
                    >
                      +
                    </button>
                  </div>
                  <span className="session-size-hint">
                    Estimated time: {estimatedMinutes} min
                  </span>
                  <button
                    type="button"
                    className="btn-start-review-main"
                    onClick={handleStartPracticeAnyway}
                  >
                    START PRACTICE
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                    No vocabulary in list yet. Add new words to start learning!
                  </p>
                  <button
                    type="button"
                    className="btn-start-review-main"
                    onClick={() => navigate('/vocabulary')}
                  >
                    + ADD NEW WORD
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn-practice-anyway"
              onClick={() => setShowPracticeDrawer(true)}
            >
              PRACTICE ANYWAY
            </button>
          )}
        </div>
      )}

      {/* ── Review Session Modal ── */}
      <ReviewSessionModal
        queue={activeQueue}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onRecordRetrieval={recordRetrieval}
        resumeSession={isResumeSession}
      />
    </div>
  );
}
