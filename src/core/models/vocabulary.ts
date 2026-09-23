import { UUID, Timestamp, PartOfSpeech, Gender } from './types.js';
import { FormatAData } from './lexical.js';
import { MemoryLevel, SkillPerformance, ItemMasteryStatus } from './srs.js';
import type { VerbConjugationPerson, VerbConjugationUnit } from '../services/verbConjugationService';
import type { AdjectiveTargetUnit } from '../services/adjectivePresentationService';

export type VocabLevel = MemoryLevel;

/**
 * ATOMIC VOCABULARY MEMORY DATA
 *
 * Each independently testable lexical item is stored separately.
 * Single source of truth for games, SRS retrieval, audio, distractor generation, etc.
 *
 * Example:
 * Record A: word: "compagnon", gender: "masculine"
 * Record B: word: "compagne", gender: "feminine"
 */
export interface AtomicVocabularyRecord {
  id: UUID;
  card_id?: UUID; // Links this atomic item to its Card Display Data
  word?: string; // The atomic French word (e.g., "compagnon")
  surface_form: string; // The atomic word surface form (synonymous with word)
  normalized_form: string;
  part_of_speech: PartOfSpeech;
  gender?: Gender; // Specific gender (Masculine / Feminine, not Both)
  level: VocabLevel; // 0 | 1 | 2 | 3 | 4 | 5
  last_review_at?: string | null;
  next_review_at?: string;
  review_count?: number;
  successful_retrievals?: number;
  failed_retrievals?: number;
  current_streak?: number;
  average_response_time?: number; // in milliseconds
  skill_performance?: SkillPerformance;
  maintenance_stage?: number;
  item_mastery?: ItemMasteryStatus;
  format_a?: FormatAData;
  /** Independent conjugation SRS learning units for Verbs (§5, §7) */
  conjugation_units?: Record<VerbConjugationPerson, VerbConjugationUnit>;
  /** Independent positional SRS learning units for Adjectives (§7, §8) */
  positional_units?: {
    before?: AdjectivePositionalUnit;
    after?: AdjectivePositionalUnit;
  };
  /** Independent target SRS learning units for Adjectives (masculine / feminine) */
  adjective_units?: Record<string, AdjectiveTargetUnit>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * CARD DISPLAY DATA
 *
 * Used only to render the vocabulary card.
 * May combine related forms visually (e.g., "compagnon / compagne", "grand / grande").
 * Must NOT be used as the source of truth for game questions.
 */
export interface CardDisplayData {
  id: UUID; // Card ID
  display_title: string; // e.g. "compagnon / compagne"
  surface_form: string; // Combined surface form for card rendering
  word?: string; // Optional word representation
  normalized_form: string;
  part_of_speech: PartOfSpeech;
  gender?: Gender; // Gender.Both, Masculine, Feminine, etc.
  atomic_record_ids: UUID[]; // References to atomic vocabulary memory records
  level: VocabLevel; // Card presentation level
  next_review_at?: string; // Earliest review time among atomic records
  last_review_at?: string | null;
  review_count?: number;
  successful_retrievals?: number;
  failed_retrievals?: number;
  current_streak?: number;
  average_response_time?: number;
  skill_performance?: SkillPerformance;
  maintenance_stage?: number;
  item_mastery?: ItemMasteryStatus;
  format_a?: FormatAData;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Alias for AtomicVocabularyRecord across existing game engines, SRS engines, and services.
 * Every VocabularyItem in memory and storage is an atomic lexical record.
 */
export type VocabularyItem = AtomicVocabularyRecord;

/**
 * An independent positional learning unit for Adjectives with distinct meanings (§7, §8).
 */
export interface AdjectivePositionalUnit {
  position: 'before' | 'after';
  meaning_en?: string;
  meaning_vi?: string;
  level: VocabLevel;
  last_review_at?: string | null;
  next_review_at?: string;
  review_count?: number;
  current_streak?: number;
}

/**
 * Aggregated statistics across the vocabulary dataset.
 */
export interface VocabularyStatistics {
  total: number;
  level0: number; // Level 0 — New
  level1: number; // Level 1 — Initial Encoding
  level2: number; // Level 2 — Early Retention
  level3: number; // Level 3 — Intermediate Retention
  level4: number; // Level 4 — Consolidated Retention
  level5: number; // Level 5 — Long-Term Retention (Mastery)
  due_count: number; // Items currently due for review
}

/**
 * Calculates vocabulary statistics directly from a list of items.
 */
export function calculateVocabularyStats(
  items: (VocabularyItem | CardDisplayData)[],
  asOf: Date = new Date(),
): VocabularyStatistics {
  const stats: VocabularyStatistics = {
    total: items.length,
    level0: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
    level5: 0,
    due_count: 0,
  };

  const nowMs = asOf.getTime();

  for (const item of items) {
    switch (item.level) {
      case 0:
        stats.level0 += 1;
        break;
      case 1:
        stats.level1 += 1;
        break;
      case 2:
        stats.level2 += 1;
        break;
      case 3:
        stats.level3 += 1;
        break;
      case 4:
        stats.level4 += 1;
        break;
      case 5:
        stats.level5 += 1;
        break;
    }

    // Check if due
    if (item.next_review_at) {
      if (new Date(item.next_review_at).getTime() <= nowMs) {
        stats.due_count += 1;
      }
    } else if (item.level === 0) {
      stats.due_count += 1;
    }
  }

  return stats;
}
