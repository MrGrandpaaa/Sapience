/**
 * Core shared types, enums, and type aliases used across all modules.
 *
 * This file is the single source of truth for enumerations and
 * primitive type aliases. All other model files import from here.
 */

// ---------------------------------------------------------------------------
// Utility type aliases
// ---------------------------------------------------------------------------

/** UUID string identifier */
export type UUID = string;

/** ISO-8601 timestamp stored as a Date object at runtime */
export type Timestamp = Date;

// ---------------------------------------------------------------------------
// French linguistic enums
// ---------------------------------------------------------------------------

export enum PartOfSpeech {
  Noun = 'noun',
  Verb = 'verb',
  Adjective = 'adjective',
  Adverb = 'adverb',
  Conjunction = 'conjunction',
  Determiner = 'determiner',
  Interjection = 'interjection',
  Preposition = 'preposition',
  Pronoun = 'pronoun',
}

export enum Gender {
  Masculine = 'masculine',
  Feminine = 'feminine',
  /** Nouns that can be either gender (e.g., "élève") */
  Both = 'both',
}

export enum DefiniteArticle {
  Le = 'le',
  La = 'la',
  Les = 'les',
  /** Elided form before vowel / silent h */
  L = "l'",
}

export enum IndefiniteArticle {
  Un = 'un',
  Une = 'une',
  Des = 'des',
}

/** French verb conjugation group */
export enum VerbGroup {
  /** -er verbs (e.g., parler) */
  First = 1,
  /** -ir verbs with -iss- infix (e.g., finir → finissons) */
  Second = 2,
  /** All other irregular verbs (e.g., prendre, être, avoir) */
  Third = 3,
}

export enum AdjectivePosition {
  /** BANGS adjectives: placed before the noun */
  BeforeNoun = 'before',
  /** Most adjectives: placed after the noun */
  AfterNoun = 'after',
  /** Both positions are grammatically valid (e.g., ancien can appear before or after noun) */
  Variable = 'variable',
}

// ---------------------------------------------------------------------------
// CEFR & Frequency
// ---------------------------------------------------------------------------

export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
  Unknown = 'unknown',
}

export enum FrequencyBand {
  /** Top 500 most common words */
  VeryHigh = 'very_high',
  /** Rank 500–2 000 */
  High = 'high',
  /** Rank 2 000–5 000 */
  Medium = 'medium',
  /** Rank 5 000–10 000 */
  Low = 'low',
  /** Rank 10 000+ */
  VeryLow = 'very_low',
  Unknown = 'unknown',
}

// ---------------------------------------------------------------------------
// Learning / SRS enums
// ---------------------------------------------------------------------------

export enum SkillType {
  Listening = 'listening',
  Writing = 'writing',
  Context = 'context',
  Gender = 'gender',
  Construction = 'construction',
  Cloze = 'cloze',
}

export enum GameType {
  ListeningComprehension = 'listening_comprehension',
  WritingFromAudio = 'writing_from_audio',
  WritingFromMeaning = 'writing_from_meaning',
  ContextMatching = 'context_matching',
  ContextSentenceChoice = 'context_sentence_choice',
  GenderIdentification = 'gender_identification',
  ArticleSelection = 'article_selection',
  ConstructionCompletion = 'construction_completion',
  ConstructionTranslation = 'construction_translation',
  ClozeTest = 'cloze_test',
  FlashcardRecall = 'flashcard_recall',
}

/**
 * SRS box/level following a modified Leitner–SM2 hybrid.
 *
 * Each level defines a minimum interval before the next review.
 */
export enum SRSLevel {
  /** Brand-new item, never reviewed */
  New = 0,
  /** First learning step  — review after ~4 h */
  Learning1 = 1,
  /** Second learning step — review after ~8 h */
  Learning2 = 2,
  /** Young item — review after 1 day */
  Young1 = 3,
  /** Young item — review after 3 days */
  Young2 = 4,
  /** Mature — review after 7 days */
  Mature1 = 5,
  /** Mature — review after 14 days */
  Mature2 = 6,
  /** Mature — review after 30 days */
  Mature3 = 7,
  /** Expert — review after 60 days */
  Expert = 8,
  /** Master — review after 120 days */
  Master = 9,
  /** Burned — considered memorised, review after 240 days */
  Burned = 10,
}

/**
 * How well the learner recalled the item, adapted from SM-2.
 *
 * Values 0–2 are treated as failures (item resets or drops).
 * Values 3–5 are treated as successes (item advances).
 */
export enum RecallQuality {
  /** Complete blackout — no recognition at all */
  Blackout = 0,
  /** Incorrect answer but recognised after reveal */
  Incorrect = 1,
  /** Incorrect answer, slight familiarity */
  Familiar = 2,
  /** Correct but required significant effort / long delay */
  Difficult = 3,
  /** Correct with some hesitation */
  Hesitant = 4,
  /** Perfect, instant recall */
  Perfect = 5,
}

export enum SessionStatus {
  Active = 'active',
  Completed = 'completed',
  Abandoned = 'abandoned',
  Paused = 'paused',
}

export enum PriorityLevel {
  /** Very overdue — should be reviewed immediately */
  Critical = 'critical',
  /** Overdue — past the scheduled review date */
  High = 'high',
  /** Due — within the review window */
  Normal = 'normal',
  /** Not yet due */
  Low = 'low',
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Which skills each GameType primarily targets */
export const GAME_SKILL_MAP: Record<GameType, SkillType> = {
  [GameType.ListeningComprehension]: SkillType.Listening,
  [GameType.WritingFromAudio]: SkillType.Writing,
  [GameType.WritingFromMeaning]: SkillType.Writing,
  [GameType.ContextMatching]: SkillType.Context,
  [GameType.ContextSentenceChoice]: SkillType.Context,
  [GameType.GenderIdentification]: SkillType.Gender,
  [GameType.ArticleSelection]: SkillType.Gender,
  [GameType.ConstructionCompletion]: SkillType.Construction,
  [GameType.ConstructionTranslation]: SkillType.Construction,
  [GameType.ClozeTest]: SkillType.Cloze,
  [GameType.FlashcardRecall]: SkillType.Context,
};

/**
 * SRS intervals in milliseconds keyed by SRSLevel.
 * Used by the SRS engine to compute next_review_at.
 */
export const SRS_INTERVALS_MS: Record<SRSLevel, number> = {
  [SRSLevel.New]: 0,
  [SRSLevel.Learning1]: 4 * 60 * 60 * 1000,         //   4 hours
  [SRSLevel.Learning2]: 8 * 60 * 60 * 1000,          //   8 hours
  [SRSLevel.Young1]: 1 * 24 * 60 * 60 * 1000,        //   1 day
  [SRSLevel.Young2]: 3 * 24 * 60 * 60 * 1000,        //   3 days
  [SRSLevel.Mature1]: 7 * 24 * 60 * 60 * 1000,       //   7 days
  [SRSLevel.Mature2]: 14 * 24 * 60 * 60 * 1000,      //  14 days
  [SRSLevel.Mature3]: 30 * 24 * 60 * 60 * 1000,      //  30 days
  [SRSLevel.Expert]: 60 * 24 * 60 * 60 * 1000,       //  60 days
  [SRSLevel.Master]: 120 * 24 * 60 * 60 * 1000,      // 120 days
  [SRSLevel.Burned]: 240 * 24 * 60 * 60 * 1000,      // 240 days
};
