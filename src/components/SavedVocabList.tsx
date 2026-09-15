import { useState, useMemo, useEffect } from 'react';
import { VocabularyItem } from '../core/models/vocabulary';
import { PartOfSpeech, Gender, AdjectivePosition } from '../core/models/types';
import { NOUN_GENDER_NOTATION, ADJECTIVE_POSITION_DISPLAY, FormatAAdjectiveGrammar } from '../core/models/lexical';
import { getCardPresentationTitle, getNounForms, isNounSharedForm, cleanNounLemma, stripAccents } from '../core/services/nounPresentationService';
import { getAdjectiveForms, AdjectiveFormsResult } from '../core/services/adjectivePresentationService';
import { AudioSpeakerButton } from './AudioSpeakerButton';
import { FormatADisplay } from './FormatADisplay';
import './SavedVocabList.css';

/**
 * Formats SRS live countdown strictly per specification:
 * - Order: day, hour, minute, second
 * - If days > 0: only show number of days with unit, e.g. "3d"
 * - If < 1 day and hours > 0: only show hours and minutes with units, e.g. "5h 20m"
 * - If < 1 hour: only show minutes and seconds with units, e.g. "14m 32s"
 * - If elapsed or due now: "now"
 * - Strictly no explanations, clear units after each number.
 */
function formatCountdown(nextReviewAt?: Date | string | null, nowMs: number = Date.now()): string {
  if (!nextReviewAt) return 'now';
  const targetMs = new Date(nextReviewAt).getTime();
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return 'now';

  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  if (days > 0) {
    return `${days}d`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

/**
 * Cleans POS annotations from meanings (e.g. (n), (v), (adj), [noun], etc.)
 */
function cleanMeaning(text?: string): string {
  if (!text) return '';
  return text
    .replace(/^\s*(\((?:n|v|adj|adv|noun|verb|adjective|mas|fem)\)|\[(?:n|v|adj|adv|noun|verb|adjective|mas|fem)\])\s*/gi, '')
    .replace(/\s*(\((?:n|v|adj|adv|noun|verb|adjective|mas|fem)\)|\[(?:n|v|adj|adv|noun|verb|adjective|mas|fem)\])\s*$/gi, '')
    .trim();
}

/**
 * Renders the front-of-card title for Adjectives per specifications:
 * - Trước nom: 2 rows (masculin on top, féminin on bottom) with "+ N" vertically centered.
 *   If masculin === féminin, 1 single word in center with "+ N".
 * - Sau nom: 2 rows with "N +" vertically centered on the left.
 *   If masculin === féminin, 1 single word in center with "N +".
 * - Trước và sau nom: 2 rows with "+ N" (or 1 word if identical).
 */
/**
 * Renders the front-of-card title for Nouns per specifications:
 * - Shared form (masculine === feminine, e.g. "élève"):
 *   1 single word + 1 speaker button + "(n, mas - fem)"
 * - Different forms (masculine !== feminine, e.g. "acteur / actrice"):
 *   acteur 🔊 (n, mas) → actrice 🔊 (n, fem)
 *   (each word has its own speaker button right beside it!)
 * - Single gender noun (e.g. "livre" or "voiture"):
 *   1 word + 1 speaker button + "(n, mas)" or "(n, fem)"
 */
function renderNounFrontTitle(item: VocabularyItem) {
  const forms = getNounForms(item);

  // Case 1: Dual forms with different spelling (e.g. acteur (n, mas) → actrice (n, fem))
  if (forms.isDual && !forms.isShared) {
    return (
      <div className="noun-front-title-container noun-front-title--different">
        <div className="noun-form-item-group">
          <span className="noun-form-word">{forms.masculine}</span>
          <AudioSpeakerButton text={forms.masculineAudioText} size="sm" title={`Listen: ${forms.masculineAudioText}`} />
          <span className="noun-gender-tag">(n, mas)</span>
        </div>
        <span className="noun-arrow-divider">→</span>
        <div className="noun-form-item-group">
          <span className="noun-form-word">{forms.feminine}</span>
          <AudioSpeakerButton text={forms.feminineAudioText} size="sm" title={`Listen: ${forms.feminineAudioText}`} />
          <span className="noun-gender-tag">(n, fem)</span>
        </div>
      </div>
    );
  }

  // Case 2: Dual forms with shared spelling (e.g. élève (n, mas - fem))
  if (forms.isShared) {
    return (
      <div className="noun-front-title-container noun-front-title--shared">
        <div className="noun-form-item-group">
          <h3 className="saved-vocab-word">{forms.lemma}</h3>
          <AudioSpeakerButton text={forms.sharedAudioText} size="sm" title={`Listen: ${forms.sharedAudioText}`} />
        </div>
        <span className="noun-gender-tag-shared">(n, mas - fem)</span>
      </div>
    );
  }

  // Case 3: Single gender noun (e.g. livre or voiture)
  return (
    <div className="noun-front-title-container noun-front-title--single">
      <div className="noun-form-item-group">
        <h3 className="saved-vocab-word">{forms.lemma}</h3>
        <AudioSpeakerButton text={forms.sharedAudioText} size="sm" title={`Listen: ${forms.sharedAudioText}`} />
      </div>
      {forms.notation && (
        <span className="noun-gender-tag">({forms.notation})</span>
      )}
    </div>
  );
}

/**
 * Renders the front-of-card title for Adjectives per specifications:
 * - Trước nom: 2 rows with "adj + N".
 * - Sau nom: 2 rows with "N + adj".
 * - Trước và sau nom: 2 rows without indicator.
 * - Each word has its own speaker button!
 */
function renderAdjectiveFrontTitle(item: VocabularyItem, forms: AdjectiveFormsResult) {
  const grammar = item.format_a?.grammar as FormatAAdjectiveGrammar | undefined;
  const position = forms.position || grammar?.position || AdjectivePosition.BeforeNoun;

  const masc = forms.masculine || item.surface_form;
  const fem = forms.feminine;
  const isIdentical = forms.isIdentical || !fem || masc.toLowerCase() === fem.toLowerCase();

  const renderFormsBlock = () => {
    if (isIdentical) {
      return (
        <div className="adj-form-single-group">
          <h3 className="adj-form-word">{masc}</h3>
          <AudioSpeakerButton text={masc} size="sm" title={`Listen: ${masc}`} />
        </div>
      );
    }
    return (
      <div className="adj-forms-stack">
        <div className="adj-form-item-row">
          <span className="adj-form-masc">{masc}</span>
          <AudioSpeakerButton text={masc} size="sm" title={`Listen: ${masc}`} />
        </div>
        <div className="adj-form-item-row">
          <span className="adj-form-fem">{fem}</span>
          <AudioSpeakerButton text={fem} size="sm" title={`Listen: ${fem}`} />
        </div>
      </div>
    );
  };

  // Position: Sau nom -> 'N + adj'
  if (position === AdjectivePosition.AfterNoun) {
    return (
      <div className="adj-front-title-container adj-front-title--after">
        <span className="adj-pos-indicator">N + adj</span>
        {renderFormsBlock()}
      </div>
    );
  }

  // Position: Trước và sau nom -> Không cần '+N', viết mỗi tính từ thôi
  if (position === AdjectivePosition.Variable) {
    return (
      <div className="adj-front-title-container adj-front-title--variable">
        {renderFormsBlock()}
      </div>
    );
  }

  // Position: Trước nom -> 'adj + N'
  return (
    <div className="adj-front-title-container adj-front-title--before">
      {renderFormsBlock()}
      <span className="adj-pos-indicator">adj + N</span>
    </div>
  );
}

interface SavedVocabListProps {
  items: VocabularyItem[];
  onDelete: (id: string) => void;
  selectedLevel?: 'total' | number | null;
  onResetLevel?: () => void;
}

type PosFilter = 'all' | 'noun' | 'verb' | 'adjective' | 'other';

export function SavedVocabList({
  items,
  onDelete,
  selectedLevel,
  onResetLevel,
}: SavedVocabListProps) {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [activePosFilter, setActivePosFilter] = useState<PosFilter>('all');
  const [enlargedItem, setEnlargedItem] = useState<VocabularyItem | null>(null);
  const [enlargedFace, setEnlargedFace] = useState<1 | 2>(2);
  const [deletingItem, setDeletingItem] = useState<VocabularyItem | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [searchFilter, setSearchFilter] = useState('');

  // Real-time tick every 1 second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Newly saved vocabulary items must appear at the FAR LEFT of the list:
  // Sort descending by created_at timestamp so newest item is at index 0 (top-left).
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [items]);

  // Filter items by Level, POS, and optional search text
  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      // Level filter (when a specific level cell is clicked in VocabStats)
      if (selectedLevel !== undefined && selectedLevel !== null && selectedLevel !== 'total') {
        const itemLevel = item.level ?? 0;
        if (itemLevel !== selectedLevel) return false;
      }

      // POS filter
      if (activePosFilter === 'noun' && item.part_of_speech !== PartOfSpeech.Noun) return false;
      if (activePosFilter === 'verb' && item.part_of_speech !== PartOfSpeech.Verb) return false;
      if (activePosFilter === 'adjective' && item.part_of_speech !== PartOfSpeech.Adjective) return false;
      if (
        activePosFilter === 'other' &&
        (item.part_of_speech === PartOfSpeech.Noun ||
          item.part_of_speech === PartOfSpeech.Verb ||
          item.part_of_speech === PartOfSpeech.Adjective)
      ) {
        return false;
      }

      // Search keyword filter (§8, §10, §11: match spelling, lemma, and forms without creating duplicates)
      if (searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase();
        const cleanQ = cleanNounLemma(q).toLowerCase();
        const noAccentQ = stripAccents(cleanQ || q);

        const checkMatch = (target?: string) => {
          if (!target) return false;
          const t = target.toLowerCase();
          if (t.includes(q) || (cleanQ && t.includes(cleanQ))) return true;
          if (noAccentQ && stripAccents(t).includes(noAccentQ)) return true;
          return false;
        };

        const matchWord = checkMatch(item.surface_form);
        const matchEn = checkMatch(item.format_a?.meaning_en);
        const matchVi = checkMatch(item.format_a?.meaning_vi);
        const nounGrammar = item.format_a?.grammar as any;
        const matchLemma = checkMatch(nounGrammar?.lemma);
        const matchMasc = checkMatch(nounGrammar?.masculine_form?.lemma || nounGrammar?.forms?.masculine);
        const matchFem = checkMatch(nounGrammar?.feminine_form?.lemma || nounGrammar?.forms?.feminine);
        return matchWord || matchEn || matchVi || matchLemma || matchMasc || matchFem;
      }

      return true;
    });
  }, [sortedItems, selectedLevel, activePosFilter, searchFilter]);

  // POS counts
  const posCounts = useMemo(() => {
    return {
      all: items.length,
      noun: items.filter((it) => it.part_of_speech === PartOfSpeech.Noun).length,
      verb: items.filter((it) => it.part_of_speech === PartOfSpeech.Verb).length,
      adjective: items.filter((it) => it.part_of_speech === PartOfSpeech.Adjective).length,
      other: items.filter(
        (it) =>
          it.part_of_speech !== PartOfSpeech.Noun &&
          it.part_of_speech !== PartOfSpeech.Verb &&
          it.part_of_speech !== PartOfSpeech.Adjective,
      ).length,
    };
  }, [items]);

  // Toggle card flip (Pure reference only, NO SRS effects)
  const handleToggleFlip = (id: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirmDelete = () => {
    if (deletingItem) {
      const word = getCardPresentationTitle(deletingItem);
      onDelete(deletingItem.id);
      setDeletingItem(null);
      setDeleteToast(word);
      setTimeout(() => {
        setDeleteToast(null);
      }, 3000);
    }
  };

  return (
    <section className="saved-vocab-section" aria-label="Saved Vocabulary List">
      {/* ── Library Toolbar (Filter by POS & search) ── */}
      <div className="saved-vocab-toolbar">
        <div className="saved-vocab-pos-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activePosFilter === 'all'}
            className={`saved-pos-tab ${activePosFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActivePosFilter('all')}
          >
            All <span className="pos-count">{posCounts.all}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePosFilter === 'noun'}
            className={`saved-pos-tab ${activePosFilter === 'noun' ? 'active' : ''}`}
            onClick={() => setActivePosFilter('noun')}
          >
            Nouns <span className="pos-count">{posCounts.noun}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePosFilter === 'verb'}
            className={`saved-pos-tab ${activePosFilter === 'verb' ? 'active' : ''}`}
            onClick={() => setActivePosFilter('verb')}
          >
            Verbs <span className="pos-count">{posCounts.verb}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePosFilter === 'adjective'}
            className={`saved-pos-tab ${activePosFilter === 'adjective' ? 'active' : ''}`}
            onClick={() => setActivePosFilter('adjective')}
          >
            Adjectives <span className="pos-count">{posCounts.adjective}</span>
          </button>
          {posCounts.other > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activePosFilter === 'other'}
              className={`saved-pos-tab ${activePosFilter === 'other' ? 'active' : ''}`}
              onClick={() => setActivePosFilter('other')}
            >
              Other <span className="pos-count">{posCounts.other}</span>
            </button>
          )}
        </div>

        {items.length > 4 && (
          <div className="saved-vocab-search-box">
            <input
              type="text"
              className="saved-vocab-search-input"
              placeholder="Filter saved words..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            {searchFilter && (
              <button
                type="button"
                className="saved-vocab-search-clear"
                onClick={() => setSearchFilter('')}
                aria-label="Clear filter"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Empty State ── */}
      {items.length === 0 ? (
        <div className="saved-vocab-empty">
          <div className="empty-icon">📖</div>
          <h3 className="empty-title">No saved vocabulary yet</h3>
          <p className="empty-desc">
            Your vocabulary library is currently empty. Use the{' '}
            <strong>« Add Vocabulary »</strong> button above to save French words.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="saved-vocab-empty">
          <div className="empty-icon">🔍</div>
          <h3 className="empty-title">
            {searchFilter.trim() ? 'Từ chưa được lưu' : 'No matching vocabulary found'}
          </h3>
          <p className="empty-desc">
            {searchFilter.trim()
              ? 'Không có từ vựng tương đồng trong danh sách đã lưu.'
              : 'No words match your selected filter.'}
          </p>
          <button
            type="button"
            className="btn-reset-pos-filter"
            onClick={() => {
              setActivePosFilter('all');
              setSearchFilter('');
              onResetLevel?.();
            }}
          >
            Show all saved words ({items.length})
          </button>
        </div>
      ) : (
        /* ── 4 CARDS PER ROW LAYOUT (SQUARE CARDS) ── */
        <div className="saved-vocab-grid">
          {filteredItems.map((item) => {
            const isFlipped = Boolean(flippedCards[item.id]);
            const isNoun = item.part_of_speech === PartOfSpeech.Noun;
            const isVerb = item.part_of_speech === PartOfSpeech.Verb;
            const isAdj = item.part_of_speech === PartOfSpeech.Adjective;
            const adjForms = isAdj ? getAdjectiveForms(item) : null;
            const isVariableAdj =
              isAdj &&
              (adjForms?.position === AdjectivePosition.Variable ||
                (item.format_a?.grammar as FormatAAdjectiveGrammar)?.position === AdjectivePosition.Variable);

            const nounGender = item.gender || (item.format_a?.grammar as any)?.gender;
            const nounNotation = !isNoun
              ? ''
              : nounGender === Gender.Masculine
              ? NOUN_GENDER_NOTATION[Gender.Masculine]
              : nounGender === Gender.Feminine
              ? NOUN_GENDER_NOTATION[Gender.Feminine]
              : '';

            const displayWord = getCardPresentationTitle(item);

            // Relevant notation label
            let relevantNotation = '';
            if (isNoun && nounNotation) {
              relevantNotation = nounNotation;
            } else if (isVerb) {
              const group = (item.format_a?.grammar as any)?.group;
              relevantNotation = group ? `Vo • Group ${group}` : 'Vo (Infinitive)';
            } else if (isAdj) {
              const pos = (item.format_a?.grammar as any)?.position;
              relevantNotation = pos ? ADJECTIVE_POSITION_DISPLAY[pos as keyof typeof ADJECTIVE_POSITION_DISPLAY] || 'adj' : 'adj';
            }

            return (
              <div
                key={item.id}
                className={`saved-vocab-card-wrapper saved-vocab-card-wrapper--${item.part_of_speech}`}
                onClick={() => handleToggleFlip(item.id)}
                role="button"
                tabIndex={0}
                title="Click anywhere to flip card"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleFlip(item.id);
                  }
                }}
              >
                <div
                  className={`saved-vocab-card ${isFlipped ? 'is-flipped' : ''}`}
                >
                  {/* ══════════════════════════════════════════════════════
                      CARD FACE 1:
                      - vocabulary
                      - part of speech & level
                      - relevant notation
                      - diagonal expand icon on top right
                      - speaker icon beside word
                      - circled x delete button at bottom
                      ══════════════════════════════════════════════════════ */}
                  <div className="saved-card-face saved-card-face--front">
                    {/* Top Row: Level on left, Diagonal Expand on right (No POS badges) */}
                    <div className="card-face1-top-row">
                      <span className={`saved-level-badge level-${item.level ?? 0}`}>
                        Level {item.level ?? 0}
                      </span>

                      <button
                        type="button"
                        className="btn-diagonal-expand"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedItem(item);
                          setEnlargedFace(2);
                        }}
                        title="Expand full details"
                        aria-label="Expand full details"
                      >
                        <DiagonalExpandIcon />
                      </button>
                    </div>

                    {/* Center: Vocabulary surface form with individual speaker button(s) beside each word */}
                    <div className="card-face1-center">
                      <div className={`saved-vocab-word-row ${isAdj ? 'saved-vocab-word-row--adj' : isNoun ? 'saved-vocab-word-row--noun' : ''}`}>
                        {isAdj && adjForms ? (
                          renderAdjectiveFrontTitle(item, adjForms)
                        ) : isNoun ? (
                          renderNounFrontTitle(item)
                        ) : (
                          <div className="default-form-item-group">
                            <h3 className="saved-vocab-word">{displayWord}</h3>
                            <AudioSpeakerButton
                              item={item}
                              text={displayWord}
                              size="sm"
                              title={`Listen to pronunciation: ${displayWord}`}
                            />
                          </div>
                        )}
                      </div>

                      {isVariableAdj && (item.format_a?.grammar as FormatAAdjectiveGrammar)?.has_distinct_meanings ? (
                        <div className="saved-vocab-meanings saved-vocab-meanings--variable-adj">
                          {(() => {
                            const adjGrammar = item.format_a?.grammar as FormatAAdjectiveGrammar | undefined;
                            const trcEn =
                              item.format_a?.trc_meaning?.en ||
                              adjGrammar?.before_entry?.meaning_en ||
                              '';
                            const trcVi =
                              item.format_a?.trc_meaning?.vi ||
                              adjGrammar?.before_entry?.meaning_vi ||
                              '';
                            const sauEn =
                              item.format_a?.sau_meaning?.en ||
                              adjGrammar?.after_entry?.meaning_en ||
                              '';
                            const sauVi =
                              item.format_a?.sau_meaning?.vi ||
                              adjGrammar?.after_entry?.meaning_vi ||
                              '';

                            return (
                              <>
                                <div className="adj-pos-meaning-block">
                                  <div className="adj-pos-meaning-split">
                                    <span className="adj-pos-plain-label adj-pos-plain-label--left">trc</span>
                                    <div className="adj-pos-meaning-texts">
                                      {trcEn && (
                                        <p className="saved-meaning-en">
                                          <span className="meaning-flag">🇬🇧</span> {cleanMeaning(trcEn)}
                                        </p>
                                      )}
                                      {trcVi && (
                                        <p className="saved-meaning-vi">
                                          <span className="meaning-flag">🇻🇳</span> {cleanMeaning(trcVi)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="adj-meanings-divider" aria-hidden="true" />

                                <div className="adj-pos-meaning-block">
                                  <div className="adj-pos-meaning-split">
                                    <span className="adj-pos-plain-label adj-pos-plain-label--left">sau</span>
                                    <div className="adj-pos-meaning-texts">
                                      {sauEn && (
                                        <p className="saved-meaning-en">
                                          <span className="meaning-flag">🇬🇧</span> {cleanMeaning(sauEn)}
                                        </p>
                                      )}
                                      {sauVi && (
                                        <p className="saved-meaning-vi">
                                          <span className="meaning-flag">🇻🇳</span> {cleanMeaning(sauVi)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="saved-vocab-meanings">
                          {item.format_a?.meaning_en && (
                            <p className="saved-meaning-en">
                              <span className="meaning-flag">🇬🇧</span>{' '}
                              {cleanMeaning(item.format_a.meaning_en)}
                            </p>
                          )}
                          {item.format_a?.meaning_vi && (
                            <p className="saved-meaning-vi">
                              <span className="meaning-flag">🇻🇳</span>{' '}
                              {cleanMeaning(item.format_a.meaning_vi)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Live SRS Countdown Timer (Between meanings and delete button) */}
                      {(() => {
                        const countdownVal = formatCountdown(item.next_review_at, currentTime);
                        return (
                          <div
                            className={`card-face1-countdown ${countdownVal === 'now' ? 'is-now' : ''}`}
                            title="Time remaining until next review"
                          >
                            {countdownVal}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Bottom: Circled 'X' button to delete/dismiss card */}
                    <div className="card-face1-bottom">
                      <button
                        type="button"
                        className="btn-delete-circled-x"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingItem(item);
                        }}
                        title="Delete vocabulary card"
                        aria-label="Delete vocabulary card"
                      >
                        <CircledXIcon />
                      </button>
                    </div>
                  </div>

                  {/* ══════════════════════════════════════════════════════
                      CARD FACE 2:
                      - toàn bộ chi tiết từ vựng Format A
                      - thay nút phóng to bằng diagonal expand
                      ══════════════════════════════════════════════════════ */}
                  <div className="saved-card-face saved-card-face--back">
                    {/* Header on Face 2 (Word title removed to avoid duplication and clutter) */}
                    <div className="card-face2-header">
                      <div className="card-face2-left">
                        <span className={`saved-pos-badge pos-${item.part_of_speech}`}>
                          {item.part_of_speech}
                        </span>
                        <span className={`saved-level-badge level-${item.level ?? 0}`}>
                          Level {item.level ?? 0}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn-diagonal-expand"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedItem(item);
                          setEnlargedFace(2);
                        }}
                        title="Expand full details"
                        aria-label="Expand full details"
                      >
                        <DiagonalExpandIcon />
                      </button>
                    </div>

                    {/* Scrollable Container with complete word details */}
                    <div className="card-face2-scroll-body">
                      {item.format_a ? (
                        <div className="format-a-card-embed">
                          <FormatADisplay data={item.format_a} />
                        </div>
                      ) : (
                        <div className="format-a-not-available">
                          <p>Detailed profile not available for this item.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          EXPANDED CARD VIEWER (Pure Reference • Does NOT affect learning state)
          - Mặc định show mặt sau (Format A)
          - Không cần nút flip to face 1 / flip to format A
          - Click outside to close
          ══════════════════════════════════════════════════════════════════ */}
      {enlargedItem && (
        <div
          className="modal-overlay"
          onClick={() => setEnlargedItem(null)}
          title="Click outside to close"
        >
          <div
            className={`modal-card modal-card--wide expanded-card-viewer saved-vocab-card-wrapper--${enlargedItem.part_of_speech}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header expanded-viewer-header">
              <div className="expanded-header-left">
                <h2 className="modal-title">
                  {getCardPresentationTitle(enlargedItem)}
                </h2>
                <span className={`saved-pos-badge pos-${enlargedItem.part_of_speech}`}>
                  {enlargedItem.part_of_speech}
                </span>
                <span className={`saved-level-badge level-${enlargedItem.level ?? 0}`}>
                  Level {enlargedItem.level ?? 0}
                </span>
              </div>
              <div className="expanded-header-actions">
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setEnlargedItem(null)}
                  aria-label="Close expanded card"
                  title="Close (or click outside)"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="modal-body expanded-viewer-body">
              <div className="format-a-preview-scroll">
                {enlargedItem.format_a ? (
                  <FormatADisplay data={enlargedItem.format_a} />
                ) : (
                  <div className="format-a-not-available">
                    <p>Detailed profile not available for this item.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: CONFIRM DELETE (Academic Design System)
          ══════════════════════════════════════════════════════════════════ */}
      {deletingItem && (
        <div className="modal-overlay" onClick={() => setDeletingItem(null)}>
          <div
            className="modal-card modal-card--academic-delete"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Delete Vocabulary"
          >
            <div className="delete-modal-icon-badge">
              <span className="delete-modal-trash-icon">🗑️</span>
            </div>

            <h2 className="delete-modal-title">Delete Vocabulary Item</h2>

            <p className="delete-modal-subtext">
              Are you sure you want to permanently remove this word from your vocabulary library?
            </p>

            <div className="delete-preview-item">
              <span className="delete-preview-word">
                {getCardPresentationTitle(deletingItem)}
              </span>
            </div>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-cancel-academic"
                onClick={() => setDeletingItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete-confirm-academic"
                onClick={handleConfirmDelete}
              >
                Delete Word
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TOAST: DELETE CONFIRMATION WITH GREEN CHECKMARK
          ══════════════════════════════════════════════════════════════════ */}
      {deleteToast && (
        <div className="delete-success-toast" role="status" aria-live="polite">
          <span className="toast-green-tick">✓</span>
          <span>Deleted <strong>« {deleteToast} »</strong> successfully</span>
        </div>
      )}
    </section>
  );
}

function DiagonalExpandIcon() {
  return (
    <svg
      className="diagonal-expand-icon"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="11 7 17 7 17 13" />
      <polyline points="13 17 7 17 7 11" />
    </svg>
  );
}

function CircledXIcon() {
  return (
    <svg
      className="circled-x-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
