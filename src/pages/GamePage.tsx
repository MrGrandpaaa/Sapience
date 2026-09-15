import { useState } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import {
  GameType,
  REVIEW_GAMES_META,
  GameQuestion,
} from '../core/models/games';
import { gameApplicabilityService } from '../core/services/games/gameApplicabilityService';
import { reviewSessionEngine } from '../core/services/reviewSessionEngine';
import { reviewDashboardService } from '../core/services/reviewDashboardService';
import { GameShell } from '../components/games/GameShell';
import './GamePage.css';

export function GamePage() {
  const { items, dueItems } = useVocabulary();

  const [activeSessionQuestions, setActiveSessionQuestions] = useState<GameQuestion[] | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'due'>(dueItems.length > 0 ? 'due' : 'all');
  const [activeGameType, setActiveGameType] = useState<GameType | 'mixed' | null>(null);
  const [sessionKey, setSessionKey] = useState<number>(0);

  // Single source of truth for review batch size from Home page
  const preferredBatchSize = reviewDashboardService.getPreferredReviewQuantity();

  // Evaluate live Cloze unlock status from actual SRS memory state:
  // Requires at least 5 saved items at Level 1 or higher (Level 0 does not count).
  const clozeUnlock = gameApplicabilityService.getClozeUnlockStatus(items);

  // If filter is 'due' but no items are due, allow practicing anyway with saved items
  const isPracticeAnywayMode = dueItems.length === 0 || selectedFilter === 'all';

  const handleStartGame = (gameType: GameType | 'mixed') => {
    setActiveGameType(gameType);
    const session = reviewSessionEngine.startSession(10, {
      customGameType: gameType === 'mixed' ? undefined : gameType,
      allowNonDue: true, // Guarantees up to 10 items via Extra Practice if due items < 10
    });
    if (session && session.serializedQuestions.length > 0) {
      setActiveSessionQuestions(session.serializedQuestions);
      setSessionKey((prev) => prev + 1);
    }
  };

  const handlePracticeAgain = () => {
    if (activeGameType) {
      handleStartGame(activeGameType);
    }
  };

  // When a review session finishes, conclude it cleanly via ReviewSessionEngine.
  const handleFinishSession = () => {
    reviewSessionEngine.concludeSession();
    setActiveSessionQuestions(null);
    setActiveGameType(null);
  };

  const handleExitGame = () => {
    reviewSessionEngine.concludeSession();
    setActiveSessionQuestions(null);
    setActiveGameType(null);
  };

  // If currently in an active game session
  if (activeSessionQuestions) {
    return (
      <div className="page game-page-active">
        <GameShell
          key={sessionKey}
          questions={activeSessionQuestions}
          onFinishSession={handleFinishSession}
          onExitGame={handleExitGame}
          onPracticeAgain={handlePracticeAgain}
        />
      </div>
    );
  }

  return (
    <div className="page game-hub-page">
      {/* ── Page Header ── */}
      <header className="game-hub-header">
        <div className="hub-title-group">
          <h1 className="hub-main-title">Review Game</h1>
        </div>

        {/* ── Minimalist Vocabulary Pool Bar (Only Vocabulary Pool Filter) ── */}
        <div className="hub-config-bar">
          <div className="config-group">
            <span className="config-label">Vocabulary pool:</span>
            <div className="filter-pill-group">
              <button
                type="button"
                className={`btn-filter-pill ${selectedFilter === 'due' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('due')}
              >
                ⚡ Due for review ({dueItems.length})
              </button>
              <button
                type="button"
                className={`btn-filter-pill ${selectedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('all')}
              >
                {dueItems.length === 0 ? `Practice Anyway (All ${items.length})` : `All words (${items.length})`}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Featured Mode: Adaptive Algorithm-Driven Game Selection / Practice Anyway ── */}
      <section className={`mixed-mode-banner ${isPracticeAnywayMode ? 'banner--practice-anyway' : ''}`}>
        <div className="mixed-mode-content">
          <div className="mixed-mode-icon">
            {isPracticeAnywayMode ? '✨' : '🎯'}
          </div>
          <div className="mixed-mode-text">
            <h3 className="mixed-mode-title">
              {isPracticeAnywayMode ? 'Practice Anyway — Adaptive Mode' : 'Adaptive Review Engine'}
            </h3>
            <p className="mixed-mode-desc">
              {isPracticeAnywayMode ? (
                <>
                  Practice anytime with your saved words. The algorithm adaptively
                  chooses the optimal game for each item based on your memory strengths and weaknesses.
                </>
              ) : (
                <>
                  Algorithm automatically selects the optimal game for each item based on 4 criteria:
                  (1) Weak skills / previous errors • (2) Untested skills •
                  (3) SRS Memory Level (Low: basic + high support; High: contextual + minimal support) •
                  (4) Lexical properties (inapplicable games are skipped).
                </>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-launch-mixed"
          onClick={() => handleStartGame('mixed')}
          disabled={items.length === 0}
        >
          Start
        </button>
      </section>

      {/* ── 6 Games Grid (Minimalist: Title on top, large logo below, clickable card, distinct backgrounds) ── */}
      <section className="core-games-grid-section">
        <div className="core-games-grid">
          {(Object.keys(REVIEW_GAMES_META) as GameType[]).map((gameKey) => {
            const game = REVIEW_GAMES_META[gameKey];
            const isCloze = gameKey === 'cloze';
            const isLocked = isCloze && !clozeUnlock.isUnlocked;

            return (
              <div
                key={gameKey}
                className={`game-module-card game-card--${gameKey} ${isLocked ? 'game-card--locked' : ''}`}
                onClick={() => {
                  if (isLocked) {
                    alert(clozeUnlock.lockMessage);
                    return;
                  }
                  handleStartGame(gameKey);
                }}
                role="button"
                tabIndex={0}
                aria-disabled={isLocked}
                title={isLocked ? clozeUnlock.lockMessage : `Start ${game.shortTitle}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isLocked) handleStartGame(gameKey);
                  }
                }}
              >
                {/* Title on top */}
                <div className="game-card-top-title-area">
                  <h2 className="game-card-main-title">{game.shortTitle}</h2>
                </div>

                {/* Logo / Icon below */}
                <div className="game-card-bottom-logo-area">
                  <span className="game-card-large-logo" role="img" aria-label={game.shortTitle}>
                    {isLocked ? '🔒' : game.icon}
                  </span>
                  {isLocked && (
                    <span className="game-card-locked-subtext">
                      🔒 {clozeUnlock.progressText} Level 1+
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
