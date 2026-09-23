import { VocabularyItem } from './vocabulary';
import { PartOfSpeech, AdjectivePosition } from './types';
import type { VerbConjugationPerson } from '../services/verbConjugationService';

export type GameType =
  | 'listening_writing'    // Game 1: Listening -> Writing
  | 'listening_mcq'        // Game 2: Listening -> Multiple Choice
  | 'matching'             // Game 3: Matching / Context Selection
  | 'gender'               // Game 4: Gender & Articles (Nouns only)
  | 'verb_conjugation'     // Game 5: Verb Conjugation (Active retrieval across 6 persons)
  | 'cloze';               // Game 6: Cloze (paragraph fill-in from user examples)

export interface GameMetadata {
  id: GameType;
  number: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;
  testedSkills: string[];
  icon: string;
  badgeColor: string;
}

export const REVIEW_GAMES_META: Record<GameType, GameMetadata> = {
  listening_writing: {
    id: 'listening_writing',
    number: 1,
    title: 'Listening → Writing',
    shortTitle: 'Listening & Dictation',
    subtitle: 'Listen to pronunciation and transcribe the French word accurately',
    description: 'Tests accuracy in spelling, accents, elision apostrophes, correct lexical form, and mandatory articles for nouns.',
    testedSkills: ['listening', 'spelling', 'accents', 'articles'],
    icon: '✍️',
    badgeColor: '#2563eb',
  },
  listening_mcq: {
    id: 'listening_mcq',
    number: 2,
    title: 'Listening → Multiple Choice',
    shortTitle: 'Listening & Multiple Choice',
    subtitle: 'Listen to pronunciation and select the 1 correct answer among 4 choices',
    description: 'Nouns are always pronounced with articles. Distractors are prioritized from Master Vocabulary List or validated French lexical data.',
    testedSkills: ['listening', 'recognition'],
    icon: '🎧',
    badgeColor: '#059669',
  },
  matching: {
    id: 'matching',
    number: 3,
    title: 'Context Selection',
    shortTitle: 'Context Selection',
    subtitle: 'Match French vocabulary with its corresponding English meaning',
    description: 'Two-way matching: Match a French word to its English meaning, or an English meaning to its French word. Sourced strictly from saved vocabulary.',
    testedSkills: ['recall', 'reading', 'context'],
    icon: '⇄',
    badgeColor: '#0284c7',
  },
  gender: {
    id: 'gender',
    number: 4,
    title: 'Gender',
    shortTitle: 'Gender & Articles',
    subtitle: 'Identify Masculine / Feminine and appropriate articles',
    description: 'Applies strictly to nouns. Tests gender recognition (masculine / feminine), definite / indefinite articles, and elision resolution (l\').',
    testedSkills: ['gender', 'articles'],
    icon: '⚖️',
    badgeColor: '#7c3aed',
  },
  verb_conjugation: {
    id: 'verb_conjugation',
    number: 5,
    title: 'Verb Conjugation',
    shortTitle: 'Verb Conjugation',
    subtitle: 'Active retrieval of verb conjugation forms across 6 persons',
    description: 'Tests active production and retrieval of stored conjugation forms: infinitive to conjugated form, conjugated form to infinitive, and audio recognition.',
    testedSkills: ['conjugation', 'writing', 'grammar'],
    icon: '⚡',
    badgeColor: '#ea580c',
  },
  cloze: {
    id: 'cloze',
    number: 6,
    title: 'Cloze',
    shortTitle: 'Contextual Cloze',
    subtitle: 'Fill in the blanks with target vocabulary in natural French passages',
    description: 'Tests vocabulary in context using exclusively user-entered example sentences with the target blanked out.',
    testedSkills: ['cloze', 'grammar', 'context'],
    icon: '🧩',
    badgeColor: '#0891b2',
  },
};

// ── APPLICABILITY REPORT ─────────────────────────────────────────────────────

export interface GameApplicability {
  gameType: GameType;
  isApplicable: boolean;
  reason: string;
}

// ── TEXT DIFF FOR GAME 1 (LISTENING -> WRITING) ──────────────────────────────

export type TextErrorType =
  | 'missing_article'
  | 'wrong_article'
  | 'apostrophe'
  | 'accent'
  | 'spelling'
  | 'wrong_form';

export interface TextCheckResult {
  isCorrect: boolean;
  errorType: TextErrorType | null;
  expectedText: string;
  userText: string;
  feedbackMessage: string;
  diffHighlight?: {
    expectedParts: { text: string; isWrong?: boolean }[];
    userParts: { text: string; isWrong?: boolean }[];
  };
}

// ── QUESTION SCHEMAS ─────────────────────────────────────────────────────────

export interface BaseGameQuestion {
  id: string;
  gameType: GameType;
  targetItem: VocabularyItem;
  prompt: string;
  promptSubtext?: string;
  audioText?: string;
  supportLevel?: 'high_support' | 'medium_support' | 'low_support';
  selectionReason?: string;
  targetGender?: 'masculine' | 'feminine';
  targetForm?: string;
  targetPosition?: AdjectivePosition;
  adjectiveTargetId?: string;
  isExtraPractice?: boolean;
}

export interface ListeningWritingQuestion extends BaseGameQuestion {
  gameType: 'listening_writing';
  canonicalAnswer: string;
  acceptableAnswers: string[];
  requiresArticle: boolean;
  hintVietnamese?: string;
  partOfSpeech: PartOfSpeech;
  genderTag?: string;
}

export interface McqOption {
  id: string;
  text: string;
  isCorrect: boolean;
  subtext?: string;
  explanation?: string;
}

export interface ListeningMcqQuestion extends BaseGameQuestion {
  gameType: 'listening_mcq';
  audioText: string;
  options: McqOption[];
}

export interface MatchingQuestion extends BaseGameQuestion {
  gameType: 'matching';
  promptType: 'fr_to_en' | 'en_to_fr';
  questionText: string;
  targetFrench: string;
  targetEnglish: string;
  canonicalAnswer: string;
  options: McqOption[];
}

export interface GenderQuestion extends BaseGameQuestion {
  gameType: 'gender';
  nounFormWithoutArticle: string;
  canonicalGender: 'masculine' | 'feminine' | 'both';
  canonicalArticleIndefinite?: 'un' | 'une' | string;
  canonicalArticleDefinite?: 'le' | 'la' | "l'" | string;
  hasElision: boolean;
  options: McqOption[];
  questionMode?: 'gender_only' | 'article_only' | 'elision_resolution' | 'three_options';
}

export type VerbConjugationMode =
  | 'infinitive_to_conjugated' // Mode A: Infinitive -> Conjugated form
  | 'conjugated_to_infinitive' // Mode B: Conjugated form -> Infinitive
  | 'audio_to_verb_person';    // Mode C: Audio -> Infinitive + Person

export interface VerbConjugationQuestion extends BaseGameQuestion {
  gameType: 'verb_conjugation';
  mode: VerbConjugationMode;
  infinitive: string; // e.g. "parler"
  person: VerbConjugationPerson; // e.g. "nous"
  personLabel: string; // e.g. "nous", "il / elle / on"
  conjugatedForm: string; // e.g. "parlons"
  fullFormText: string; // e.g. "nous parlons"
  canonicalAnswer: string; // Mode A: "parlons", Mode B: "parler", Mode C: "parler (nous)"
  acceptableAnswers: string[];
  displaySubject?: string;
  expectedInfinitive?: string;
  expectedPerson?: VerbConjugationPerson;
  options?: McqOption[];
}

export interface VerbConstructionQuestion {
  id: string;
  gameType: string;
  targetItem: VocabularyItem;
  prompt: string;
  promptSubtext?: string;
  verbEntry: string;
  pattern: string; // e.g., 'se souvenir + de'
  sentenceWithBlank: string; // e.g. 'Elle se souvient toujours _____ son enfance.'
  correctPreposition: string; // e.g. 'de'
  options: McqOption[];
  explanation: string;
}

export interface ClozeQuestion extends BaseGameQuestion {
  gameType: 'cloze';
  paragraphWithBlank: string;
  paragraphTranslationVi?: string;
  blankAnswer: string;
  acceptableVariants: string[];
  testedAspect: 'vocabulary' | 'conjugation' | 'collocation' | 'grammar';
  options?: McqOption[]; // If multiple choice mode is used
  explanation: string;
}

export type GameQuestion =
  | ListeningWritingQuestion
  | ListeningMcqQuestion
  | MatchingQuestion
  | GenderQuestion
  | VerbConjugationQuestion
  | ClozeQuestion;

// ── EVALUATION & RESULTS ────────────────────────────────────────────────────

export interface QuestionEvaluation {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  feedbackTitle: string;
  feedbackMessage: string;
  detailedAnalysis?: TextCheckResult;
  retrievalResult: 'success' | 'borderline' | 'failure';
  errorCategory?: 'none' | 'minor' | 'core_lexical';
  testedSkill?: string;
  skillDelta?: {
    skill: string;
    previousScore: number | null;
    newScore: number | null;
    isCoreError: boolean;
  };
  updatedItem?: VocabularyItem;
}

export interface GameSessionResult {
  gameType: GameType;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  itemsTested: {
    item: VocabularyItem;
    isCorrect: boolean;
    retrievalResult: 'success' | 'borderline' | 'failure';
  }[];
  startedAt: string;
  finishedAt: string;
}
