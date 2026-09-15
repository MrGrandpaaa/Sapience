import { useState } from 'react';
import { VocabularyItem, VocabLevel } from '../core/models/vocabulary';
import { Gender, PartOfSpeech } from '../core/models/types';
import { NOUN_GENDER_NOTATION } from '../core/models/lexical';
import {
  getCardPresentationTitle,
  cleanNounLemma,
  isNounSharedForm,
  stripAccents,
} from '../core/services/nounPresentationService';
import {
  MemoryLevel,
  RetrievalEvaluationInput,
} from '../core/models/srs';
import { srsEngineService } from '../core/services/srsEngineService';
import { reviewPriorityService } from '../core/services/reviewPriorityService';
import { FormatADisplay } from './FormatADisplay';
import { AudioSpeakerButton } from './AudioSpeakerButton';
import { ReviewSessionModal } from './ReviewSessionModal';
import { SkillPerformanceBadge } from './SkillPerformanceBadge';
import './MasterVocabList.css';

interface MasterVocabListProps {
  items: VocabularyItem[];
  onUpdateLevel: (id: string, level: VocabLevel) => void;
  onDelete: (id: string) => void;
  onRecordRetrieval?: (id: string, input: RetrievalEvaluationInput) => void;
}

type FilterOption = 'all' | 'due' | MemoryLevel;

export function MasterVocabList({
  items,
  onUpdateLevel,
  onDelete,
  onRecordRetrieval,
}: MasterVocabListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [viewingItem, setViewingItem] = useState<VocabularyItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<VocabularyItem | null>(null);

  // Review Queue state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewBatchSize, setReviewBatchSize] = useState<number>(10);
  const [activeQueue, setActiveQueue] = useState<VocabularyItem[]>([]);

  // Due items list
  const dueItems = items.filter((it) =>
    srsEngineService.isDue(it.next_review_at || ''),
  );

  // Filter items by Level / Due state and search keyword
  const filteredItems = items.filter((item) => {
    // Due filter
    if (activeFilter === 'due') {
      if (!srsEngineService.isDue(item.next_review_at || '')) {
        return false;
      }
    } else if (activeFilter !== 'all' && item.level !== activeFilter) {
      return false;
    }

    // Text search query (§11: élève, un élève, une élève all match the same canonical item)
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      const cleanQ = cleanNounLemma(q).toLowerCase();
      const noAccentQ = stripAccents(cleanQ || q);

      const checkMatch = (target?: string) => {
        if (!target) return false;
        const t = target.toLowerCase();
        if (t.includes(q) || (cleanQ && t.includes(cleanQ))) return true;
        if (noAccentQ && stripAccents(t).includes(noAccentQ)) return true;
        return false;
      };

      const matchSurface = checkMatch(item.surface_form);
      const matchVi = checkMatch(item.format_a?.meaning_vi);
      const matchEn = checkMatch(item.format_a?.meaning_en);
      const nounGrammar = item.format_a?.grammar as any;
      const matchLemma = checkMatch(nounGrammar?.lemma);
      const matchMasc = checkMatch(nounGrammar?.masculine_form?.lemma || nounGrammar?.forms?.masculine);
      const matchFem = checkMatch(nounGrammar?.feminine_form?.lemma || nounGrammar?.forms?.feminine);
      return matchSurface || matchVi || matchEn || matchLemma || matchMasc || matchFem;
    }

    return true;
  });

  // Calculate counts per level and due
  const counts = {
    all: items.length,
    due: dueItems.length,
    0: items.filter((it) => it.level === 0).length,
    1: items.filter((it) => it.level === 1).length,
    2: items.filter((it) => it.level === 2).length,
    3: items.filter((it) => it.level === 3).length,
    4: items.filter((it) => it.level === 4).length,
    5: items.filter((it) => it.level === 5).length,
  };

  const handleConfirmDelete = () => {
    if (deletingItem) {
      onDelete(deletingItem.id);
      setDeletingItem(null);
    }
  };

  // Launch review session with priority queue
  const handleStartReviewQueue = (batchCount: number) => {
    const queue = reviewPriorityService.buildReviewQueue(items, batchCount);
    if (queue.length > 0) {
      setActiveQueue(queue);
      setIsReviewModalOpen(true);
    }
  };

  return (
    <section className="master-vocab-container" aria-label="Master Vocabulary List">
      {/* ── SRS REVIEW QUEUE BANNER (When items need review) ── */}
      {items.length > 0 && (
        <div className="srs-queue-banner">
          <div className="queue-banner-left">
            <span className="queue-banner-icon">⚡</span>
            <div className="queue-banner-text">
              <strong className="queue-banner-title">
                {counts.due > 0
                  ? `${counts.due} vocabulary items due for review`
                  : 'Ready to reinforce memory'}
              </strong>
              <span className="queue-banner-sub">
                Priority algorithm: Overdue duration → Error rate → Weak skill → Last retrieval interval
              </span>
            </div>
          </div>

          <div className="queue-banner-actions">
            <div className="queue-batch-selector" title="Choose number of words for review queue">
              <button
                type="button"
                className={`btn-batch-opt ${reviewBatchSize === 5 ? 'active' : ''}`}
                onClick={() => setReviewBatchSize(5)}
              >
                5 words
              </button>
              <button
                type="button"
                className={`btn-batch-opt ${reviewBatchSize === 10 ? 'active' : ''}`}
                onClick={() => setReviewBatchSize(10)}
              >
                10 words
              </button>
              <button
                type="button"
                className={`btn-batch-opt ${reviewBatchSize === 20 ? 'active' : ''}`}
                onClick={() => setReviewBatchSize(20)}
              >
                20 words
              </button>
              {counts.due > 0 && (
                <button
                  type="button"
                  className={`btn-batch-opt ${reviewBatchSize === counts.due ? 'active' : ''}`}
                  onClick={() => setReviewBatchSize(counts.due)}
                >
                  All ({counts.due})
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn-start-queue-review"
              onClick={() => handleStartReviewQueue(reviewBatchSize)}
            >
              ▶ Start Review ({Math.min(reviewBatchSize, items.length)} words)
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER & LEVEL TABS (Simplified: Only "Level X") ── */}
      <div className="master-vocab-toolbar">
        <div className="master-vocab-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'all'}
            className={`master-vocab-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All <span className="tab-count">{counts.all}</span>
          </button>

          {/* Tab Due */}
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'due'}
            className={`master-vocab-tab tab-due ${activeFilter === 'due' ? 'active' : ''} ${
              counts.due > 0 ? 'has-due' : ''
            }`}
            onClick={() => setActiveFilter('due')}
          >
            ⚡ Due for review <span className="tab-count tab-count--due">{counts.due}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 0}
            className={`master-vocab-tab level-tab--0 ${activeFilter === 0 ? 'active' : ''}`}
            onClick={() => setActiveFilter(0)}
          >
            Level 0 <span className="tab-count">{counts[0]}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 1}
            className={`master-vocab-tab level-tab--1 ${activeFilter === 1 ? 'active' : ''}`}
            onClick={() => setActiveFilter(1)}
          >
            Level 1 <span className="tab-count">{counts[1]}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 2}
            className={`master-vocab-tab level-tab--2 ${activeFilter === 2 ? 'active' : ''}`}
            onClick={() => setActiveFilter(2)}
          >
            Level 2 <span className="tab-count">{counts[2]}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 3}
            className={`master-vocab-tab level-tab--3 ${activeFilter === 3 ? 'active' : ''}`}
            onClick={() => setActiveFilter(3)}
          >
            Level 3 <span className="tab-count">{counts[3]}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 4}
            className={`master-vocab-tab level-tab--4 ${activeFilter === 4 ? 'active' : ''}`}
            onClick={() => setActiveFilter(4)}
          >
            Level 4 <span className="tab-count">{counts[4]}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 5}
            className={`master-vocab-tab level-tab--5 ${activeFilter === 5 ? 'active' : ''}`}
            onClick={() => setActiveFilter(5)}
          >
            Level 5 <span className="tab-count">{counts[5]}</span>
          </button>
        </div>

        {/* Quick filter input if list has items */}
        {items.length > 3 && (
          <div className="master-vocab-quick-filter">
            <input
              type="text"
              className="quick-filter-input"
              placeholder="Filter in list..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
            {filterSearch && (
              <button
                type="button"
                className="quick-filter-clear"
                onClick={() => setFilterSearch('')}
                aria-label="Clear filter"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── CONTENT AREA ── */}
      {items.length === 0 ? (
        // Case 1: Total empty
        <div className="master-vocab-empty">
          <div className="empty-icon">📚</div>
          <h3 className="empty-title">No vocabulary in list yet</h3>
          <p className="empty-desc">
            Your Master Vocabulary List is currently empty. Click{' '}
            <strong>« Add Vocabulary »</strong> above to start learning and tracking SRS memory states.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        // Case 2: Filter matched nothing
        <div className="master-vocab-empty">
          <div className="empty-icon">🔍</div>
          <h3 className="empty-title">
            {filterSearch.trim() ? 'Từ chưa được lưu' : 'No matching vocabulary found'}
          </h3>
          <p className="empty-desc">
            {filterSearch.trim()
              ? 'Không có từ vựng tương đồng trong danh sách đã lưu.'
              : activeFilter === 'due'
              ? 'All vocabulary items are up to date! No overdue items.'
              : activeFilter !== 'all'
              ? `No vocabulary items at Level ${activeFilter}.`
              : 'No words match your selected filter.'}
          </p>
          <button
            type="button"
            className="btn-reset-filters"
            onClick={() => {
              setActiveFilter('all');
              setFilterSearch('');
            }}
          >
            View all words ({counts.all})
          </button>
        </div>
      ) : (
        // Case 3: List of cards
        <div className="master-vocab-grid">
          {filteredItems.map((item) => {
            const isNoun = item.part_of_speech === PartOfSpeech.Noun;
            const nounGender =
              item.gender || (item.format_a?.grammar as any)?.gender;
            const isShared = isNounSharedForm(item);
            const nounNotation = !isNoun
              ? ''
              : isShared || nounGender === Gender.Both
              ? NOUN_GENDER_NOTATION[Gender.Both]
              : nounGender === Gender.Masculine
              ? NOUN_GENDER_NOTATION[Gender.Masculine]
              : nounGender === Gender.Feminine
              ? NOUN_GENDER_NOTATION[Gender.Feminine]
              : '';

            // Card presentation with article for nouns
            const cleanDisplayWord = getCardPresentationTitle(item);

            const srsStatus = srsEngineService.formatTimeRemaining(
              item.next_review_at || '',
            );

            return (
              <div key={item.id} className="master-vocab-card">
                {/* ── 1. Top row: Level on the left, Speaker on the top-right corner ── */}
                <div className="vocab-card-top-bar">
                  <span className={`vocab-level-badge level-${item.level}`}>
                    Level {item.level}
                  </span>

                  {/* Speaker button on top right of card */}
                  <AudioSpeakerButton
                    item={item}
                    size="md"
                    title={`Listen to pronunciation: ${cleanDisplayWord}`}
                  />
                </div>

                {/* ── 2. Word row ── */}
                <div className="vocab-card-word-row">
                  <span
                    className="vocab-word-main"
                    onClick={() => setViewingItem(item)}
                    title="Click to view full details"
                    style={{ cursor: 'pointer' }}
                  >
                    {cleanDisplayWord}
                  </span>

                  {/* Notation tag next to noun */}
                  {isNoun && nounNotation && (
                    <span
                      className="vocab-noun-notation-tag"
                      title={`Noun: ${nounGender === Gender.Masculine ? 'Masculine' : 'Feminine'}`}
                    >
                      {nounNotation}
                    </span>
                  )}
                </div>

                {/* ── SRS Status Bar ── */}
                <div className="vocab-srs-status-bar">
                  <div className="srs-timing-group">
                    {srsStatus.isDue ? (
                      <span className="srs-due-badge">🔴 Due for review now</span>
                    ) : (
                      <span className="srs-next-badge">⏱ {srsStatus.text}</span>
                    )}
                  </div>

                  <div className="srs-streak-group">
                    {(item.current_streak ?? 0) > 0 && (
                      <span
                        className="srs-streak-badge"
                        title="Consecutive retrieval streak"
                      >
                        🔥 {item.current_streak}
                      </span>
                    )}
                    <span
                      className="srs-review-count"
                      title={`Reviewed: ${item.review_count || 0} times`}
                    >
                      Reviewed: {item.review_count || 0}x
                    </span>
                  </div>
                </div>

                {/* ── Card Meanings ── */}
                <div className="vocab-card-meanings">
                  <div className="vocab-meaning-row vi">
                    <span className="meaning-flag">🇻🇳</span>
                    <span className="meaning-text">
                      {item.format_a?.meaning_vi || 'Not updated'}
                    </span>
                  </div>
                  {item.format_a?.meaning_en && (
                    <div className="vocab-meaning-row en">
                      <span className="meaning-flag">🇬🇧</span>
                      <span className="meaning-text">
                        {item.format_a.meaning_en}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Noun Collocations preview (if available) ── */}
                {isNoun &&
                  item.format_a?.collocations &&
                  item.format_a.collocations.length > 0 && (
                    <div className="vocab-card-collocations">
                      <span className="collocations-title">Common collocations:</span>
                      <ul className="collocations-preview-list">
                        {item.format_a.collocations.slice(0, 2).map((col, cIdx) => (
                          <li key={cIdx} className="collocation-preview-item">
                            • {col}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* ── Example sentence preview (if available) ── */}
                {item.format_a?.example?.french && (
                  <div className="vocab-card-example">
                    <div className="example-text-row">
                      <span className="example-quote">
                        « {item.format_a.example.french} »
                      </span>
                      <AudioSpeakerButton
                        text={item.format_a.example.french}
                        size="sm"
                        title="Listen to example"
                        isExample
                      />
                    </div>
                    {item.format_a.example.vietnamese && (
                      <span className="example-translation">
                        {item.format_a.example.vietnamese}
                      </span>
                    )}
                  </div>
                )}

                {/* ── Granular Skill Performance Tracking Matrix ── */}
                <SkillPerformanceBadge item={item} compact={true} />

                {/* ── Interactive Retrieval Practice Bar ── */}
                {onRecordRetrieval && (
                  <div className="vocab-retrieval-bar">
                    <span className="retrieval-label">Review:</span>
                    <div className="retrieval-btn-group">
                      <button
                        type="button"
                        className="btn-retrieval btn-retrieval--success"
                        title="Retrieved accurately -> Advance memory level"
                        onClick={() =>
                          onRecordRetrieval(item.id, { result: 'success' })
                        }
                      >
                        ✓ Remembered
                      </button>
                      <button
                        type="button"
                        className="btn-retrieval btn-retrieval--borderline"
                        title="Correct but hesitant / slow -> Maintain level"
                        onClick={() =>
                          onRecordRetrieval(item.id, { result: 'borderline' })
                        }
                      >
                        ~ Hesitant
                      </button>
                      <button
                        type="button"
                        className="btn-retrieval btn-retrieval--failure"
                        title="Forgot or incorrect -> Drop level and reschedule sooner"
                        onClick={() =>
                          onRecordRetrieval(item.id, {
                            result: 'failure',
                            failureSeverity: 'mild',
                          })
                        }
                      >
                        ✗ Forgot
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Card Controls / Actions ── */}
                <div className="vocab-card-footer">
                  <div className="vocab-level-control">
                    <label
                      htmlFor={`level-select-${item.id}`}
                      className="level-control-label"
                    >
                      Level:
                    </label>
                    <select
                      id={`level-select-${item.id}`}
                      className="level-control-select"
                      value={item.level}
                      onChange={(e) =>
                        onUpdateLevel(
                          item.id,
                          Number(e.target.value) as VocabLevel,
                        )
                      }
                      title="Change SRS level"
                    >
                      <option value={0}>Level 0</option>
                      <option value={1}>Level 1</option>
                      <option value={2}>Level 2</option>
                      <option value={3}>Level 3</option>
                      <option value={4}>Level 4</option>
                      <option value={5}>Level 5</option>
                    </select>
                  </div>

                  <div className="vocab-card-btn-group">
                    <button
                      type="button"
                      className="btn-delete-vocab"
                      onClick={() => setDeletingItem(item)}
                      title="Delete this vocabulary item"
                      aria-label="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: VIEW FULL DETAILS
          ══════════════════════════════════════════════════════════════════ */}
      {viewingItem && viewingItem.format_a && (
        <div className="modal-overlay" onClick={() => setViewingItem(null)}>
          <div
            className="modal-card modal-card--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">{getCardPresentationTitle(viewingItem)}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setViewingItem(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <SkillPerformanceBadge item={viewingItem} compact={false} />
              </div>
              <div className="format-a-preview-scroll">
                <FormatADisplay data={viewingItem.format_a} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: REVIEW PRIORITY QUEUE SESSION
          ══════════════════════════════════════════════════════════════════ */}
      <ReviewSessionModal
        queue={activeQueue}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onRecordRetrieval={onRecordRetrieval || (() => {})}
      />

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: CONFIRM DELETE
          ══════════════════════════════════════════════════════════════════ */}
      {deletingItem && (
        <div className="modal-overlay" onClick={() => setDeletingItem(null)}>
          <div
            className="modal-card modal-card--confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Confirm Delete Vocabulary</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeletingItem(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="delete-confirm-text">
                Are you sure you want to delete{' '}
                <strong>« {deletingItem.surface_form} »</strong> from your Master
                Vocabulary List?
              </p>
              <p className="delete-confirm-subtext">
                This action will remove the item and update your dashboard statistics.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setDeletingItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-delete-confirm"
                  onClick={handleConfirmDelete}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TrashIcon() {
  return (
    <svg
      className="trash-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
