import { PartOfSpeech } from '../models/types';
import { VocabLevel, VocabularyItem } from '../models/vocabulary';
import { FormatAVerbConjugation } from '../models/lexical';
import {
  RetrievalEvaluationInput,
  SkillPerformance,
  SrsMemoryData,
} from '../models/srs';
import { srsEngineService } from './srsEngineService';
import { isElisionNoun } from './nounPresentationService';

/**
 * Six present-tense conjugation persons (§3, §7):
 * - je
 * - tu
 * - il_elle_on (il / elle / on)
 * - nous
 * - vous
 * - ils_elles (ils / elles)
 */
export type VerbConjugationPerson =
  | 'je'
  | 'tu'
  | 'il_elle_on'
  | 'nous'
  | 'vous'
  | 'ils_elles';

export const ALL_VERB_CONJUGATION_PERSONS: VerbConjugationPerson[] = [
  'je',
  'tu',
  'il_elle_on',
  'nous',
  'vous',
  'ils_elles',
];

export const PERSON_DISPLAY_LABELS: Record<VerbConjugationPerson, string> = {
  je: 'je',
  tu: 'tu',
  il_elle_on: 'il / elle / on',
  nous: 'nous',
  vous: 'vous',
  ils_elles: 'ils / elles',
};

/**
 * Individual Spaced Repetition / Retrieval Unit for a conjugated verb form.
 *
 * Architecture (§5, §7):
 * Verb Family
 *   ├── conjugation unit: je
 *   ├── conjugation unit: tu
 *   ├── conjugation unit: il/elle/on
 *   ├── conjugation unit: nous
 *   ├── conjugation unit: vous
 *   └── conjugation unit: ils/elles
 *
 * Each unit has its own independent SRS state (level, next_review_at, streak, etc.).
 * Does NOT generate 6 independent cards on the vocabulary page.
 */
export interface VerbConjugationUnit {
  /** Unique ID: `${verbId}-conj-${person}` */
  id: string;
  /** Backlink to parent verb item */
  verb_id: string;
  verbId?: string;
  /** Grammatical person */
  person: VerbConjugationPerson;
  /** Standard display label: 'je', 'tu', 'il / elle / on', etc. */
  person_label: string;
  personLabel?: string;
  /** Bare conjugated verb form, e.g. "parle", "parles", "parlons" */
  conjugated_form: string;
  conjugatedForm?: string;
  /** Full combination text, e.g. "je parle", "j'aime", "tu parles", "nous parlons" */
  full_form_text: string;
  fullFormText?: string;

  // ── Independent SRS State (§7) ──
  level: VocabLevel;
  last_review_at?: string | null;
  lastReviewAt?: string | null;
  next_review_at?: string;
  nextReviewAt?: string;
  review_count?: number;
  reviewCount?: number;
  successful_retrievals?: number;
  successfulRetrievals?: number;
  failed_retrievals?: number;
  failedRetrievals?: number;
  current_streak?: number;
  currentStreak?: number;
  average_response_time?: number;
  averageResponseTime?: number;
  skill_performance?: SkillPerformance;
  skillPerformance?: SkillPerformance;
  maintenance_stage?: number;
  maintenanceStage?: number;
}

/**
 * Strips subject pronouns if user included them in the conjugation box.
 * Example: "je parle" -> "parle", "j'aime" -> "aime", "nous parlons" -> "parlons"
 */
export function cleanConjugatedForm(raw: string, person: VerbConjugationPerson): string {
  if (!raw) return '';
  let clean = raw.trim();

  switch (person) {
    case 'je':
      clean = clean.replace(/^(j'|j’|je\s+)/i, '');
      break;
    case 'tu':
      clean = clean.replace(/^tu\s+/i, '');
      break;
    case 'il_elle_on':
      clean = clean.replace(/^(il\s*\/\s*elle\s*\/\s*on\b|il\s+elle\s+on\b|il\s+|elle\s+|on\s+)/i, '');
      break;
    case 'nous':
      clean = clean.replace(/^nous\s+/i, '');
      break;
    case 'vous':
      clean = clean.replace(/^vous\s+/i, '');
      break;
    case 'ils_elles':
      clean = clean.replace(/^(ils\s*\/\s*elles\b|ils\s+elles\b|ils\s+|elles\s+)/i, '');
      break;
  }

  return clean.trim();
}

/**
 * Builds the natural French full subject + verb text.
 * Example:
 *   "parle", "je" -> "je parle"
 *   "aime", "je"  -> "j'aime"
 *   "parles", "tu" -> "tu parles"
 *   "parle", "il_elle_on" -> "il/elle/on parle"
 */
export function formatFullConjugationText(
  person: VerbConjugationPerson,
  conjugatedForm: string,
): string {
  const clean = cleanConjugatedForm(conjugatedForm, person);
  if (!clean) return '';

  if (person === 'je') {
    return isElisionNoun(clean) ? `j'${clean}` : `je ${clean}`;
  }
  if (person === 'il_elle_on') {
    return `il/elle/on ${clean}`;
  }
  if (person === 'ils_elles') {
    return `ils/elles ${clean}`;
  }
  return `${person} ${clean}`;
}

/**
 * Factory for a single VerbConjugationUnit.
 */
export function createConjugationUnit(
  verbId: string,
  person: VerbConjugationPerson,
  rawForm: string,
  initialLevel: VocabLevel = 0,
  initialSkillPerformance?: SkillPerformance,
): VerbConjugationUnit {
  const conjugated = cleanConjugatedForm(rawForm, person);
  const fullText = formatFullConjugationText(person, conjugated);
  const srs = srsEngineService.createInitialMemoryData(initialLevel, PartOfSpeech.Verb);

  const unit: VerbConjugationUnit = {
    id: `${verbId}-conj-${person}`,
    verb_id: verbId,
    verbId,
    person,
    person_label: PERSON_DISPLAY_LABELS[person],
    personLabel: PERSON_DISPLAY_LABELS[person],
    conjugated_form: conjugated,
    conjugatedForm: conjugated,
    full_form_text: fullText,
    fullFormText: fullText,

    level: initialLevel,
    last_review_at: null,
    lastReviewAt: null,
    next_review_at: srs.next_review_at,
    nextReviewAt: srs.next_review_at,
    review_count: 0,
    reviewCount: 0,
    successful_retrievals: 0,
    successfulRetrievals: 0,
    failed_retrievals: 0,
    failedRetrievals: 0,
    current_streak: 0,
    currentStreak: 0,
    average_response_time: 0,
    averageResponseTime: 0,
    skill_performance: initialSkillPerformance || srs.skill_performance,
    skillPerformance: initialSkillPerformance || srs.skill_performance,
    maintenance_stage: srs.maintenance_stage,
    maintenanceStage: srs.maintenance_stage,
  };

  return unit;
}

/**
 * Creates the complete family of 6 conjugation learning units for a verb.
 *
 * Even if some forms are empty (partial save §10), all 6 units are
 * initialized so the verb family structure (§7) is always consistent.
 */
export function createConjugationUnits(params: {
  id: string;
  surface_form?: string;
  conjugation?: Partial<FormatAVerbConjugation>;
  level?: VocabLevel;
}): Record<VerbConjugationPerson, VerbConjugationUnit> {
  const { id, conjugation, level = 0 } = params;
  const conj = conjugation || {};

  const units: Record<VerbConjugationPerson, VerbConjugationUnit> = {
    je: createConjugationUnit(id, 'je', conj.je || '', level),
    tu: createConjugationUnit(id, 'tu', conj.tu || '', level),
    il_elle_on: createConjugationUnit(
      id,
      'il_elle_on',
      conj.il_elle_on || conj.ilElleOn || '',
      level,
    ),
    nous: createConjugationUnit(id, 'nous', conj.nous || '', level),
    vous: createConjugationUnit(id, 'vous', conj.vous || '', level),
    ils_elles: createConjugationUnit(
      id,
      'ils_elles',
      conj.ils_elles || conj.ilsElles || '',
      level,
    ),
  };

  return units;
}

/**
 * Returns an array of the 6 conjugation units for a vocabulary item.
 * If the item does not yet have conjugation_units, reconstructs them.
 */
export function getConjugationUnitsList(item: VocabularyItem): VerbConjugationUnit[] {
  if (item.part_of_speech !== PartOfSpeech.Verb) {
    return [];
  }

  if (item.conjugation_units) {
    return ALL_VERB_CONJUGATION_PERSONS.map((p) => item.conjugation_units![p]).filter(Boolean);
  }

  const grammar = item.format_a?.grammar;
  const conjugation = grammar && 'conjugation' in grammar ? grammar.conjugation : undefined;
  const units = createConjugationUnits({
    id: item.id,
    surface_form: item.surface_form,
    conjugation,
    level: item.level,
  });

  return ALL_VERB_CONJUGATION_PERSONS.map((p) => units[p]);
}

/**
 * Returns conjugation units of a verb that are currently due for retrieval.
 */
export function getDueConjugationUnits(
  item: VocabularyItem,
  asOf: Date = new Date(),
): VerbConjugationUnit[] {
  const list = getConjugationUnitsList(item);
  const nowMs = asOf.getTime();

  return list.filter((unit) => {
    if (!unit.conjugated_form) return false;
    if (unit.level === 0) return true;
    if (!unit.next_review_at) return true;
    return new Date(unit.next_review_at).getTime() <= nowMs;
  });
}

/**
 * Selects an individual conjugation unit of a verb to be tested in a review/game.
 *
 * Priority (§8, §9):
 * 1. Due units with lowest level or oldest scheduled review
 * 2. Units with fewest total reviews (to balance practice across 6 forms)
 * 3. Falls back to round-robin among active non-empty forms
 */
export function selectConjugationUnitForReview(
  item: VocabularyItem,
  asOf: Date = new Date(),
): VerbConjugationUnit | null {
  const units = getConjugationUnitsList(item).filter((u) => Boolean(u.conjugated_form.trim()));
  if (units.length === 0) return null;

  // 1. Check due units
  const dueUnits = getDueConjugationUnits(item, asOf);
  if (dueUnits.length > 0) {
    // Sort due: lowest level first, then oldest next_review_at
    dueUnits.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      const aTime = a.next_review_at ? new Date(a.next_review_at).getTime() : 0;
      const bTime = b.next_review_at ? new Date(b.next_review_at).getTime() : 0;
      return aTime - bTime;
    });
    return dueUnits[0];
  }

  // 2. If none due, pick unit with lowest reviewCount to ensure even distribution
  units.sort((a, b) => (a.review_count ?? 0) - (b.review_count ?? 0));
  return units[0];
}

/**
 * Evaluates an active retrieval attempt for a specific conjugation unit (§5, §8).
 *
 * Only updates the SRS state of the tested person, keeping other 5 units intact.
 */
export function evaluateConjugationRetrieval(
  item: VocabularyItem,
  person: VerbConjugationPerson,
  input: RetrievalEvaluationInput,
  now: Date = new Date(),
): { updatedUnit: VerbConjugationUnit; updatedItem: VocabularyItem } {
  const units = item.conjugation_units || createConjugationUnits({
    id: item.id,
    surface_form: item.surface_form,
    conjugation: item.format_a?.grammar && 'conjugation' in item.format_a.grammar
      ? item.format_a.grammar.conjugation
      : undefined,
    level: item.level,
  });

  const targetUnit = units[person];

  const currentSrsData: SrsMemoryData = {
    level: targetUnit.level,
    last_review_at: targetUnit.last_review_at,
    next_review_at: targetUnit.next_review_at || now.toISOString(),
    review_count: targetUnit.review_count ?? 0,
    successful_retrievals: targetUnit.successful_retrievals ?? 0,
    failed_retrievals: targetUnit.failed_retrievals ?? 0,
    current_streak: targetUnit.current_streak ?? 0,
    average_response_time: targetUnit.average_response_time ?? 0,
    skill_performance:
      targetUnit.skill_performance ||
      srsEngineService.createEmptySkillPerformance(PartOfSpeech.Verb, item),
    maintenance_stage: targetUnit.maintenance_stage,
  };

  const evaluated = srsEngineService.evaluateRetrieval(currentSrsData, input, now, item);

  const updatedUnit: VerbConjugationUnit = {
    ...targetUnit,
    level: evaluated.level,
    last_review_at: evaluated.last_review_at,
    lastReviewAt: evaluated.last_review_at,
    next_review_at: evaluated.next_review_at,
    nextReviewAt: evaluated.next_review_at,
    review_count: evaluated.review_count,
    reviewCount: evaluated.review_count,
    successful_retrievals: evaluated.successful_retrievals,
    successfulRetrievals: evaluated.successful_retrievals,
    failed_retrievals: evaluated.failed_retrievals,
    failedRetrievals: evaluated.failed_retrievals,
    current_streak: evaluated.current_streak,
    currentStreak: evaluated.current_streak,
    average_response_time: evaluated.average_response_time,
    averageResponseTime: evaluated.average_response_time,
    skill_performance: evaluated.skill_performance,
    skillPerformance: evaluated.skill_performance,
    maintenance_stage: evaluated.maintenance_stage,
    maintenanceStage: evaluated.maintenance_stage,
  };

  const updatedUnits: Record<VerbConjugationPerson, VerbConjugationUnit> = {
    ...units,
    [person]: updatedUnit,
  };

  const updatedItem: VocabularyItem = {
    ...item,
    conjugation_units: updatedUnits,
    updated_at: now,
  };

  return { updatedUnit, updatedItem };
}
