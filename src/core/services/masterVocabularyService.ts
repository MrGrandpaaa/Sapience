import { UUID, PartOfSpeech, Gender } from '../models/types';
import {
  AtomicVocabularyRecord,
  VocabularyItem,
  CardDisplayData,
  VocabularyStatistics,
  calculateVocabularyStats,
  VocabLevel,
} from '../models/vocabulary';
import {
  RetrievalEvaluationInput,
  SrsMemoryData,
  MEMORY_LEVELS_META,
} from '../models/srs';
import { srsEngineService } from './srsEngineService';
import { skillPerformanceService } from './skillPerformanceService';
import {
  createConjugationUnits,
  evaluateConjugationRetrieval,
  VerbConjugationPerson,
} from './verbConjugationService';
import { createAdjectiveUnits } from './adjectivePresentationService';
import { cleanNounLemma } from './nounPresentationService';
import { searchBySpelling } from '../../utils/spellingSearch';
import { RelatedWordGender, LexicalRelatedWord, FormatAData } from '../models/lexical';

export function normalizeRelatedWord(
  item: string | LexicalRelatedWord,
  fallbackGender: RelatedWordGender = 'mas',
): LexicalRelatedWord {
  if (typeof item === 'string') {
    return { word: item, gender: fallbackGender };
  }
  return {
    word: item.word || '',
    gender: item.gender === 'fem' ? 'fem' : 'mas',
  };
}

const STORAGE_KEY_ITEMS = 'sapience_vocab_items_v1';
const STORAGE_KEY_CARDS = 'sapience_vocab_cards_v1';

const LEGACY_STORAGE_KEYS = [
  'french-vocab-items-v2',
  'french-vocab-items',
  'french_vocab_target_review_quantity',
  'french_vocab_active_session_v1',
  'french_vocab_review_attempt_records_v1',
  'french_vocab_daily_streak_v1',
];

type Listener = (items: AtomicVocabularyRecord[]) => void;
type CardListener = (cards: CardDisplayData[]) => void;

/**
 * Master Vocabulary Service.
 *
 * Implements strict architectural separation between:
 * 1. CARD DISPLAY DATA (CardDisplayData): Visual presentation for cards/catalog.
 *    May visually combine related forms (e.g. "compagnon / compagne").
 * 2. ATOMIC VOCABULARY MEMORY DATA (AtomicVocabularyRecord / VocabularyItem):
 *    Each independently testable lexical item is stored separately with its own gender,
 *    SRS memory state, and history. Source of truth for all games, reviews, and retrieval.
 */
class MasterVocabularyService {
  private items: AtomicVocabularyRecord[] = [];
  private cards: CardDisplayData[] = [];
  private listeners: Set<Listener> = new Set();
  private cardListeners: Set<CardListener> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.initialized) return;
    this.loadFromStorage();
    this.initialized = true;
  }

  private ensureSrsFields(item: AtomicVocabularyRecord): AtomicVocabularyRecord {
    const srs = srsEngineService.createInitialMemoryData((item.level ?? 0) as any, item.part_of_speech, item);
    const skills = item.skill_performance || srs.skill_performance;

    let conjUnits = item.conjugation_units;
    if (item.part_of_speech === PartOfSpeech.Verb && !conjUnits) {
      const conj = (item.format_a?.grammar as any)?.conjugation;
      conjUnits = createConjugationUnits({
        id: item.id,
        surface_form: item.surface_form,
        conjugation: conj,
        level: item.level,
      });
    }

    let adjUnits = item.adjective_units;
    if (item.part_of_speech === PartOfSpeech.Adjective && !adjUnits) {
      adjUnits = createAdjectiveUnits(item);
    }

    return {
      ...item,
      level: item.level ?? srs.level,
      last_review_at: item.last_review_at ?? srs.last_review_at,
      next_review_at: item.next_review_at || srs.next_review_at,
      review_count: item.review_count ?? srs.review_count,
      successful_retrievals:
        item.successful_retrievals ?? srs.successful_retrievals,
      failed_retrievals: item.failed_retrievals ?? srs.failed_retrievals,
      current_streak: item.current_streak ?? srs.current_streak,
      average_response_time:
        item.average_response_time ?? srs.average_response_time,
      skill_performance: skills,
      maintenance_stage: item.maintenance_stage,
      item_mastery: item.item_mastery || skillPerformanceService.evaluateItemMastery(item, skills),
      conjugation_units: conjUnits,
      adjective_units: adjUnits,
    };
  }

  /**
   * Detects whether an entry contains visually combined forms
   * that require decomposition into atomic records.
   */
  public isCombinedEntry(item: any): boolean {
    if (!item) return false;

    // An item that already has a specific single gender and no combined slash is strictly atomic
    if (
      (item.gender === Gender.Masculine || item.gender === Gender.Feminine) &&
      (typeof item.surface_form !== 'string' || !item.surface_form.includes(' / '))
    ) {
      return false;
    }

    // Explicit combined check: has " / " in surface_form
    if (typeof item.surface_form === 'string' && item.surface_form.includes(' / ')) {
      return true;
    }

    // Noun with dual genders
    if (item.part_of_speech === PartOfSpeech.Noun) {
      const grammar = item.format_a?.grammar;
      if (
        grammar?.gender_choice === 'both' ||
        grammar?.gender === Gender.Both ||
        item.gender === Gender.Both ||
        (grammar?.masculine_form && grammar?.feminine_form) ||
        (grammar?.forms?.masculine && grammar?.forms?.feminine)
      ) {
        return true;
      }
    }

    // Adjective with distinct masculine & feminine forms
    if (item.part_of_speech === PartOfSpeech.Adjective) {
      if (item.gender === Gender.Masculine || item.gender === Gender.Feminine) {
        return false;
      }
      const grammar = item.format_a?.grammar;
      if (
        grammar?.masculine &&
        grammar?.feminine &&
        grammar.masculine.trim().toLowerCase() !== grammar.feminine.trim().toLowerCase()
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Decomposes any vocabulary entry into:
   * 1. CardDisplayData (for card presentation)
   * 2. AtomicVocabularyRecord[] (for game questions and memory tracking)
   */
  public decomposeEntry(entry: any): { card: CardDisplayData; atomicRecords: AtomicVocabularyRecord[] } {
    const cardId: UUID =
      entry.card_id ||
      entry.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

    const now = new Date();
    const createdAt = entry.created_at || now;
    const updatedAt = entry.updated_at || now;

    // ── CASE 1: NOUN WITH DUAL FORMS ──────────────────────────────────────────
    if (entry.part_of_speech === PartOfSpeech.Noun && this.isCombinedEntry(entry)) {
      const grammar = entry.format_a?.grammar;
      const rawMasc =
        grammar?.masculine_form?.lemma ||
        grammar?.forms?.masculine ||
        (entry.surface_form && entry.surface_form.includes(' / ') ? entry.surface_form.split(' / ')[0] : '');
      const rawFem =
        grammar?.feminine_form?.lemma ||
        grammar?.forms?.feminine ||
        (entry.surface_form && entry.surface_form.includes(' / ') ? entry.surface_form.split(' / ')[1] : '');

      let cleanMasc = cleanNounLemma(rawMasc);
      let cleanFem = cleanNounLemma(rawFem);

      if (!cleanMasc && !cleanFem) {
        cleanMasc = cleanNounLemma(entry.surface_form || '');
        cleanFem = cleanMasc;
      } else if (!cleanMasc) {
        cleanMasc = cleanFem;
      } else if (!cleanFem) {
        cleanFem = cleanMasc;
      }

      const isShared = cleanMasc.toLowerCase() === cleanFem.toLowerCase();
      const displayTitle = isShared ? cleanMasc : `${cleanMasc} / ${cleanFem}`;

      const recMascId = entry.id && entry.id.endsWith('-masc') ? entry.id : `${cardId}-masc`;
      const recFemId = entry.id && entry.id.endsWith('-fem') ? entry.id : `${cardId}-fem`;

      const formatAMasc = entry.format_a ? {
        ...entry.format_a,
        entry: cleanMasc,
        grammar: {
          ...entry.format_a.grammar,
          gender: Gender.Masculine,
          gender_choice: 'masculine',
          lemma: cleanMasc,
          underlying_article: 'le',
          masculine_form: undefined,
          feminine_form: undefined,
          forms: { masculine: cleanMasc },
        },
      } : undefined;

      const formatAFem = entry.format_a ? {
        ...entry.format_a,
        entry: cleanFem,
        grammar: {
          ...entry.format_a.grammar,
          gender: Gender.Feminine,
          gender_choice: 'feminine',
          lemma: cleanFem,
          underlying_article: 'la',
          masculine_form: undefined,
          feminine_form: undefined,
          forms: { feminine: cleanFem },
        },
      } : undefined;

      const recMasc: AtomicVocabularyRecord = {
        id: recMascId,
        card_id: cardId,
        word: cleanMasc,
        surface_form: cleanMasc,
        normalized_form: cleanMasc.toLowerCase(),
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: entry.level ?? 0,
        last_review_at: entry.last_review_at ?? null,
        next_review_at: entry.next_review_at,
        review_count: entry.review_count ?? 0,
        successful_retrievals: entry.successful_retrievals ?? 0,
        failed_retrievals: entry.failed_retrievals ?? 0,
        current_streak: entry.current_streak ?? 0,
        average_response_time: entry.average_response_time ?? 0,
        skill_performance: entry.skill_performance ? JSON.parse(JSON.stringify(entry.skill_performance)) : undefined,
        maintenance_stage: entry.maintenance_stage,
        item_mastery: entry.item_mastery,
        format_a: formatAMasc,
        created_at: createdAt,
        updated_at: updatedAt,
      };

      const recFem: AtomicVocabularyRecord = {
        id: recFemId,
        card_id: cardId,
        word: cleanFem,
        surface_form: cleanFem,
        normalized_form: cleanFem.toLowerCase(),
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: entry.level ?? 0,
        last_review_at: entry.last_review_at ?? null,
        next_review_at: entry.next_review_at,
        review_count: entry.review_count ?? 0,
        successful_retrievals: entry.successful_retrievals ?? 0,
        failed_retrievals: entry.failed_retrievals ?? 0,
        current_streak: entry.current_streak ?? 0,
        average_response_time: entry.average_response_time ?? 0,
        skill_performance: entry.skill_performance ? JSON.parse(JSON.stringify(entry.skill_performance)) : undefined,
        maintenance_stage: entry.maintenance_stage,
        item_mastery: entry.item_mastery,
        format_a: formatAFem,
        created_at: createdAt,
        updated_at: updatedAt,
      };

      const card: CardDisplayData = {
        id: cardId,
        display_title: displayTitle,
        surface_form: displayTitle,
        normalized_form: displayTitle.toLowerCase(),
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        atomic_record_ids: [recMasc.id, recFem.id],
        level: entry.level ?? 0,
        next_review_at: entry.next_review_at,
        last_review_at: entry.last_review_at ?? null,
        review_count: entry.review_count ?? 0,
        successful_retrievals: entry.successful_retrievals ?? 0,
        failed_retrievals: entry.failed_retrievals ?? 0,
        current_streak: entry.current_streak ?? 0,
        average_response_time: entry.average_response_time ?? 0,
        skill_performance: entry.skill_performance,
        maintenance_stage: entry.maintenance_stage,
        item_mastery: entry.item_mastery,
        format_a: entry.format_a,
        created_at: createdAt,
        updated_at: updatedAt,
      };

      return { card, atomicRecords: [recMasc, recFem] };
    }

    // ── CASE 2: ADJECTIVE WITH DUAL FORMS ─────────────────────────────────────
    if (entry.part_of_speech === PartOfSpeech.Adjective && this.isCombinedEntry(entry)) {
      const grammar = entry.format_a?.grammar;
      const rawMasc = grammar?.masculine || (entry.surface_form && entry.surface_form.includes(' / ') ? entry.surface_form.split(' / ')[0].trim() : '');
      const rawFem = grammar?.feminine || (entry.surface_form && entry.surface_form.includes(' / ') ? entry.surface_form.split(' / ')[1].trim() : '');

      const mascWord = rawMasc || entry.surface_form || 'Adjectif';
      const femWord = rawFem || mascWord;

      const displayTitle = mascWord === femWord ? mascWord : `${mascWord} / ${femWord}`;
      const recMascId = entry.id && entry.id.endsWith('-masc') ? entry.id : `${cardId}-masc`;
      const recFemId = entry.id && entry.id.endsWith('-fem') ? entry.id : `${cardId}-fem`;

      const formatAMasc = entry.format_a ? {
        ...entry.format_a,
        entry: mascWord,
        grammar: {
          ...entry.format_a.grammar,
          masculine: mascWord,
          feminine: undefined,
        },
      } : undefined;

      const formatAFem = entry.format_a ? {
        ...entry.format_a,
        entry: femWord,
        grammar: {
          ...entry.format_a.grammar,
          feminine: femWord,
          masculine: undefined,
        },
      } : undefined;

      const recMasc: AtomicVocabularyRecord = {
        id: recMascId,
        card_id: cardId,
        word: mascWord,
        surface_form: mascWord,
        normalized_form: mascWord.toLowerCase(),
        part_of_speech: PartOfSpeech.Adjective,
        gender: Gender.Masculine,
        level: entry.level ?? 0,
        last_review_at: entry.last_review_at ?? null,
        next_review_at: entry.next_review_at,
        review_count: entry.review_count ?? 0,
        successful_retrievals: entry.successful_retrievals ?? 0,
        failed_retrievals: entry.failed_retrievals ?? 0,
        current_streak: entry.current_streak ?? 0,
        average_response_time: entry.average_response_time ?? 0,
        skill_performance: entry.skill_performance ? JSON.parse(JSON.stringify(entry.skill_performance)) : undefined,
        format_a: formatAMasc,
        created_at: createdAt,
        updated_at: updatedAt,
      };

      const recFem: AtomicVocabularyRecord = {
        id: recFemId,
        card_id: cardId,
        word: femWord,
        surface_form: femWord,
        normalized_form: femWord.toLowerCase(),
        part_of_speech: PartOfSpeech.Adjective,
        gender: Gender.Feminine,
        level: entry.level ?? 0,
        last_review_at: entry.last_review_at ?? null,
        next_review_at: entry.next_review_at,
        review_count: entry.review_count ?? 0,
        successful_retrievals: entry.successful_retrievals ?? 0,
        failed_retrievals: entry.failed_retrievals ?? 0,
        current_streak: entry.current_streak ?? 0,
        average_response_time: entry.average_response_time ?? 0,
        skill_performance: entry.skill_performance ? JSON.parse(JSON.stringify(entry.skill_performance)) : undefined,
        format_a: formatAFem,
        created_at: createdAt,
        updated_at: updatedAt,
      };

      const card: CardDisplayData = {
        id: cardId,
        display_title: displayTitle,
        surface_form: displayTitle,
        normalized_form: displayTitle.toLowerCase(),
        part_of_speech: PartOfSpeech.Adjective,
        atomic_record_ids: [recMasc.id, recFem.id],
        level: entry.level ?? 0,
        next_review_at: entry.next_review_at,
        last_review_at: entry.last_review_at ?? null,
        review_count: entry.review_count ?? 0,
        successful_retrievals: entry.successful_retrievals ?? 0,
        failed_retrievals: entry.failed_retrievals ?? 0,
        current_streak: entry.current_streak ?? 0,
        format_a: entry.format_a,
        created_at: createdAt,
        updated_at: updatedAt,
      };

      return { card, atomicRecords: [recMasc, recFem] };
    }

    // ── CASE 3: GENERIC COMBINED STRING WITH " / " ────────────────────────────
    if (typeof entry.surface_form === 'string' && entry.surface_form.includes(' / ')) {
      const parts = entry.surface_form.split(' / ').map((p: string) => p.trim()).filter(Boolean);
      const atomicRecords: AtomicVocabularyRecord[] = [];
      const atomicIds: UUID[] = [];

      parts.forEach((part: string, idx: number) => {
        const id = `${cardId}-part-${idx}`;
        atomicIds.push(id);
        atomicRecords.push({
          id,
          card_id: cardId,
          word: part,
          surface_form: part,
          normalized_form: part.toLowerCase(),
          part_of_speech: entry.part_of_speech,
          gender: entry.gender,
          level: entry.level ?? 0,
          last_review_at: entry.last_review_at ?? null,
          next_review_at: entry.next_review_at,
          review_count: entry.review_count ?? 0,
          successful_retrievals: entry.successful_retrievals ?? 0,
          failed_retrievals: entry.failed_retrievals ?? 0,
          current_streak: entry.current_streak ?? 0,
          format_a: entry.format_a,
          created_at: createdAt,
          updated_at: updatedAt,
        });
      });

      const card: CardDisplayData = {
        id: cardId,
        display_title: entry.surface_form,
        surface_form: entry.surface_form,
        normalized_form: entry.surface_form.toLowerCase(),
        part_of_speech: entry.part_of_speech,
        gender: entry.gender,
        atomic_record_ids: atomicIds,
        level: entry.level ?? 0,
        next_review_at: entry.next_review_at,
        last_review_at: entry.last_review_at ?? null,
        format_a: entry.format_a,
        created_at: createdAt,
        updated_at: updatedAt,
      };

      return { card, atomicRecords };
    }

    // ── CASE 4: SINGLE / ATOMIC ITEM ──────────────────────────────────────────
    const atomicId: UUID = entry.id || cardId;
    const cleanWord = entry.word || cleanNounLemma(entry.surface_form || '') || entry.surface_form || '';
    const surfaceForm = entry.surface_form || cleanWord;

    const singleRecord: AtomicVocabularyRecord = {
      id: atomicId,
      card_id: cardId,
      word: cleanWord,
      surface_form: surfaceForm,
      normalized_form: surfaceForm.toLowerCase(),
      part_of_speech: entry.part_of_speech,
      gender: entry.gender,
      level: entry.level ?? 0,
      last_review_at: entry.last_review_at ?? null,
      next_review_at: entry.next_review_at,
      review_count: entry.review_count ?? 0,
      successful_retrievals: entry.successful_retrievals ?? 0,
      failed_retrievals: entry.failed_retrievals ?? 0,
      current_streak: entry.current_streak ?? 0,
      average_response_time: entry.average_response_time ?? 0,
      skill_performance: entry.skill_performance,
      maintenance_stage: entry.maintenance_stage,
      item_mastery: entry.item_mastery,
      format_a: entry.format_a,
      conjugation_units: entry.conjugation_units,
      positional_units: entry.positional_units,
      adjective_units: entry.adjective_units,
      created_at: createdAt,
      updated_at: updatedAt,
    };

    const card: CardDisplayData = {
      id: cardId,
      display_title: entry.display_title || surfaceForm,
      surface_form: surfaceForm,
      normalized_form: surfaceForm.toLowerCase(),
      part_of_speech: entry.part_of_speech,
      gender: entry.gender,
      atomic_record_ids: [atomicId],
      level: entry.level ?? 0,
      next_review_at: entry.next_review_at,
      last_review_at: entry.last_review_at ?? null,
      review_count: entry.review_count ?? 0,
      successful_retrievals: entry.successful_retrievals ?? 0,
      failed_retrievals: entry.failed_retrievals ?? 0,
      current_streak: entry.current_streak ?? 0,
      average_response_time: entry.average_response_time ?? 0,
      skill_performance: entry.skill_performance,
      maintenance_stage: entry.maintenance_stage,
      item_mastery: entry.item_mastery,
      format_a: entry.format_a,
      created_at: createdAt,
      updated_at: updatedAt,
    };

    return { card, atomicRecords: [singleRecord] };
  }

  /**
   * Synchronizes the parent CardDisplayData whenever one of its
   * constituent atomic records is updated.
   */
  private syncCardForAtomicRecord(record: AtomicVocabularyRecord): void {
    if (!record.card_id) return;
    const cardIndex = this.cards.findIndex(
      (c) => c.id === record.card_id || (c.atomic_record_ids && c.atomic_record_ids.includes(record.id)),
    );
    if (cardIndex === -1) return;

    const card = this.cards[cardIndex];
    const siblings = this.items.filter(
      (it) => it.card_id === card.id || card.atomic_record_ids.includes(it.id),
    );

    if (siblings.length === 0) return;

    // Card presentation level represents the minimum level of its atomic items
    const minLevel = Math.min(...siblings.map((s) => s.level ?? 0)) as VocabLevel;

    // Earliest next_review_at
    const validNextDates = siblings
      .map((s) => s.next_review_at)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime());

    const earliestNext =
      validNextDates.length > 0 ? new Date(Math.min(...validNextDates)).toISOString() : undefined;

    // Most recent last_review_at
    const validLastDates = siblings
      .map((s) => s.last_review_at)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime());

    const latestLast =
      validLastDates.length > 0 ? new Date(Math.max(...validLastDates)).toISOString() : null;

    const totalReviewCount = siblings.reduce((sum, s) => sum + (s.review_count ?? 0), 0);
    const totalSuccess = siblings.reduce((sum, s) => sum + (s.successful_retrievals ?? 0), 0);
    const totalFailed = siblings.reduce((sum, s) => sum + (s.failed_retrievals ?? 0), 0);
    const minStreak = Math.min(...siblings.map((s) => s.current_streak ?? 0));

    this.cards[cardIndex] = {
      ...card,
      level: minLevel,
      next_review_at: earliestNext,
      last_review_at: latestLast,
      review_count: totalReviewCount,
      successful_retrievals: totalSuccess,
      failed_retrievals: totalFailed,
      current_streak: minStreak,
      updated_at: new Date(),
    };
  }

  /**
   * Reconciles cards and atomic items to ensure strict consistency.
   */
  private reconcileCardsAndItems(): void {
    // If any item has no matching card, create one
    for (const item of this.items) {
      const hasCard = this.cards.some(
        (c) => c.id === item.card_id || (c.atomic_record_ids && c.atomic_record_ids.includes(item.id)),
      );
      if (!hasCard) {
        const { card } = this.decomposeEntry(item);
        item.card_id = card.id;
        this.cards.push(card);
      }
    }

    // Synchronize all cards with their atomic records
    for (const card of this.cards) {
      const records = this.items.filter(
        (it) => it.card_id === card.id || (card.atomic_record_ids && card.atomic_record_ids.includes(it.id)),
      );
      if (records.length > 0) {
        card.atomic_record_ids = Array.from(new Set(records.map((r) => r.id)));
        card.level = Math.min(...records.map((r) => r.level ?? 0)) as VocabLevel;
        const nextReviewTimes = records
          .map((r) => r.next_review_at)
          .filter(Boolean)
          .map((d) => new Date(d!).getTime());
        if (nextReviewTimes.length > 0) {
          card.next_review_at = new Date(Math.min(...nextReviewTimes)).toISOString();
        }
      }
    }
  }

  /**
   * Merges duplicate copies of an atomic vocabulary record created by previous reload bugs.
   * Keeps the record with the most advanced/recent valid SRS state while preserving user edits.
   */
  private mergeDuplicateRecords(
    a: AtomicVocabularyRecord,
    b: AtomicVocabularyRecord,
  ): AtomicVocabularyRecord {
    const timeA = a.last_review_at ? new Date(a.last_review_at).getTime() : 0;
    const timeB = b.last_review_at ? new Date(b.last_review_at).getTime() : 0;
    const countA = a.review_count ?? 0;
    const countB = b.review_count ?? 0;
    const levelA = a.level ?? 0;
    const levelB = b.level ?? 0;

    const bIsMoreAdvanced =
      countB > countA ||
      (countB === countA && timeB > timeA) ||
      (countB === countA && timeB === timeA && levelB > levelA);

    const base: AtomicVocabularyRecord = bIsMoreAdvanced ? { ...b } : { ...a };
    const other: AtomicVocabularyRecord = bIsMoreAdvanced ? a : b;

    base.review_count = Math.max(countA, countB);
    base.successful_retrievals = Math.max(
      a.successful_retrievals ?? 0,
      b.successful_retrievals ?? 0,
    );
    base.failed_retrievals = Math.max(
      a.failed_retrievals ?? 0,
      b.failed_retrievals ?? 0,
    );
    base.current_streak = Math.max(
      a.current_streak ?? 0,
      b.current_streak ?? 0,
    );

    if (bIsMoreAdvanced) {
      base.level = b.level;
      base.next_review_at = b.next_review_at || a.next_review_at;
      base.last_review_at = b.last_review_at || a.last_review_at;
    } else {
      base.level = a.level;
      base.next_review_at = a.next_review_at || b.next_review_at;
      base.last_review_at = a.last_review_at || b.last_review_at;
    }

    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (createdA > 0 && createdB > 0) {
      base.created_at = createdA <= createdB ? a.created_at : b.created_at;
    }

    const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    base.updated_at = updatedA >= updatedB ? a.updated_at : b.updated_at;

    // Preserve Format A user edits
    if (!base.format_a && other.format_a) {
      base.format_a = other.format_a;
    } else if (base.format_a && other.format_a) {
      base.format_a = {
        ...other.format_a,
        ...base.format_a,
        meaning_en: base.format_a.meaning_en || other.format_a.meaning_en,
        meaning_vi: base.format_a.meaning_vi || other.format_a.meaning_vi,
        example: base.format_a.example || other.format_a.example,
        examples: base.format_a.examples || other.format_a.examples,
        synonyms: base.format_a.synonyms || other.format_a.synonyms,
        antonyms: base.format_a.antonyms || other.format_a.antonyms,
        collocations: base.format_a.collocations || other.format_a.collocations,
      };
    }

    // Clean up cross-gender grammar fields if present in an atomic adjective record
    if (base.part_of_speech === PartOfSpeech.Adjective && base.format_a?.grammar) {
      const g = { ...base.format_a.grammar } as any;
      if (base.gender === Gender.Masculine || base.id.endsWith('-masc')) {
        delete g.feminine;
      } else if (base.gender === Gender.Feminine || base.id.endsWith('-fem')) {
        delete g.masculine;
      }
      base.format_a.grammar = g;
    }

    return base;
  }

  /**
   * Merges duplicate copies of a card created by previous reload bugs.
   */
  private mergeDuplicateCards(
    a: CardDisplayData,
    b: CardDisplayData,
  ): CardDisplayData {
    const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    const base: CardDisplayData = timeB > timeA ? { ...b } : { ...a };
    const other: CardDisplayData = timeB > timeA ? a : b;

    const combinedIds = Array.from(
      new Set([...(a.atomic_record_ids || []), ...(b.atomic_record_ids || [])]),
    );
    base.atomic_record_ids = combinedIds;

    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (createdA > 0 && createdB > 0) {
      base.created_at = createdA <= createdB ? a.created_at : b.created_at;
    }

    if (!base.format_a && other.format_a) {
      base.format_a = other.format_a;
    }
    return base;
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.items = [];
        this.cards = [];
        return;
      }

      // Purge all legacy trial vocabulary and session data
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        if (localStorage.getItem(legacyKey)) {
          localStorage.removeItem(legacyKey);
        }
      }

      const rawItems = localStorage.getItem(STORAGE_KEY_ITEMS);
      const rawCards = localStorage.getItem(STORAGE_KEY_CARDS);

      let parsedItems: any[] = [];
      let parsedCards: any[] = [];

      if (rawItems) {
        try {
          const p = JSON.parse(rawItems);
          if (Array.isArray(p)) parsedItems = p;
        } catch (e) {
          console.warn('Failed to parse items from storage:', e);
        }
      }

      if (rawCards) {
        try {
          const p = JSON.parse(rawCards);
          if (Array.isArray(p)) parsedCards = p;
        } catch (e) {
          console.warn('Failed to parse cards from storage:', e);
        }
      }

      // Filter out any legacy dummy seed items
      parsedItems = parsedItems.filter(
        (item) => typeof item.id === 'string' && !item.id.startsWith('vocab-'),
      );
      parsedCards = parsedCards.filter(
        (card) => typeof card.id === 'string' && !card.id.startsWith('vocab-'),
      );

      // ── STEP 1: SELF-HEALING DEDUPLICATION ─────────────────────────────
      // Merge duplicate records sharing the same ID created by previous reload bugs
      const itemMap = new Map<string, AtomicVocabularyRecord>();
      for (const rawItem of parsedItems) {
        if (!rawItem || typeof rawItem.id !== 'string') continue;
        const id = rawItem.id;
        if (!itemMap.has(id)) {
          itemMap.set(id, rawItem);
        } else {
          const existing = itemMap.get(id)!;
          const merged = this.mergeDuplicateRecords(existing, rawItem);
          itemMap.set(id, merged);
        }
      }
      parsedItems = Array.from(itemMap.values());

      const cardMap = new Map<string, CardDisplayData>();
      for (const rawCard of parsedCards) {
        if (!rawCard || typeof rawCard.id !== 'string') continue;
        const id = rawCard.id;
        if (!cardMap.has(id)) {
          cardMap.set(id, rawCard);
        } else {
          const existing = cardMap.get(id)!;
          const merged = this.mergeDuplicateCards(existing, rawCard);
          cardMap.set(id, merged);
        }
      }
      parsedCards = Array.from(cardMap.values());

      // Sanitize cross-gender fields on all atomic adjective records
      for (const item of parsedItems) {
        if (item.part_of_speech === PartOfSpeech.Adjective && item.format_a?.grammar) {
          const g = { ...item.format_a.grammar } as any;
          if (item.gender === Gender.Masculine || item.id.endsWith('-masc')) {
            delete g.feminine;
          } else if (item.gender === Gender.Feminine || item.id.endsWith('-fem')) {
            delete g.masculine;
          }
          item.format_a.grammar = g;
        }
      }

      // ── STEP 2: LEGACY MIGRATION CHECK ─────────────────────────────────
      // Only runs if cards are completely missing AND items exist (first-time migration from v1)
      // OR if any remaining item is a genuine legacy combined entry:
      const needsMigration =
        (parsedCards.length === 0 && parsedItems.length > 0) ||
        parsedItems.some((item) => this.isCombinedEntry(item));

      if (needsMigration) {
        const migratedItemsMap = new Map<string, AtomicVocabularyRecord>();
        const migratedCardsMap = new Map<string, CardDisplayData>();

        for (const c of parsedCards) {
          migratedCardsMap.set(c.id, c);
        }

        for (const item of parsedItems) {
          if (this.isCombinedEntry(item)) {
            const { card, atomicRecords } = this.decomposeEntry(item);
            if (!migratedCardsMap.has(card.id)) {
              migratedCardsMap.set(card.id, card);
            }
            for (const rec of atomicRecords) {
              if (!migratedItemsMap.has(rec.id)) {
                migratedItemsMap.set(rec.id, rec);
              } else {
                migratedItemsMap.set(rec.id, this.mergeDuplicateRecords(migratedItemsMap.get(rec.id)!, rec));
              }
            }
          } else {
            if (!migratedItemsMap.has(item.id)) {
              migratedItemsMap.set(item.id, item);
            } else {
              migratedItemsMap.set(item.id, this.mergeDuplicateRecords(migratedItemsMap.get(item.id)!, item));
            }
          }
        }

        this.items = Array.from(migratedItemsMap.values()).map((it) => this.ensureSrsFields(it));
        this.cards = Array.from(migratedCardsMap.values());
        this.reconcileCardsAndItems();
        this.saveToStorage();
        return;
      }

      this.items = parsedItems.map((it) => this.ensureSrsFields(it));
      this.cards = parsedCards;
      this.reconcileCardsAndItems();
      this.saveToStorage();
    } catch (e) {
      console.error('Failed to load Master Vocabulary List from storage:', e);
      this.items = [];
      this.cards = [];
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(this.items));
        localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(this.cards));
      }
    } catch (e) {
      console.error('Failed to save Master Vocabulary List to storage:', e);
    }
    this.notify();
  }

  private notify(): void {
    const itemSnapshot = this.getAllItems();
    for (const listener of this.listeners) {
      try {
        listener(itemSnapshot);
      } catch (err) {
        console.error('Error in MasterVocabularyService listener:', err);
      }
    }

    const cardSnapshot = this.getAllCards();
    for (const listener of this.cardListeners) {
      try {
        listener(cardSnapshot);
      } catch (err) {
        console.error('Error in MasterVocabularyService cardListener:', err);
      }
    }
  }

  /**
   * Subscribe to changes in the Atomic Vocabulary Memory List.
   * Source of truth for games, SRS retrieval, and algorithms.
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getAllItems());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to changes in the Card Display Data List.
   * Source of truth for card presentation in the UI catalog.
   */
  public subscribeCards(listener: CardListener): () => void {
    this.cardListeners.add(listener);
    listener(this.getAllCards());
    return () => {
      this.cardListeners.delete(listener);
    };
  }

  /**
   * Returns a copy of all Atomic Vocabulary Records.
   * Games and SRS retrieval consume this.
   */
  public getAllItems(): AtomicVocabularyRecord[] {
    return [...this.items];
  }

  public getAll(): AtomicVocabularyRecord[] {
    return this.getAllItems();
  }

  /**
   * Returns a copy of all Card Display Data items.
   * Card catalog UI consumes this.
   */
  public getAllCards(): CardDisplayData[] {
    return [...this.cards];
  }

  public getCards(): CardDisplayData[] {
    return this.getAllCards();
  }

  /**
   * Retrieves a single atomic vocabulary item by unique ID.
   * Each record is independently addressable.
   */
  public getItemById(id: UUID): AtomicVocabularyRecord | undefined {
    return this.items.find((item) => item.id === id);
  }

  /**
   * Retrieves a single card display representation by card ID.
   */
  public getCardById(id: UUID): CardDisplayData | undefined {
    return this.cards.find((card) => card.id === id);
  }

  /**
   * Retrieves all atomic vocabulary records belonging to a given card ID.
   */
  public getItemsByCardId(cardId: UUID): AtomicVocabularyRecord[] {
    const card = this.cards.find((c) => c.id === cardId);
    if (!card) {
      return this.items.filter((it) => it.card_id === cardId);
    }
    const ids = new Set(card.atomic_record_ids || []);
    return this.items.filter((it) => it.card_id === cardId || ids.has(it.id));
  }

  /**
   * Retrieves all items filtered by specific SRS level (0–5).
   */
  public getItemsByLevel(level: VocabLevel): AtomicVocabularyRecord[] {
    return this.items.filter((item) => item.level === level);
  }

  /**
   * Returns all atomic items currently due for active retrieval.
   */
  public getDueItems(asOf: Date = new Date()): AtomicVocabularyRecord[] {
    return this.items
      .filter((it) => srsEngineService.isDue(it.next_review_at || '', asOf))
      .sort(
        (a, b) =>
          new Date(a.next_review_at || 0).getTime() -
          new Date(b.next_review_at || 0).getTime(),
      );
  }

  /**
   * Calculates live statistics across all atomic items in the Master List.
   */
  public getStatistics(): VocabularyStatistics {
    return calculateVocabularyStats(this.items);
  }

  /**
   * Adds an entry to the Master List.
   * Decomposes combined entries into CardDisplayData and AtomicVocabularyRecord(s).
   */
  public addItem(entry: VocabularyItem | CardDisplayData): VocabularyItem {
    const { card, atomicRecords } = this.decomposeEntry(entry);

    // Upsert card
    const existingCardIndex = this.cards.findIndex((c) => c.id === card.id);
    if (existingCardIndex >= 0) {
      this.cards[existingCardIndex] = { ...card, updated_at: new Date() };
    } else {
      this.cards = [card, ...this.cards];
    }

    // Upsert atomic records
    for (const rec of atomicRecords) {
      const withSrs = this.ensureSrsFields(rec);
      const existingIndex = this.items.findIndex((it) => it.id === withSrs.id);
      if (existingIndex >= 0) {
        this.items[existingIndex] = { ...withSrs, updated_at: new Date() };
      } else {
        this.items = [withSrs, ...this.items];
      }
    }

    this.saveToStorage();
    return atomicRecords[0];
  }

  /**
   * Directly adds an atomic vocabulary item.
   */
  public addAtomicItem(record: AtomicVocabularyRecord): AtomicVocabularyRecord {
    const withSrs = this.ensureSrsFields(record);
    const existingIndex = this.items.findIndex((it) => it.id === withSrs.id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = { ...withSrs, updated_at: new Date() };
    } else {
      this.items = [withSrs, ...this.items];
    }

    // Ensure matching card exists or syncs
    if (withSrs.card_id) {
      this.syncCardForAtomicRecord(withSrs);
    } else {
      const { card } = this.decomposeEntry(withSrs);
      withSrs.card_id = card.id;
      this.cards.push(card);
    }

    this.saveToStorage();
    return withSrs;
  }

  /**
   * Records the outcome of an active retrieval review for an individual atomic item.
   * Computes SRS state transition and synchronizes the parent card representation.
   */
  public recordRetrieval(
    id: UUID,
    input: RetrievalEvaluationInput,
    now: Date = new Date(),
  ): AtomicVocabularyRecord | undefined {
    const item = this.getItemById(id);
    if (!item) return undefined;

    const currentSrsData: SrsMemoryData = {
      level: item.level,
      last_review_at: item.last_review_at,
      next_review_at: item.next_review_at || now.toISOString(),
      review_count: item.review_count ?? 0,
      successful_retrievals: item.successful_retrievals ?? 0,
      failed_retrievals: item.failed_retrievals ?? 0,
      current_streak: item.current_streak ?? 0,
      average_response_time: item.average_response_time ?? 0,
      skill_performance:
        item.skill_performance || srsEngineService.createEmptySkillPerformance(item.part_of_speech, item),
      maintenance_stage: item.maintenance_stage,
    };

    const evaluated = srsEngineService.evaluateRetrieval(currentSrsData, input, now, item);

    const updatedItem: AtomicVocabularyRecord = {
      ...item,
      level: evaluated.level,
      last_review_at: evaluated.last_review_at,
      next_review_at: evaluated.next_review_at,
      review_count: evaluated.review_count,
      successful_retrievals: evaluated.successful_retrievals,
      failed_retrievals: evaluated.failed_retrievals,
      current_streak: evaluated.current_streak,
      average_response_time: evaluated.average_response_time,
      skill_performance: evaluated.skill_performance,
      maintenance_stage: evaluated.maintenance_stage,
      item_mastery: evaluated.item_mastery,
      updated_at: now,
    };

    const existingIndex = this.items.findIndex((it) => it.id === id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = updatedItem;
    } else {
      this.items = [updatedItem, ...this.items];
    }

    this.syncCardForAtomicRecord(updatedItem);
    this.saveToStorage();
    return updatedItem;
  }

  /**
   * Records an active retrieval for an individual conjugation unit of a verb (§5, §8).
   * Updates only that unit's SRS state and keeps the parent verb synchronized.
   */
  public recordConjugationRetrieval(
    id: UUID,
    person: VerbConjugationPerson,
    input: RetrievalEvaluationInput,
    now: Date = new Date(),
  ): AtomicVocabularyRecord | undefined {
    const item = this.getItemById(id);
    if (!item || item.part_of_speech !== PartOfSpeech.Verb) return undefined;

    const { updatedItem } = evaluateConjugationRetrieval(item, person, input, now);
    const existingIndex = this.items.findIndex((it) => it.id === id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = updatedItem;
      this.syncCardForAtomicRecord(updatedItem);
      this.saveToStorage();
    }
    return updatedItem;
  }

  /**
   * Updates an existing atomic vocabulary item.
   */
  public updateItem(
    id: UUID,
    updates: Partial<AtomicVocabularyRecord>,
  ): AtomicVocabularyRecord | undefined {
    const index = this.items.findIndex((it) => it.id === id);
    if (index === -1) return undefined;

    const updated = {
      ...this.items[index],
      ...updates,
      updated_at: new Date(),
    };
    this.items[index] = updated;
    this.syncCardForAtomicRecord(updated);
    this.saveToStorage();
    return updated;
  }

  /**
   * Manually sets the SRS memory level (0–5) of an atomic item.
   * Recalculates next_review_at interval accordingly and synchronizes parent card.
   */
  public updateItemLevel(id: UUID, level: VocabLevel): AtomicVocabularyRecord | undefined {
    const item = this.getItemById(id);
    if (!item) return undefined;

    const now = new Date();
    const intervalMs = MEMORY_LEVELS_META[level].baselineIntervalMs;
    const nextReview = new Date(now.getTime() + intervalMs);

    return this.updateItem(id, {
      level,
      next_review_at: nextReview.toISOString(),
    });
  }

  /**
   * Helper to locate both the card and all constituent atomic records for an ID.
   */
  public resolveCardAndAtomicRecords(idOrCardId: UUID): {
    card?: CardDisplayData;
    atomicRecords: AtomicVocabularyRecord[];
  } {
    let card = this.cards.find((c) => c.id === idOrCardId);
    let atomicRecords: AtomicVocabularyRecord[] = [];

    if (card) {
      const ids = new Set(card.atomic_record_ids || []);
      atomicRecords = this.items.filter(
        (it) => it.card_id === card!.id || ids.has(it.id),
      );
    } else {
      const atomicItem = this.items.find((it) => it.id === idOrCardId);
      if (atomicItem) {
        atomicRecords = [atomicItem];
        if (atomicItem.card_id) {
          card = this.cards.find(
            (c) =>
              c.id === atomicItem.card_id ||
              (c.atomic_record_ids && c.atomic_record_ids.includes(atomicItem.id)),
          );
          if (card) {
            const ids = new Set(card.atomic_record_ids || []);
            atomicRecords = this.items.filter(
              (it) => it.card_id === card!.id || ids.has(it.id),
            );
          }
        }
      }
    }

    return { card, atomicRecords };
  }

  /**
   * Inline editing of meaning: Updates the meaning in Format A across the card
   * and all constituent atomic memory records.
   */
  public updateMeaning(
    idOrCardId: UUID,
    field: 'en' | 'vi' | 'trc_en' | 'trc_vi' | 'sau_en' | 'sau_vi',
    value: string,
  ): { card?: CardDisplayData; atomicRecords: AtomicVocabularyRecord[] } | undefined {
    const { card, atomicRecords } = this.resolveCardAndAtomicRecords(idOrCardId);
    if (!card && atomicRecords.length === 0) return undefined;

    const applyToFormatA = (formatA?: FormatAData): void => {
      if (!formatA) return;
      if (field === 'en') {
        formatA.meaning_en = value;
      } else if (field === 'vi') {
        formatA.meaning_vi = value;
      } else if (field === 'trc_en') {
        if (!formatA.trc_meaning) formatA.trc_meaning = {};
        formatA.trc_meaning.en = value;
        if (formatA.grammar?.pos === PartOfSpeech.Adjective) {
          const adjG = formatA.grammar as any;
          if (adjG.before_entry) adjG.before_entry.meaning_en = value;
        }
      } else if (field === 'trc_vi') {
        if (!formatA.trc_meaning) formatA.trc_meaning = {};
        formatA.trc_meaning.vi = value;
        if (formatA.grammar?.pos === PartOfSpeech.Adjective) {
          const adjG = formatA.grammar as any;
          if (adjG.before_entry) adjG.before_entry.meaning_vi = value;
        }
      } else if (field === 'sau_en') {
        if (!formatA.sau_meaning) formatA.sau_meaning = {};
        formatA.sau_meaning.en = value;
        if (formatA.grammar?.pos === PartOfSpeech.Adjective) {
          const adjG = formatA.grammar as any;
          if (adjG.after_entry) adjG.after_entry.meaning_en = value;
        }
      } else if (field === 'sau_vi') {
        if (!formatA.sau_meaning) formatA.sau_meaning = {};
        formatA.sau_meaning.vi = value;
        if (formatA.grammar?.pos === PartOfSpeech.Adjective) {
          const adjG = formatA.grammar as any;
          if (adjG.after_entry) adjG.after_entry.meaning_vi = value;
        }
      }
    };

    if (card && card.format_a) {
      applyToFormatA(card.format_a);
      card.updated_at = new Date();
    }

    for (const rec of atomicRecords) {
      if (rec.format_a) {
        applyToFormatA(rec.format_a);
        rec.updated_at = new Date();
      }
    }

    this.saveToStorage();
    return { card, atomicRecords };
  }

  /**
   * Inline editing of synonym text and/or gender.
   * Updates all corresponding records in memory and storage.
   */
  public updateSynonym(
    idOrCardId: UUID,
    index: number,
    text?: string,
    gender?: RelatedWordGender,
    context?: 'before' | 'after',
  ): { card?: CardDisplayData; atomicRecords: AtomicVocabularyRecord[] } | undefined {
    return this.updateRelatedWord(idOrCardId, 'synonyms', index, text, gender, context);
  }

  /**
   * Inline editing of antonym text and/or gender.
   * Updates all corresponding records in memory and storage.
   */
  public updateAntonym(
    idOrCardId: UUID,
    index: number,
    text?: string,
    gender?: RelatedWordGender,
    context?: 'before' | 'after',
  ): { card?: CardDisplayData; atomicRecords: AtomicVocabularyRecord[] } | undefined {
    return this.updateRelatedWord(idOrCardId, 'antonyms', index, text, gender, context);
  }

  private updateRelatedWord(
    idOrCardId: UUID,
    type: 'synonyms' | 'antonyms',
    index: number,
    text?: string,
    gender?: RelatedWordGender,
    context?: 'before' | 'after',
  ): { card?: CardDisplayData; atomicRecords: AtomicVocabularyRecord[] } | undefined {
    const { card, atomicRecords } = this.resolveCardAndAtomicRecords(idOrCardId);
    if (!card && atomicRecords.length === 0) return undefined;

    const applyToArray = (arr?: (string | LexicalRelatedWord)[]): void => {
      if (!arr || index < 0 || index >= arr.length) return;
      const current = normalizeRelatedWord(arr[index]);
      if (text !== undefined) current.word = text;
      if (gender !== undefined) current.gender = gender;
      arr[index] = current;
    };

    const applyToFormatA = (formatA?: FormatAData): void => {
      if (!formatA) return;
      if (context === 'before' && formatA.grammar?.pos === PartOfSpeech.Adjective) {
        const adjG = formatA.grammar as any;
        if (adjG.before_entry) applyToArray(adjG.before_entry[type]);
        else applyToArray(formatA[type]);
      } else if (context === 'after' && formatA.grammar?.pos === PartOfSpeech.Adjective) {
        const adjG = formatA.grammar as any;
        if (adjG.after_entry) applyToArray(adjG.after_entry[type]);
        else applyToArray(formatA[type]);
      } else {
        applyToArray(formatA[type]);
      }
    };

    if (card && card.format_a) {
      applyToFormatA(card.format_a);
      card.updated_at = new Date();
    }

    for (const rec of atomicRecords) {
      if (rec.format_a) {
        applyToFormatA(rec.format_a);
        rec.updated_at = new Date();
      }
    }

    this.saveToStorage();
    return { card, atomicRecords };
  }

  /**
   * Removes a card and all of its associated atomic records.
   */
  public removeCard(cardId: UUID): boolean {
    const card = this.cards.find((c) => c.id === cardId);
    const prevCardCount = this.cards.length;
    this.cards = this.cards.filter((c) => c.id !== cardId);

    if (card && card.atomic_record_ids) {
      const idsToRemove = new Set(card.atomic_record_ids);
      this.items = this.items.filter((it) => !idsToRemove.has(it.id) && it.card_id !== cardId);
    } else {
      this.items = this.items.filter((it) => it.card_id !== cardId && it.id !== cardId);
    }

    if (this.cards.length !== prevCardCount) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Removes an item from the Master Vocabulary List by ID.
   * If the ID is a card ID, removes the card and its atomic items.
   * If the ID is an atomic record ID, removes that record and updates parent card.
   */
  public removeItem(id: UUID): boolean {
    // If id matches a card, remove the whole card and its atomic records
    if (this.cards.some((c) => c.id === id)) {
      return this.removeCard(id);
    }

    // Otherwise remove the specific atomic item
    const item = this.items.find((it) => it.id === id);
    if (!item) return false;

    this.items = this.items.filter((it) => it.id !== id);

    // Update parent card
    if (item.card_id) {
      const parentCard = this.cards.find((c) => c.id === item.card_id);
      if (parentCard) {
        const remaining = this.items.filter((it) => it.card_id === item.card_id);
        if (remaining.length === 0) {
          this.cards = this.cards.filter((c) => c.id !== item.card_id);
        } else {
          parentCard.atomic_record_ids = remaining.map((r) => r.id);
          parentCard.level = Math.min(...remaining.map((r) => r.level ?? 0)) as VocabLevel;
        }
      }
    }

    this.saveToStorage();
    return true;
  }

  /**
   * Clears all items and cards from storage.
   */
  public clearAll(): void {
    this.items = [];
    this.cards = [];
    this.saveToStorage();
  }

  /**
   * Searches the Master Vocabulary List based on spelling similarity.
   */
  public searchBySpelling(query: string): AtomicVocabularyRecord[] {
    return searchBySpelling(this.items, query);
  }

  /**
   * Returns a clean list of base/surface words that the user has already learned.
   */
  public getLearnedWords(): { id: UUID; word: string; pos: string; level: VocabLevel }[] {
    return this.items.map((item) => {
      const cleanWord = item.surface_form
        .replace(/\s*\(n,\s*(mas|fem)\)/i, '')
        .replace(/^(un|une|le|la|les|des|l'|l’)\s+/i, '')
        .trim()
        .toLowerCase();

      return {
        id: item.id,
        word: cleanWord,
        pos: item.part_of_speech,
        level: item.level,
      };
    });
  }
}

export const masterVocabularyService = new MasterVocabularyService();
