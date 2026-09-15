import { AdjectivePosition, PartOfSpeech } from '../models/types';
import { FormatAAdjectiveGrammar } from '../models/lexical';
import { VocabularyItem } from '../models/vocabulary';

/**
 * Checks whether the before and after noun definitions for an adjective
 * genuinely have distinct meanings or usages (§7, §8).
 *
 * Rules:
 * - If both sides are empty -> false
 * - If only one side is filled -> false (user entered 1 meaning for both positions)
 * - If both sides have meaning -> true if either English or Vietnamese differs, false if identical
 */
export function checkDistinctAdjectiveMeanings(
  beforeEn?: string,
  beforeVi?: string,
  afterEn?: string,
  afterVi?: string,
): boolean {
  const bEn = (beforeEn || '').trim().toLowerCase();
  const bVi = (beforeVi || '').trim().toLowerCase();
  const aEn = (afterEn || '').trim().toLowerCase();
  const aVi = (afterVi || '').trim().toLowerCase();

  const hasBefore = Boolean(bEn || bVi);
  const hasAfter = Boolean(aEn || aVi);

  // Both must be present to have distinct positional senses
  if (!hasBefore || !hasAfter) {
    return false;
  }

  // Check if EN differs (when either has EN) or VI differs (when either has VI)
  const enDiffers = Boolean(bEn && aEn && bEn !== aEn);
  const viDiffers = Boolean(bVi && aVi && bVi !== aVi);

  // If one side has EN and the other doesn't, or one has VI and the other doesn't
  const asymmetricEn = Boolean((bEn && !aEn) || (!bEn && aEn));
  const asymmetricVi = Boolean((bVi && !aVi) || (!bVi && aVi));

  return enDiffers || viDiffers || asymmetricEn || asymmetricVi;
}

export interface AdjectiveFormsResult {
  masculine: string;
  feminine: string;
  isIdentical: boolean;
  position?: AdjectivePosition;
  displayForm: string;
}

/**
 * Extracts and normalizes masculine and feminine forms for an adjective.
 */
export function getAdjectiveForms(
  itemOrGrammar: VocabularyItem | FormatAAdjectiveGrammar | { grammar?: any; surface_form?: string },
): AdjectiveFormsResult {
  let grammar: FormatAAdjectiveGrammar | undefined;
  let surfaceForm = '';

  if ('format_a' in itemOrGrammar) {
    grammar = itemOrGrammar.format_a?.grammar as FormatAAdjectiveGrammar | undefined;
    surfaceForm = itemOrGrammar.surface_form || '';
  } else if ('part_of_speech' in itemOrGrammar) {
    grammar = (itemOrGrammar as VocabularyItem).format_a?.grammar as FormatAAdjectiveGrammar | undefined;
    surfaceForm = (itemOrGrammar as VocabularyItem).surface_form || '';
  } else if ('pos' in itemOrGrammar) {
    grammar = itemOrGrammar as FormatAAdjectiveGrammar;
  } else if ('grammar' in itemOrGrammar) {
    grammar = itemOrGrammar.grammar as FormatAAdjectiveGrammar | undefined;
    surfaceForm = itemOrGrammar.surface_form || '';
  }

  const mascRaw =
    grammar?.masculine ||
    grammar?.before_entry?.masculine ||
    grammar?.after_entry?.masculine ||
    '';

  const femRaw =
    grammar?.feminine ||
    grammar?.before_entry?.feminine ||
    grammar?.after_entry?.feminine ||
    '';

  let masculine = mascRaw.trim();
  let feminine = femRaw.trim();

  // If neither is explicitly provided in grammar, attempt parsing from surface_form
  if (!masculine && !feminine && surfaceForm) {
    if (surfaceForm.includes(' / ')) {
      const parts = surfaceForm.split(' / ');
      masculine = parts[0]?.trim() || '';
      feminine = parts[1]?.trim() || '';
    } else {
      masculine = surfaceForm.trim();
    }
  }

  const isIdentical =
    (Boolean(masculine) && Boolean(feminine) && masculine.toLowerCase() === feminine.toLowerCase()) ||
    (Boolean(masculine) && !feminine) ||
    (!masculine && Boolean(feminine));

  const displayForm = isIdentical
    ? masculine || feminine || surfaceForm || 'Adjectif'
    : `${masculine} / ${feminine}`;

  return {
    masculine,
    feminine,
    isIdentical,
    position: grammar?.position,
    displayForm,
  };
}

/**
 * Returns the gender notation for adjectives (§2).
 * - Masculin: (adj, mas)
 * - Féminin: (adj, fem)
 * - Identical: (adj, mas - fem)
 */
export function formatAdjectiveGenderNotation(
  masculine?: string,
  feminine?: string,
): {
  masculineNotation: string;
  feminineNotation: string;
  unifiedNotation: string;
  isIdentical: boolean;
} {
  const masc = (masculine || '').trim();
  const fem = (feminine || '').trim();

  const isIdentical =
    (Boolean(masc) && Boolean(fem) && masc.toLowerCase() === fem.toLowerCase()) ||
    (Boolean(masc) && !fem) ||
    (!masc && Boolean(fem));

  if (isIdentical) {
    return {
      masculineNotation: '(adj, mas - fem)',
      feminineNotation: '(adj, mas - fem)',
      unifiedNotation: '(adj, mas - fem)',
      isIdentical: true,
    };
  }

  return {
    masculineNotation: '(adj, mas)',
    feminineNotation: '(adj, fem)',
    unifiedNotation: '(adj, mas / fem)',
    isIdentical: false,
  };
}

export type AdjectiveTargetGender = 'masculine' | 'feminine';

/**
 * An individual learning/retrieval target for an adjective in games & SRS.
 * Tracks gender (masculine / feminine), exact form ("grand" / "grande"),
 * and position when applicable.
 */
export interface AdjectiveLearningTarget {
  id: string;
  itemId: string;
  lemma: string;
  gender: AdjectiveTargetGender;
  form: string;
  position?: AdjectivePosition;
  positionTitle?: string;
  positionBadge?: string;
  meaning_en?: string;
  meaning_vi?: string;
}

/**
 * Independent SRS learning unit for tracking adjective targets.
 */
export interface AdjectiveTargetUnit {
  id: string;
  itemId: string;
  gender: AdjectiveTargetGender;
  form: string;
  position?: AdjectivePosition;
  level: number;
  last_review_at?: string | null;
  next_review_at?: string;
  review_count?: number;
  successful_retrievals?: number;
  failed_retrievals?: number;
  current_streak?: number;
}

/**
 * Generates the list of distinct learning/retrieval targets for an adjective.
 *
 * Rules (§2, §4, §8, §11):
 * - If masculine and feminine are identical (e.g. "rapide" / "rapide"):
 *   Only ONE target is produced (no duplicates).
 * - If masculine and feminine differ (e.g. "grand" / "grande"):
 *   Produces Target A (masculine) and Target B (feminine).
 * - If adjective has BEFORE + AFTER (Variable position with distinct entries):
 *   Produces positional targets preserving position + gender dimensions.
 */
export function getAdjectiveLearningTargets(item: VocabularyItem): AdjectiveLearningTarget[] {
  if (item.part_of_speech !== PartOfSpeech.Adjective) {
    return [];
  }

  const grammar = item.format_a?.grammar as FormatAAdjectiveGrammar | undefined;
  const targets: AdjectiveLearningTarget[] = [];
  const lemma = (item.format_a?.entry || item.surface_form || '').split(' / ')[0].trim();

  // Case 1: Both Before and After entries exist
  if (grammar?.before_entry && grammar?.after_entry) {
    // 1.1 Before Noun
    const bMasc = (grammar.before_entry.masculine || grammar.masculine || '').trim();
    const bFem = (grammar.before_entry.feminine || grammar.feminine || '').trim();
    const bEn = grammar.before_entry.meaning_en || item.format_a?.meaning_en;
    const bVi = grammar.before_entry.meaning_vi || item.format_a?.meaning_vi;

    const bIdentical =
      (Boolean(bMasc) && Boolean(bFem) && bMasc.toLowerCase() === bFem.toLowerCase()) ||
      (Boolean(bMasc) && !bFem) ||
      (!bMasc && Boolean(bFem));

    if (bIdentical) {
      const form = bMasc || bFem || lemma;
      if (form) {
        targets.push({
          id: `${item.id}-before-shared`,
          itemId: item.id,
          lemma,
          gender: 'masculine',
          form,
          position: AdjectivePosition.BeforeNoun,
          positionTitle: 'Trước nom',
          positionBadge: '+ N',
          meaning_en: bEn,
          meaning_vi: bVi,
        });
      }
    } else {
      if (bMasc) {
        targets.push({
          id: `${item.id}-before-masculine`,
          itemId: item.id,
          lemma,
          gender: 'masculine',
          form: bMasc,
          position: AdjectivePosition.BeforeNoun,
          positionTitle: 'Trước nom',
          positionBadge: '+ N',
          meaning_en: bEn,
          meaning_vi: bVi,
        });
      }
      if (bFem) {
        targets.push({
          id: `${item.id}-before-feminine`,
          itemId: item.id,
          lemma,
          gender: 'feminine',
          form: bFem,
          position: AdjectivePosition.BeforeNoun,
          positionTitle: 'Trước nom',
          positionBadge: '+ N',
          meaning_en: bEn,
          meaning_vi: bVi,
        });
      }
    }

    // 1.2 After Noun
    const aMasc = (grammar.after_entry.masculine || grammar.masculine || '').trim();
    const aFem = (grammar.after_entry.feminine || grammar.feminine || '').trim();
    const aEn = grammar.after_entry.meaning_en || (grammar.has_distinct_meanings ? undefined : item.format_a?.meaning_en);
    const aVi = grammar.after_entry.meaning_vi || (grammar.has_distinct_meanings ? undefined : item.format_a?.meaning_vi);

    const aIdentical =
      (Boolean(aMasc) && Boolean(aFem) && aMasc.toLowerCase() === aFem.toLowerCase()) ||
      (Boolean(aMasc) && !aFem) ||
      (!aMasc && Boolean(aFem));

    if (aIdentical) {
      const form = aMasc || aFem || lemma;
      if (form) {
        targets.push({
          id: `${item.id}-after-shared`,
          itemId: item.id,
          lemma,
          gender: 'masculine',
          form,
          position: AdjectivePosition.AfterNoun,
          positionTitle: 'Sau nom',
          positionBadge: 'N +',
          meaning_en: aEn,
          meaning_vi: aVi,
        });
      }
    } else {
      if (aMasc) {
        targets.push({
          id: `${item.id}-after-masculine`,
          itemId: item.id,
          lemma,
          gender: 'masculine',
          form: aMasc,
          position: AdjectivePosition.AfterNoun,
          positionTitle: 'Sau nom',
          positionBadge: 'N +',
          meaning_en: aEn,
          meaning_vi: aVi,
        });
      }
      if (aFem) {
        targets.push({
          id: `${item.id}-after-feminine`,
          itemId: item.id,
          lemma,
          gender: 'feminine',
          form: aFem,
          position: AdjectivePosition.AfterNoun,
          positionTitle: 'Sau nom',
          positionBadge: 'N +',
          meaning_en: aEn,
          meaning_vi: aVi,
        });
      }
    }

    return targets;
  }

  // Case 2: Standard adjective or single position
  const forms = getAdjectiveForms(item);
  const position = forms.position || grammar?.position;
  const posTitle =
    position === AdjectivePosition.BeforeNoun
      ? 'Trước nom'
      : position === AdjectivePosition.AfterNoun
      ? 'Sau nom'
      : undefined;
  const posBadge =
    position === AdjectivePosition.BeforeNoun
      ? '+ N'
      : position === AdjectivePosition.AfterNoun
      ? 'N +'
      : undefined;

  const mEn = item.format_a?.meaning_en;
  const mVi = item.format_a?.meaning_vi;

  if (forms.isIdentical) {
    const singleForm = forms.masculine || forms.feminine || lemma || 'Adjectif';
    targets.push({
      id: `${item.id}-shared`,
      itemId: item.id,
      lemma,
      gender: 'masculine',
      form: singleForm,
      position,
      positionTitle: posTitle,
      positionBadge: posBadge,
      meaning_en: mEn,
      meaning_vi: mVi,
    });
  } else {
    if (forms.masculine) {
      targets.push({
        id: `${item.id}-masculine`,
        itemId: item.id,
        lemma,
        gender: 'masculine',
        form: forms.masculine,
        position,
        positionTitle: posTitle,
        positionBadge: posBadge,
        meaning_en: mEn,
        meaning_vi: mVi,
      });
    }
    if (forms.feminine) {
      targets.push({
        id: `${item.id}-feminine`,
        itemId: item.id,
        lemma,
        gender: 'feminine',
        form: forms.feminine,
        position,
        positionTitle: posTitle,
        positionBadge: posBadge,
        meaning_en: mEn,
        meaning_vi: mVi,
      });
    }
  }

  return targets;
}

/**
 * Selects a specific target for an adjective question in games.
 * If targetGender is specified ('masculine' or 'feminine'), selects that form.
 * Otherwise, picks based on review history or deterministic rotation.
 */
export function selectAdjectiveTarget(
  item: VocabularyItem,
  targetGender?: AdjectiveTargetGender,
  position?: AdjectivePosition,
): AdjectiveLearningTarget | null {
  const targets = getAdjectiveLearningTargets(item);
  if (targets.length === 0) return null;

  // Filter by position if requested
  const posFiltered = position
    ? targets.filter((t) => t.position === position)
    : targets;
  const pool = posFiltered.length > 0 ? posFiltered : targets;

  // If specific gender is requested
  if (targetGender) {
    const matched = pool.find((t) => t.gender === targetGender);
    if (matched) return matched;
  }

  // If only 1 target exists (e.g. "rapide")
  if (pool.length === 1) {
    return pool[0];
  }

  // Rotate / prioritize based on item.adjective_units if available
  if (item.adjective_units) {
    const sorted = [...pool].sort((a, b) => {
      const uA = item.adjective_units?.[a.id];
      const uB = item.adjective_units?.[b.id];
      const countA = uA?.review_count ?? 0;
      const countB = uB?.review_count ?? 0;
      return countA - countB;
    });
    return sorted[0];
  }

  // Default: alternate or pick first
  return pool[0];
}

/**
 * Creates independent learning units for an adjective.
 */
export function createAdjectiveUnits(item: VocabularyItem): Record<string, AdjectiveTargetUnit> {
  const targets = getAdjectiveLearningTargets(item);
  const units: Record<string, AdjectiveTargetUnit> = {};

  for (const t of targets) {
    units[t.id] = {
      id: t.id,
      itemId: item.id,
      gender: t.gender,
      form: t.form,
      position: t.position,
      level: item.level ?? 0,
      review_count: 0,
      successful_retrievals: 0,
      failed_retrievals: 0,
      current_streak: 0,
    };
  }

  return units;
}

