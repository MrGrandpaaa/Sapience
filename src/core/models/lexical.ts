/**
 * Lexical analysis and Format A data structures.
 *
 * These types capture the linguistic metadata produced when a word
 * is first entered and analysed.  They support — but are not the
 * purpose of — the review & memorisation pipeline.
 *
 * FORMAT A is the structured vocabulary-entry representation for a
 * single selected lexical sense.  It is generated AFTER disambiguation
 * (if needed) and represents only the chosen interpretation — not an
 * exhaustive dictionary dump.
 *
 * LEXICAL ANALYSIS is the upstream process that produces morphology,
 * frequency, CEFR level, related forms, and disambiguation candidates.
 * These two concepts are logically separated below.
 */

import {
  UUID,
  Timestamp,
  PartOfSpeech,
  Gender,
  VerbGroup,
  AdjectivePosition,
  CEFRLevel,
  FrequencyBand,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT A — structured vocabulary entry for the selected lexical sense
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Top-level container
// ---------------------------------------------------------------------------

/**
 * The complete Format A representation of a vocabulary item.
 *
 * Represents ONE selected sense — not a dictionary entry with every
 * possible meaning.  Multiple interpretations are resolved via
 * disambiguation BEFORE this structure is generated.
 */
export interface FormatAData {
  /** The vocabulary entry form (e.g., "parler", "une voiture", "s'attendre à") */
  entry: string;

  /** POS-specific grammatical information (discriminated union) */
  grammar: FormatAGrammar;

  /** English meaning for the selected sense */
  meaning_en: string;
  /** Vietnamese meaning for the selected sense */
  meaning_vi: string;

  /**
   * Important verb constructions — max 3, most common/important only.
   * Absent when not applicable or none is meaningful enough to teach.
   * Patterns use exact placeholders: Vo, sone, sth.
   */
  constructions?: FormatAConstruction[];

  /**
   * Common/useful collocations — target exactly 3 for nouns and adjectives.
   * Absent when not applicable.  Never fabricated.
   */
  collocations?: string[];

  /** Sense-appropriate synonyms.  Absent when none appropriate.  Never fabricated. */
  synonyms?: string[];
  /** Sense-appropriate antonyms.  Absent when none appropriate.  Never fabricated. */
  antonyms?: string[];

  /**
   * Conversational examples list (§1, §4).
   */
  examples?: FormatAExample[];

  /**
   * Primary natural, common real-life / conversational example.
   */
  example: FormatAExample;

  /**
   * Position-specific meanings for adjectives placed before or after noun.
   */
  trc_meaning?: { en?: string; vi?: string };
  sau_meaning?: { en?: string; vi?: string };
}

// ---------------------------------------------------------------------------
// Grammar — discriminated union by part of speech
//
// Each POS variant contains only the fields specified by the official
// Format A specification for that category.  The discriminant `pos`
// lets TypeScript narrow to the correct variant.
//
// Optional fields within each variant allow the "empty/unpopulated"
// state used by the factory.  The generation layer is responsible for
// filling them before the Format A is considered final.
// ---------------------------------------------------------------------------

export type FormatAGrammar =
  | FormatANounGrammar
  | FormatAVerbGrammar
  | FormatAAdjectiveGrammar
  | FormatAAdverbGrammar
  | FormatAConjunctionGrammar
  | FormatADeterminerGrammar
  | FormatAInterjectionGrammar
  | FormatAPrepositionGrammar
  | FormatAPronounGrammar;

// ── Noun grammar (§12–13) ───────────────────────────────────────────────

export type NounGenderChoice = 'masculine' | 'feminine' | 'both';

/**
 * Detailed structure for a specific gender form of a French noun.
 * Preserves structured article and number data (§4, §5, §6).
 */
export interface NounGenderFormDetails {
  form: string;
  singular?: string;
  plural?: string;
  indefinite_article?: 'un' | 'une';
  definite_article?: 'le' | 'la';
  elision?: boolean;
  display_article?: string;
  is_h_aspire?: boolean;
}

/**
 * A single gender form representation of a French noun.
 * Database representation: lemma + gender + underlying article ('le' | 'la').
 */
export interface NounFormItem {
  lemma: string;
  gender: Gender.Masculine | Gender.Feminine;
  underlying_article: 'le' | 'la';
  indefinite_article?: 'un' | 'une';
  definite_article?: string;
  singular?: string;
  plural?: string;
  is_h_aspire?: boolean;
}

/**
 * Format A noun gender: Masculine, Feminine, or Both.
 */
export type FormatANounGender = Gender.Masculine | Gender.Feminine | Gender.Both;

export interface FormatANounGrammar {
  pos: PartOfSpeech.Noun;
  /** User gender choice: 'masculine' | 'feminine' | 'both' */
  gender_choice?: NounGenderChoice;
  /** Pure lemma stored separately without attached article */
  lemma?: string;
  /** Gender in database */
  gender?: FormatANounGender;
  /** Underlying definite article in database ('le' or 'la') */
  underlying_article?: 'le' | 'la';
  /** Masculine form (when gender_choice is 'both') */
  masculine_form?: NounFormItem;
  /** Feminine form (when gender_choice is 'both') */
  feminine_form?: NounFormItem;
  /** Flag indicating masculine and feminine have identical spelling forms (§3, §4) */
  is_shared_form?: boolean;
  /** Indicates whether noun starts with aspirated h (h aspiré), blocking elision */
  is_h_aspire?: boolean;
  /** List of genders supported by this lexical item */
  genders?: (Gender.Masculine | Gender.Feminine)[];
  /** Forms map: { masculine: string, feminine: string } */
  forms?: {
    masculine?: string;
    feminine?: string;
  };
  /** Structured gender details with articles and plural (§5, §6) */
  gender_details?: {
    masculine?: NounGenderFormDetails;
    feminine?: NounGenderFormDetails;
  };
  /** Plural forms representation */
  plural?: {
    masculine?: string;
    feminine?: string;
    shared?: string;
  } | string;
  /** Primary indefinite article (un / une) */
  indefinite_article?: string;
  /** Primary definite article (le / la / l') */
  definite_article?: string;
  /** Full article pair display string (e.g. 'un / le' or 'une / la') */
  article_display?: string;
  /** If user entered l', indicates which article (le or la) it resolved to */
  elision_resolution?: 'le' | 'la';
}

// ── Verb grammar (§5, §7) ───────────────────────────────────────────────

export interface FormatAVerbGrammar {
  pos: PartOfSpeech.Verb;
  /** Pure infinitive lemma */
  lemma?: string;
  /** Conjugation group: 1st (-er), 2nd (-ir with -iss-), 3rd (irregular) */
  group?: VerbGroup;
  /** Six present-tense conjugation forms */
  conjugation?: FormatAVerbConjugation;
}

/**
 * Exactly six present-tense subject groups as required by §7:
 *   je, tu, il/elle/on, nous, vous, ils/elles
 */
export interface FormatAVerbConjugation {
  je: string;
  tu: string;
  il_elle_on: string;
  nous: string;
  vous: string;
  ils_elles: string;
  // Aliases for camelCase
  ilElleOn?: string;
  ilsElles?: string;
}

// ── Adjective grammar (§19–26) ─────────────────────────────────────────

/**
 * Adjective grammar keeps GENDER and POSITION as two independent
 * properties.  They must never be conflated.
 *
 * Gender forms:
 *   - masculine + feminine stored as separate strings
 *   - Display: if identical → "(adj, mas - fem, ...)"
 *              if different → "(adj, mas, ...)" and "(adj, fem, ...)"
 *
 * Position (grammatical only, NOT meaning):
 *   - BeforeNoun  → "trc"
 *   - AfterNoun   → "sau"
 *   - Variable    → "trc và sau"
 *
 * When position genuinely changes meaning (§25), the separate
 * trc_meaning / sau_meaning fields carry position-specific meanings.
 * The top-level meaning_en / meaning_vi on FormatAData remains the
 * primary selected-sense meaning.
 */
export interface FormatAAdjectiveGrammar {
  pos: PartOfSpeech.Adjective;
  /** Masculine form (e.g., "grand") */
  masculine?: string;
  /** Feminine form (e.g., "grande") */
  feminine?: string;
  /** Grammatical position — maps to trc / sau / trc và sau */
  position?: AdjectivePosition;
  /** Whether before and after positions have distinct meanings / usages (§7, §8) */
  has_distinct_meanings?: boolean;
  /** Full entry when placed before noun (Trước nom) */
  before_entry?: AdjectivePositionalEntry;
  /** Full entry when placed after noun (Sau nom) */
  after_entry?: AdjectivePositionalEntry;
  /** Meaning when placed before noun (trc) — only when position genuinely changes meaning */
  trc_meaning?: FormatAPositionMeaning;
  /** Meaning when placed after noun (sau) — only when position genuinely changes meaning */
  sau_meaning?: FormatAPositionMeaning;
}

/**
 * Full details for an adjective in a specific position (Trước nom or Sau nom).
 */
export interface AdjectivePositionalEntry {
  position: AdjectivePosition;
  masculine?: string;
  feminine?: string;
  meaning_en?: string;
  meaning_vi?: string;
  examples?: FormatAExample[];
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
}

/**
 * Position-specific meaning for adjectives whose meaning genuinely
 * changes depending on placement (§25).
 *
 * Example for "ancien":
 *   trc_meaning: { meaning_en: "former",       meaning_vi: "cựu" }
 *   sau_meaning: { meaning_en: "old, ancient",  meaning_vi: "cổ, xưa" }
 */
export interface FormatAPositionMeaning {
  meaning_en: string;
  meaning_vi: string;
}

// ── Individual POS grammars for remaining 6 categories ──────────────────

export interface FormatAAdverbGrammar {
  pos: PartOfSpeech.Adverb;
}

export interface FormatAConjunctionGrammar {
  pos: PartOfSpeech.Conjunction;
}

export interface FormatADeterminerGrammar {
  pos: PartOfSpeech.Determiner;
}

export interface FormatAInterjectionGrammar {
  pos: PartOfSpeech.Interjection;
}

export interface FormatAPrepositionGrammar {
  pos: PartOfSpeech.Preposition;
}

export interface FormatAPronounGrammar {
  pos: PartOfSpeech.Pronoun;
}

/**
 * The 9 official parts of speech in French, displayed in exact required order:
 * Row 1: Nom | Verbe | Adjectif | Adverbe | Conjonction
 * Row 2: Déterminant | Interjection | Préposition | Pronom
 */
export interface POSItem {
  id: PartOfSpeech;
  label: string;
}

export const ORDERED_PARTS_OF_SPEECH: POSItem[] = [
  // Hàng 1 (5 nút)
  { id: PartOfSpeech.Noun, label: 'Nom' },
  { id: PartOfSpeech.Verb, label: 'Verbe' },
  { id: PartOfSpeech.Adjective, label: 'Adjectif' },
  { id: PartOfSpeech.Adverb, label: 'Adverbe' },
  { id: PartOfSpeech.Conjunction, label: 'Conjonction' },
  // Hàng 2 (4 nút)
  { id: PartOfSpeech.Determiner, label: 'Déterminant' },
  { id: PartOfSpeech.Interjection, label: 'Interjection' },
  { id: PartOfSpeech.Preposition, label: 'Préposition' },
  { id: PartOfSpeech.Pronoun, label: 'Pronom' },
];

// ---------------------------------------------------------------------------
// Construction (§8, §9, §36)
// ---------------------------------------------------------------------------

/**
 * A single verb construction / usage pattern.
 *
 * Placeholder conventions (fixed — never expand):
 *   Vo   = infinitive / verb nguyên mẫu
 *   sone = someone
 *   sth  = something
 *
 * Examples of valid patterns:
 *   "parler à sone"
 *   "parler de sth"
 *   "aider sone à Vo"
 *   "s'attendre à sth"
 *
 * Maximum 3 constructions per verb.  Only the most common/important.
 */
export interface FormatAConstruction {
  /** Canonical pattern using Vo, sone, sth */
  pattern: string;
  meaning_en: string;
  meaning_vi: string;
  /** Natural French example demonstrating this construction */
  example_fr: string;
  /** English translation of the example */
  example_en: string;
  /** Vietnamese translation of the example (when available) */
  example_vi?: string;
  /** Usage notes (when appropriate) */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Example (§11, §18, §26)
// ---------------------------------------------------------------------------

/**
 * ONE natural, common real-life / conversational example.
 */
export interface FormatAExample {
  french: string;
  english: string;
  vietnamese?: string;
  /** Source attribution when applicable — never fabricated */
  source?: string;
}

// ---------------------------------------------------------------------------
// Display notation constants
//
// Map internal enum values to the exact Format A display notation.
// The UI rendering layer uses these — not hard-coded strings.
// ---------------------------------------------------------------------------

/**
 * Noun gender notation: (n, mas) / (n, fem) / (n, mas - fem) — §13
 */
export const NOUN_SHARED_GENDER_NOTATION = 'n, mas - fem';

export const NOUN_GENDER_NOTATION: Record<FormatANounGender, string> = {
  [Gender.Masculine]: 'n, mas',
  [Gender.Feminine]: 'n, fem',
  [Gender.Both]: 'n, mas - fem',
};

/**
 * Adjective position display labels: trc / sau / trc và sau — §21
 */
export const ADJECTIVE_POSITION_DISPLAY: Record<AdjectivePosition, string> = {
  [AdjectivePosition.BeforeNoun]: 'trc',
  [AdjectivePosition.AfterNoun]: 'sau',
  [AdjectivePosition.Variable]: 'trc và sau',
};

// ═══════════════════════════════════════════════════════════════════════════
// LEXICAL ANALYSIS — upstream analysis data (separate from Format A)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Lexical analysis result
// ---------------------------------------------------------------------------

export interface LexicalAnalysisResult {
  vocabulary_id: UUID;
  analyzed_at: Timestamp;

  morphology: MorphologicalInfo;
  frequency: FrequencyInfo;
  cefr_level: CEFRLevel;

  /** Other inflected or derived forms of the same root */
  related_forms: RelatedForm[];

  /** Possible ambiguous interpretations that need disambiguation */
  disambiguation_candidates: DisambiguationCandidate[];
}

export interface MorphologicalInfo {
  root: string;
  prefix?: string;
  suffix?: string;
  /** e.g., "de- + faire → défaire" */
  derivation_pattern?: string;
}

export interface FrequencyInfo {
  /** Absolute rank in a reference corpus (lower = more common) */
  rank?: number;
  band: FrequencyBand;
}

export interface RelatedForm {
  /** The related surface form (e.g., "attente" for "attendre") */
  form: string;
  /** Relationship label: "noun form", "adjective form", "past participle", etc. */
  relationship: string;
  /** Link to master list if the related form also exists there */
  vocabulary_id?: UUID;
}

// ═══════════════════════════════════════════════════════════════════════════
// DISAMBIGUATION — separate from Format A (§3, §28)
//
// Pipeline:
//   user input → lexical analysis → disambiguation (if ambiguous)
//   → learner selects → generate Format A for selected sense ONLY
//
// The disambiguation interface is NOT Format A.
// Each candidate uses a concise 3-row structure:
//   1. Ý chính       (core meaning)
//   2. Ví dụ         (example)
//   3. Dịch tự nhiên (natural translation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * One possible interpretation when a surface form is ambiguous.
 *
 * Example: "livre" could be:
 *   1. noun masc. — book
 *   2. noun fem. — pound (unit / currency)
 *   3. verb (livrer) — to deliver (conjugated form)
 *
 * Full Format A is NOT generated for every candidate.
 * Only the selected interpretation gets a complete Format A.
 */
export interface DisambiguationCandidate {
  surface_form: string;
  part_of_speech: PartOfSpeech;
  /** Row 1 — Ý chính: core meaning of this interpretation */
  core_meaning: string;
  /** Row 2 — Ví dụ: French example showing this sense in context */
  example: string;
  /** Row 3 — Dịch tự nhiên: natural translation */
  natural_translation: string;
}

/**
 * Outcome of a disambiguation decision made by the user or system.
 */
export interface DisambiguationDecision {
  /** The original input that was ambiguous */
  input_form: string;
  /** All candidates that were considered */
  candidates: DisambiguationCandidate[];
  /** Index (into candidates[]) of the chosen interpretation */
  chosen_index: number;
  /** Whether the system auto-resolved or the user chose manually */
  resolution_method: 'auto' | 'user';
  resolved_at: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a valid but unpopulated Format A data object.
 *
 * The grammar variant is selected based on `partOfSpeech`.
 * No linguistic data is fabricated — fields start empty.
 * The generation layer is responsible for populating all fields
 * before the Format A is considered final.
 */
export function createEmptyFormatAData(
  entry: string,
  partOfSpeech: PartOfSpeech,
): FormatAData {
  return {
    entry,
    grammar: createEmptyGrammar(partOfSpeech),
    meaning_en: '',
    meaning_vi: '',
    example: { french: '', english: '' },
  };
}

/**
 * Create an empty grammar variant for the given part of speech.
 * Only the `pos` discriminant is set.
 */
function createEmptyGrammar(pos: PartOfSpeech): FormatAGrammar {
  switch (pos) {
    case PartOfSpeech.Noun:
      return { pos: PartOfSpeech.Noun };
    case PartOfSpeech.Verb:
      return { pos: PartOfSpeech.Verb };
    case PartOfSpeech.Adjective:
      return { pos: PartOfSpeech.Adjective };
    case PartOfSpeech.Adverb:
      return { pos: PartOfSpeech.Adverb };
    case PartOfSpeech.Conjunction:
      return { pos: PartOfSpeech.Conjunction };
    case PartOfSpeech.Determiner:
      return { pos: PartOfSpeech.Determiner };
    case PartOfSpeech.Interjection:
      return { pos: PartOfSpeech.Interjection };
    case PartOfSpeech.Preposition:
      return { pos: PartOfSpeech.Preposition };
    case PartOfSpeech.Pronoun:
      return { pos: PartOfSpeech.Pronoun };
  }
}
