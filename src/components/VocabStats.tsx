import { VocabularyStatistics } from '../core/models/vocabulary';
import './VocabStats.css';

interface VocabStatsProps {
  stats: VocabularyStatistics;
  selectedLevel?: 'total' | number | null;
  onSelectLevel?: (level: 'total' | number | null) => void;
}

/**
 * Vocabulary statistics banner positioned at the top of the Vocabulary page.
 *
 * Structure:
 * ┌──────────────┬──────────────────────┬──────────────┐
 * │              │ Level 1 │ Level 2    │              │
 * │    TOTAL     │─────────┼────────────│   LEVEL 5    │
 * │              │ Level 3 │ Level 4    │  (Mastery)   │
 * └──────────────┴──────────────────────┴──────────────┘
 *
 * - Part 1 (Left): TOTAL (single cell, full height)
 * - Part 2 (Middle): LEVEL 1–4 (exact 2×2 grid)
 * - Part 3 (Right): LEVEL 5 (separate column, full height, directly attached
 *   with no gutter to the 2×2 block, maximum visual prominence).
 *
 * Interactive: Clicking any cell filters the vocabulary list below.
 * Layout & design remain 100% untouched without additional buttons.
 */
export function VocabStats({ stats, selectedLevel, onSelectLevel }: VocabStatsProps) {
  const isTotalSelected =
    selectedLevel === 'total' || selectedLevel === null || selectedLevel === undefined;

  const handleLevelClick = (lvl: 'total' | number) => {
    if (!onSelectLevel) return;
    if (lvl === 'total') {
      onSelectLevel('total');
    } else if (selectedLevel === lvl) {
      // Clicking active level toggles back to total
      onSelectLevel('total');
    } else {
      onSelectLevel(lvl);
    }
  };

  return (
    <div className="vocab-stats-bar" aria-label="Vocabulary Statistics">
      {/* ── PHẦN 1: TOTAL (Ngoài cùng bên trái, full height) ───────────── */}
      <div
        className={`vocab-stat-panel vocab-stat-panel--total ${isTotalSelected ? 'is-selected' : ''}`}
        onClick={() => handleLevelClick('total')}
        role="button"
        tabIndex={0}
        title="Click to show all vocabulary items"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLevelClick('total')}
      >
        <span className="vocab-stat-label">TOTAL</span>
        <span className="vocab-stat-number vocab-stat-number--total">
          {stats.total}
        </span>
      </div>

      {/* ── PHẦN 2: LEVEL 1–4 (Khối ở giữa, chia chính xác 2×2) ────────── */}
      <div className="vocab-stat-grid-2x2">
        <div
          className={`vocab-level-cell vocab-level-cell--1 ${selectedLevel === 1 ? 'is-selected' : ''}`}
          onClick={() => handleLevelClick(1)}
          role="button"
          tabIndex={0}
          title="Click to show Level 1 items"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLevelClick(1)}
        >
          <span className="vocab-level-label">LEVEL 1</span>
          <span className="vocab-level-number">{stats.level1}</span>
        </div>
        <div
          className={`vocab-level-cell vocab-level-cell--2 ${selectedLevel === 2 ? 'is-selected' : ''}`}
          onClick={() => handleLevelClick(2)}
          role="button"
          tabIndex={0}
          title="Click to show Level 2 items"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLevelClick(2)}
        >
          <span className="vocab-level-label">LEVEL 2</span>
          <span className="vocab-level-number">{stats.level2}</span>
        </div>
        <div
          className={`vocab-level-cell vocab-level-cell--3 ${selectedLevel === 3 ? 'is-selected' : ''}`}
          onClick={() => handleLevelClick(3)}
          role="button"
          tabIndex={0}
          title="Click to show Level 3 items"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLevelClick(3)}
        >
          <span className="vocab-level-label">LEVEL 3</span>
          <span className="vocab-level-number">{stats.level3}</span>
        </div>
        <div
          className={`vocab-level-cell vocab-level-cell--4 ${selectedLevel === 4 ? 'is-selected' : ''}`}
          onClick={() => handleLevelClick(4)}
          role="button"
          tabIndex={0}
          title="Click to show Level 4 items"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLevelClick(4)}
        >
          <span className="vocab-level-label">LEVEL 4</span>
          <span className="vocab-level-number">{stats.level4}</span>
        </div>
      </div>

      {/* ── PHẦN 3: LEVEL 5 (Cột riêng ngoài cùng bên phải, dính trực tiếp vào 2×2) ── */}
      <div
        className={`vocab-stat-panel vocab-stat-panel--level5 ${selectedLevel === 5 ? 'is-selected' : ''}`}
        onClick={() => handleLevelClick(5)}
        role="button"
        tabIndex={0}
        title="Click to show Level 5 items"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLevelClick(5)}
      >
        <div className="vocab-level5-header">
          <span className="vocab-level-label vocab-level-label--mastery">
            LEVEL 5
          </span>
          <span className="vocab-mastery-badge">★ Mastery</span>
        </div>
        <span className="vocab-stat-number vocab-stat-number--level5">
          {stats.level5}
        </span>
      </div>
    </div>
  );
}
