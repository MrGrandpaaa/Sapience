import { UUID, PartOfSpeech } from '../models/types';
import {
  VocabularyItem,
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
import { searchBySpelling } from '../../utils/spellingSearch';

const STORAGE_KEY = 'sapience_vocab_items_v1';
const LEGACY_STORAGE_KEYS = [
  'french-vocab-items-v2',
  'french-vocab-items',
  'french_vocab_target_review_quantity',
  'french_vocab_active_session_v1',
  'french_vocab_review_attempt_records_v1',
  'french_vocab_daily_streak_v1',
];

type Listener = (items: VocabularyItem[]) => void;

/**
 * Master Vocabulary Service.
 *
 * Single source of truth for the persistent Master Vocabulary List.
 * Accessible by:
 * - UI hooks (useVocabulary)
 * - Game engines & review sessions
 * - Cloze test generators
 * - Natural example generator (for context-aware vocabulary reuse)
 *
 * Each saved item maintains its distinct lexical identity separate from spelling.
 */
class MasterVocabularyService {
  private items: VocabularyItem[] = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.initialized) return;
    this.loadFromStorage();
    this.initialized = true;
  }

  private ensureSrsFields(item: VocabularyItem): VocabularyItem {
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

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.items = [];
        return;
      }
      // Purge all legacy trial vocabulary and session data to guarantee 0 initial words
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        if (localStorage.getItem(legacyKey)) {
          localStorage.removeItem(legacyKey);
        }
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filter out any legacy dummy seed items (e.g. id starts with vocab-)
          const userItems = parsed
            .filter(
              (item: VocabularyItem) =>
                typeof item.id === 'string' && !item.id.startsWith('vocab-'),
            )
            .map((item: VocabularyItem) => this.ensureSrsFields(item));

          this.items = userItems;
          this.saveToStorage();
          return;
        }
      }
      this.items = [];
    } catch (e) {
      console.error('Failed to load Master Vocabulary List from storage:', e);
      this.items = [];
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
      }
    } catch (e) {
      console.error('Failed to save Master Vocabulary List to storage:', e);
    }
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getAllItems();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in MasterVocabularyService listener:', err);
      }
    }
  }

  /**
   * Subscribe to changes in the Master Vocabulary List.
   * Returns an unsubscribe callback.
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Immediate callback with current snapshot
    listener(this.getAllItems());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Returns a copy of all saved vocabulary items.
   */
  public getAllItems(): VocabularyItem[] {
    return [...this.items];
  }

  public getAll(): VocabularyItem[] {
    return this.getAllItems();
  }

  /**
   * Retrieves a single vocabulary item by unique ID.
   */
  public getItemById(id: UUID): VocabularyItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  /**
   * Retrieves all items filtered by specific SRS level (0–5).
   */
  public getItemsByLevel(level: VocabLevel): VocabularyItem[] {
    return this.items.filter((item) => item.level === level);
  }

  /**
   * Returns all items currently due for active retrieval.
   */
  public getDueItems(asOf: Date = new Date()): VocabularyItem[] {
    return this.items
      .filter((it) => srsEngineService.isDue(it.next_review_at || '', asOf))
      .sort(
        (a, b) =>
          new Date(a.next_review_at || 0).getTime() -
          new Date(b.next_review_at || 0).getTime(),
      );
  }

  /**
   * Calculates live statistics across all items in the Master List.
   */
  public getStatistics(): VocabularyStatistics {
    return calculateVocabularyStats(this.items);
  }

  /**
   * Adds a new vocabulary item to the Master List.
   * Preserves distinct lexical identity and initializes SRS memory data.
   */
  public addItem(item: VocabularyItem): VocabularyItem {
    const itemWithSrs = this.ensureSrsFields(item);
    const existingIndex = this.items.findIndex((it) => it.id === itemWithSrs.id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = { ...itemWithSrs, updated_at: new Date() };
    } else {
      this.items = [itemWithSrs, ...this.items];
    }
    this.saveToStorage();
    return itemWithSrs;
  }

  /**
   * Records the outcome of an active retrieval review for an item.
   * Computes SRS state transition and schedules next review timestamp.
   */
  public recordRetrieval(
    id: UUID,
    input: RetrievalEvaluationInput,
    now: Date = new Date(),
  ): VocabularyItem | undefined {
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

    const updatedItem: VocabularyItem = {
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

    return this.addItem(updatedItem);
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
  ): VocabularyItem | undefined {
    const item = this.getItemById(id);
    if (!item || item.part_of_speech !== PartOfSpeech.Verb) return undefined;

    const { updatedItem } = evaluateConjugationRetrieval(item, person, input, now);
    const existingIndex = this.items.findIndex((it) => it.id === id);
    if (existingIndex >= 0) {
      this.items[existingIndex] = updatedItem;
      this.saveToStorage();
    }
    return updatedItem;
  }

  /**
   * Updates an existing vocabulary item.
   */
  public updateItem(
    id: UUID,
    updates: Partial<VocabularyItem>,
  ): VocabularyItem | undefined {
    const index = this.items.findIndex((it) => it.id === id);
    if (index === -1) return undefined;

    const updated = {
      ...this.items[index],
      ...updates,
      updated_at: new Date(),
    };
    this.items[index] = updated;
    this.saveToStorage();
    return updated;
  }

  /**
   * Manually sets the SRS memory level (0–5) of an item.
   * Recalculates next_review_at interval accordingly.
   */
  public updateItemLevel(id: UUID, level: VocabLevel): VocabularyItem | undefined {
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
   * Removes an item from the Master Vocabulary List by ID.
   */
  public removeItem(id: UUID): boolean {
    const prevCount = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    if (this.items.length !== prevCount) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Clears all items from the Master List.
   */
  public clearAll(): void {
    this.items = [];
    this.saveToStorage();
  }

  /**
   * Searches the Master Vocabulary List based on spelling similarity.
   */
  public searchBySpelling(query: string): VocabularyItem[] {
    return searchBySpelling(this.items, query);
  }

  /**
   * Returns a clean list of base/surface words that the user has already learned.
   * Used by example generators, games, and cloze tests to enable repeated exposure
   * without unnatural forcing.
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
