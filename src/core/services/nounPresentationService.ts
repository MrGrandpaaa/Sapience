import { Gender, PartOfSpeech } from '../models/types';
import { FormatAGrammar, FormatANounGrammar, NounGenderFormDetails } from '../models/lexical';
import { VocabularyItem } from '../models/vocabulary';

/**
 * Curated list of French nouns that can exist in both masculine and feminine
 * with the exact same spelling (shared form / noms épicènes).
 */
export const KNOWN_SHARED_GENDER_NOUNS = new Set([
  'élève',
  'journaliste',
  'professeur',
  'artiste',
  'camarade',
  'collègue',
  'touriste',
  'adulte',
  'enfant',
  'secrétaire',
  'responsable',
  'spécialiste',
  'cadre',
  'juriste',
  'architecte',
  'dentiste',
  'psychologue',
  'scientifique',
  'propriétaire',
  'locataire',
  'adversaire',
  'pianiste',
  'diplomate',
  'stagiaire',
  'bénévole',
  'patriote',
  'juge',
  'guide',
  'membre',
  'athlète',
  'arbitre',
]);

/**
 * Strips existing French articles (definite, indefinite) and notation tags
 * from a noun lemma so that only the pure lemma is stored in the database.
 *
 * Example:
 *   "le livre" -> "livre"
 *   "l'homme" -> "homme"
 *   "l’homme" -> "homme"
 *   "la voiture (n, fem)" -> "voiture"
 *   "un arbre" -> "arbre"
 *   "une école" -> "école"
 *   "un élève" -> "élève"
 *   "une élève" -> "élève"
 */
export function cleanNounLemma(input: string): string {
  if (!input) return '';
  return input
    .replace(/\s*\(?n,\s*(mas|fem|both|mas\s*-\s*fem|mas\s*\+\s*fem)\)?/gi, '')
    .replace(/^(une\b|un\b|des\b|les\b|le\b|la\b|l'|l’)\s*/i, '')
    .trim();
}

/**
 * Comprehensive list of French nouns starting with an aspirated 'h' (h aspiré).
 * Words with 'h aspiré' block elision (le/la do NOT become l') and block liaison.
 * Example: le héros, le haricot, la haine, la honte.
 */
export const FRENCH_H_ASPIRE_WORDS = new Set([
  // Core target nouns
  'héros',
  'haricot',
  'haricots',
  'haine',
  'haines',
  'honte',
  'hontes',

  // Comprehensive common French H aspiré nouns
  'hache',
  'haches',
  'hachoir',
  'hachoirs',
  'haie',
  'haies',
  'haillon',
  'haillons',
  'hall',
  'halls',
  'halle',
  'halles',
  'halte',
  'haltes',
  'hamac',
  'hamacs',
  'hamburger',
  'hamburgers',
  'hameau',
  'hameaux',
  'hamster',
  'hamsters',
  'hanche',
  'hanches',
  'handball',
  'handicap',
  'handicaps',
  'hangar',
  'hangars',
  'hanneton',
  'hannetons',
  'hantise',
  'hantises',
  'harangue',
  'harangues',
  'haras',
  'harcèlement',
  'harcèlements',
  'hardiesse',
  'hareng',
  'harengs',
  'hargne',
  'harnais',
  'harpe',
  'harpes',
  'harpon',
  'harpons',
  'hasard',
  'hasards',
  'hâte',
  'hauban',
  'haubans',
  'hausse',
  'hausses',
  'haut',
  'hauts',
  'hauteur',
  'hauteurs',
  'havre',
  'havres',
  'hérisson',
  'hérissons',
  'héron',
  'hérons',
  'herse',
  'herses',
  'hêtre',
  'hêtres',
  'heurt',
  'heurts',
  'hibou',
  'hiboux',
  'hic',
  'hics',
  'hiérarchie',
  'hiérarchies',
  'hiéroglyphe',
  'hiéroglyphes',
  'hippie',
  'hippies',
  'hobby',
  'hobbies',
  'hochement',
  'hochements',
  'hochet',
  'hochets',
  'hockey',
  'hollande',
  'hollandais',
  'hollandaise',
  'homard',
  'homards',
  'hongrie',
  'hongrois',
  'hongroise',
  'hoquet',
  'hoquets',
  'horde',
  'hordes',
  'hors-d\'œuvre',
  'hors-d\'oeuvre',
  'hot-dog',
  'hot-dogs',
  'hotte',
  'hottes',
  'houblon',
  'houille',
  'houle',
  'hourra',
  'hourras',
  'housse',
  'housses',
  'houx',
  'hublot',
  'hublots',
  'huche',
  'huches',
  'huée',
  'huées',
  'huit',
  'hussard',
  'hussards',
  'hutte',
  'huttes',
  'hyène',
  'hyènes',
]);

/**
 * Checks whether a French word begins with an aspirated 'h' (h aspiré).
 * Nouns starting with h aspiré do NOT permit definite article elision (le/la -> l').
 *
 * Examples:
 *   - héros, haricot, haine, honte -> true (H aspiré, no elision)
 *   - homme, hôtel, histoire, héroïne -> false (H muet, elision permitted)
 */
export function isHAspire(input: string): boolean {
  if (!input) return false;
  const clean = cleanNounLemma(input).toLowerCase();
  if (!clean.startsWith('h')) return false;

  // Words with 'héroï-' or 'hérit-' are Greek/Latin origin with H muet:
  // e.g. héroïne, héroïsme, héroïque, héritage, héritier are H muet!
  if (/^h[eé]ro[iï]|^h[eé]rit/i.test(clean)) {
    return false;
  }

  if (FRENCH_H_ASPIRE_WORDS.has(clean)) {
    return true;
  }

  // Singularize regular plural (-s, -x) and re-check
  if (clean.endsWith('s') && FRENCH_H_ASPIRE_WORDS.has(clean.slice(0, -1))) {
    return true;
  }
  if (clean.endsWith('x') && FRENCH_H_ASPIRE_WORDS.has(clean.slice(0, -1))) {
    return true;
  }

  return false;
}

/**
 * Strips diacritical marks (accents) from a string for accent-insensitive comparison.
 *
 * Example:
 *   "élève"  -> "eleve"
 *   "hôtel"  -> "hotel"
 *   "français" -> "francais"
 */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Checks whether a French noun lemma starts with a vowel sound
 * (or h muet), meaning the definite article should elide to "l'".
 *
 * Rules:
 *   - Starts with a vowel (a, e, i, o, u, y, and accented variants) -> true
 *   - Starts with 'h' + h muet (not in h aspiré list) -> true
 *   - Starts with 'h' + h aspiré (in h aspiré list) -> false
 *   - Starts with a consonant -> false
 *
 * @param lemma The noun lemma to check (will be cleaned via cleanNounLemma).
 * @param isHAspireOverride Optional explicit override. If true, blocks elision.
 *                          If false, forces elision for h-initial words.
 *                          If undefined, auto-detects via h aspiré dictionary.
 */
export function isElisionNoun(lemma: string, isHAspireOverride?: boolean): boolean {
  const clean = cleanNounLemma(lemma).toLowerCase();
  if (!clean) return false;

  // Vowel check (excluding 'h')
  if (/^[aeiouyéèêëàâäîïôöùûüÿœæ]/i.test(clean)) {
    return true;
  }

  // 'h' check
  if (clean.startsWith('h')) {
    // Explicit override takes priority
    if (isHAspireOverride === true) return false;
    if (isHAspireOverride === false) return true;
    // Auto-detect: if h aspiré, no elision; if h muet, elision
    return !isHAspire(clean);
  }

  return false;
}

/**
 * Generates the default French plural form for a noun lemma.
 *
 * Basic French plural rules:
 *   - Ends with -s, -x, -z: unchanged
 *   - Ends with -eau, -au: add -x
 *   - Ends with -al: replace with -aux
 *   - Otherwise: add -s
 */
export function defaultFrenchPlural(lemma: string): string {
  const clean = cleanNounLemma(lemma);
  if (!clean) return '';

  // Already ends with -s, -x, -z: invariable
  if (/[sxz]$/i.test(clean)) return clean;

  // -eau, -au -> -eaux, -aux
  if (/eau$/i.test(clean)) return clean + 'x';
  if (/au$/i.test(clean)) return clean + 'x';

  // -al -> -aux
  if (/al$/i.test(clean)) return clean.slice(0, -2) + 'aux';

  // Default: add -s
  return clean + 's';
}

/**
 * Result of detecting an article and gender from user input.
 */
export interface ArticleGenderDetection {
  lemma: string;
  detectedGender?: Gender;
  isKnownShared: boolean;
  article?: string;
}

/**
 * Detects the article and gender from a user-typed French noun input.
 *
 * Example:
 *   "le livre"  -> { lemma: "livre", detectedGender: Masculine, isKnownShared: false, article: "le" }
 *   "la maison" -> { lemma: "maison", detectedGender: Feminine, isKnownShared: false, article: "la" }
 *   "l'élève"   -> { lemma: "élève", detectedGender: undefined, isKnownShared: true, article: "l'" }
 *   "un ami"    -> { lemma: "ami", detectedGender: Masculine, isKnownShared: false, article: "un" }
 *   "une amie"  -> { lemma: "amie", detectedGender: Feminine, isKnownShared: false, article: "une" }
 */
export function detectArticleAndGender(input: string): ArticleGenderDetection {
  if (!input || !input.trim()) {
    return { lemma: '', isKnownShared: false };
  }

  const trimmed = input.trim();

  // Match "l'" or "l\u2019" (elided article - gender ambiguous)
  const elisionMatch = trimmed.match(/^l['\u2019]\s*(.+)$/i);
  if (elisionMatch) {
    const lemma = elisionMatch[1].trim();
    return {
      lemma,
      detectedGender: undefined,
      isKnownShared: KNOWN_SHARED_GENDER_NOUNS.has(lemma.toLowerCase()),
      article: "l'",
    };
  }

  // Match "le" (masculine definite)
  const leMatch = trimmed.match(/^le\s+(.+)$/i);
  if (leMatch) {
    return { lemma: leMatch[1].trim(), detectedGender: Gender.Masculine, isKnownShared: false, article: 'le' };
  }

  // Match "la" (feminine definite)
  const laMatch = trimmed.match(/^la\s+(.+)$/i);
  if (laMatch) {
    return { lemma: laMatch[1].trim(), detectedGender: Gender.Feminine, isKnownShared: false, article: 'la' };
  }

  // Match "un" (masculine indefinite)
  const unMatch = trimmed.match(/^un\s+(.+)$/i);
  if (unMatch) {
    return { lemma: unMatch[1].trim(), detectedGender: Gender.Masculine, isKnownShared: false, article: 'un' };
  }

  // Match "une" (feminine indefinite)
  const uneMatch = trimmed.match(/^une\s+(.+)$/i);
  if (uneMatch) {
    return { lemma: uneMatch[1].trim(), detectedGender: Gender.Feminine, isKnownShared: false, article: 'une' };
  }

  // No article detected
  const cleanLemma = cleanNounLemma(trimmed);
  return {
    lemma: cleanLemma || trimmed,
    detectedGender: undefined,
    isKnownShared: KNOWN_SHARED_GENDER_NOUNS.has(cleanLemma.toLowerCase()),
  };
}

/**
 * Builds a NounGenderFormDetails object for a given lemma and gender.
 *
 * Produces:
 *   - form, singular, plural
 *   - indefinite_article: 'un' | 'une'
 *   - definite_article: 'le' | 'la' (or "l'" for elision)
 *   - elision: whether elision applies
 *   - display_article: full display string for the article pair
 *
 * @param isHAspireOverride Optional explicit h aspiré flag for elision logic.
 */
export function buildNounGenderDetails(
  lemma: string,
  gender: Gender.Masculine | Gender.Feminine,
  isHAspireOverride?: boolean,
): NounGenderFormDetails {
  const clean = cleanNounLemma(lemma);
  const elision = isElisionNoun(clean, isHAspireOverride);
  const isFem = gender === Gender.Feminine;

  const indefiniteArticle = isFem ? 'une' : 'un';
  const baseDefArticle = isFem ? 'la' : 'le';
  const definiteArticle = elision ? "l'" : baseDefArticle;
  const displayArticle = elision ? "l'" : `${indefiniteArticle} / ${baseDefArticle}`;

  return {
    form: clean,
    singular: clean,
    plural: defaultFrenchPlural(clean),
    indefinite_article: indefiniteArticle,
    definite_article: baseDefArticle,
    elision,
    display_article: displayArticle,
    is_h_aspire: isHAspire(clean) || undefined,
  };
}

/**
 * Checks whether a noun VocabularyItem or grammar represents a shared form
 * (identical masculine and feminine spelling, e.g. "élève", "journaliste").
 */
export function isNounSharedForm(
  item: VocabularyItem | { grammar?: FormatAGrammar; surface_form?: string; gender?: Gender } | FormatANounGrammar,
): boolean {
  const grammar = (('format_a' in item ? item.format_a?.grammar : ('grammar' in item ? item.grammar : item)) as FormatANounGrammar | undefined);
  if (!grammar) return false;
  if (grammar.is_shared_form) return true;

  if (grammar.gender_choice === 'both' || grammar.gender === Gender.Both) {
    const masc = grammar.masculine_form?.lemma || grammar.forms?.masculine;
    const fem = grammar.feminine_form?.lemma || grammar.forms?.feminine;
    if (masc && fem) {
      return cleanNounLemma(masc).toLowerCase() === cleanNounLemma(fem).toLowerCase();
    }
    if (grammar.lemma && !masc && !fem) {
      return true;
    }
  }
  return false;
}

export interface NounFormsResult {
  isDual: boolean;
  isShared: boolean;
  masculine: string;
  feminine: string;
  lemma: string;
  masculineAudioText: string;
  feminineAudioText: string;
  sharedAudioText: string;
  masculinePresentation: string;
  femininePresentation: string;
  notation: string;
}

/**
 * Extracts and formats all noun forms, audio text targets, and notations.
 */
export function getNounForms(
  item: VocabularyItem | { grammar?: FormatAGrammar; surface_form?: string; gender?: Gender },
): NounFormsResult {
  const grammar = (('format_a' in item ? item.format_a?.grammar : (item as any).grammar) as FormatANounGrammar | undefined);
  const isDual = Boolean(
    grammar?.gender_choice === 'both' ||
    grammar?.gender === Gender.Both ||
    item.gender === Gender.Both ||
    (grammar?.masculine_form && grammar?.feminine_form)
  );

  const mascLemma = grammar?.masculine_form?.lemma || grammar?.forms?.masculine || '';
  const femLemma = grammar?.feminine_form?.lemma || grammar?.forms?.feminine || '';
  const pureLemma = cleanNounLemma(grammar?.lemma || item.surface_form || '');

  const isShared = isDual && (
    grammar?.is_shared_form === true ||
    (Boolean(mascLemma && femLemma) && cleanNounLemma(mascLemma).toLowerCase() === cleanNounLemma(femLemma).toLowerCase()) ||
    (Boolean(pureLemma) && (!mascLemma || !femLemma || cleanNounLemma(mascLemma).toLowerCase() === cleanNounLemma(femLemma).toLowerCase()))
  );

  const lemma = isShared ? (pureLemma || cleanNounLemma(mascLemma) || cleanNounLemma(femLemma)) : pureLemma;

  const mascPresentation = mascLemma ? cleanNounLemma(mascLemma) : lemma;
  const femPresentation = femLemma ? cleanNounLemma(femLemma) : lemma;

  const isFem = (item.gender === Gender.Feminine || grammar?.gender === Gender.Feminine);
  const singleAudioGender = isFem ? Gender.Feminine : Gender.Masculine;
  const singleAudioArticle = isFem ? 'la' : 'le';

  const mascAudioText = mascLemma
    ? formatSingleNounPresentation(mascLemma, Gender.Masculine, 'le', grammar?.is_h_aspire)
    : formatSingleNounPresentation(lemma, Gender.Masculine, 'le', grammar?.is_h_aspire);
  const femAudioText = femLemma
    ? formatSingleNounPresentation(femLemma, Gender.Feminine, 'la', grammar?.is_h_aspire)
    : formatSingleNounPresentation(lemma, Gender.Feminine, 'la', grammar?.is_h_aspire);
  const sharedAudioText = isShared
    ? formatSingleNounPresentation(lemma, Gender.Masculine, 'le', grammar?.is_h_aspire)
    : formatSingleNounPresentation(lemma, singleAudioGender, singleAudioArticle, grammar?.is_h_aspire);

  let notation = '';
  if (isShared) {
    notation = 'n, mas - fem';
  } else if (isDual) {
    notation = 'n, mas → n, fem';
  } else {
    const g = item.gender || grammar?.gender;
    notation = g === Gender.Feminine ? 'n, fem' : 'n, mas';
  }

  return {
    isDual,
    isShared,
    masculine: mascPresentation,
    feminine: femPresentation,
    lemma,
    masculineAudioText: mascAudioText,
    feminineAudioText: femAudioText,
    sharedAudioText,
    masculinePresentation: mascPresentation,
    femininePresentation: femPresentation,
    notation,
  };
}

/**
 * Formats a single noun form presentation with its definite article.
 *
 * Rules:
 *   - If noun starts with vowel / silent h: "l'${lemma}"
 *   - Otherwise (consonants or H aspiré):
 *       - Masculine: "le ${lemma}"
 *       - Feminine: "la ${lemma}"
 */
export function formatSingleNounPresentation(
  lemma: string,
  gender: Gender.Masculine | Gender.Feminine,
  underlyingArticle: 'le' | 'la' = gender === Gender.Masculine ? 'le' : 'la',
  isHAspireOverride?: boolean,
): string {
  const clean = cleanNounLemma(lemma);
  if (!clean) return '';

  if (isElisionNoun(clean, isHAspireOverride)) {
    return `l'${clean}`;
  }

  const art = underlyingArticle || (gender === Gender.Masculine ? 'le' : 'la');
  return `${art} ${clean}`;
}

/**
 * Formats the presentation string for a noun VocabularyItem or raw grammar object.
 *
 * Supports:
 *   - Masculin (e.g., "le livre", "l'homme", "le héros")
 *   - Féminin (e.g., "la voiture", "l'école", "la haine")
 *   - Shared form (e.g., "l'élève", "le / la journaliste")
 *   - Dual different forms (e.g., "l'acteur / l'actrice", "le chanteur / la chanteuse")
 */
export function formatNounPresentation(
  item: VocabularyItem | { grammar?: FormatAGrammar; surface_form?: string; gender?: Gender; part_of_speech?: PartOfSpeech },
): string {
  const grammar = ('format_a' in item ? item.format_a?.grammar : (item as any).grammar) as FormatANounGrammar | undefined;

  // Case 1: Dual forms (Masculin + Féminin)
  if (grammar && (grammar.gender_choice === 'both' || grammar.gender === Gender.Both || grammar.masculine_form || grammar.feminine_form)) {
    const mascLemma = grammar.masculine_form?.lemma || grammar.forms?.masculine;
    const femLemma = grammar.feminine_form?.lemma || grammar.forms?.feminine;

    // If shared form (exact same spelling), return single form (§3)
    if (
      grammar.is_shared_form ||
      (mascLemma && femLemma && cleanNounLemma(mascLemma).toLowerCase() === cleanNounLemma(femLemma).toLowerCase())
    ) {
      const lemma = mascLemma || femLemma || grammar.lemma || item.surface_form || '';
      return formatSingleNounPresentation(lemma, Gender.Masculine, 'le', grammar.is_h_aspire);
    }

    const mascPart = mascLemma ? formatSingleNounPresentation(mascLemma, Gender.Masculine, 'le', grammar.is_h_aspire) : '';
    const femPart = femLemma ? formatSingleNounPresentation(femLemma, Gender.Feminine, 'la', grammar.is_h_aspire) : '';

    if (mascPart && femPart) {
      return `${mascPart} / ${femPart}`;
    }
    if (mascPart) return mascPart;
    if (femPart) return femPart;
  }

  // Case 2: Single form with explicit lemma in grammar
  if (grammar && grammar.lemma) {
    const g = grammar.gender === Gender.Feminine ? Gender.Feminine : Gender.Masculine;
    const art = grammar.underlying_article || (g === Gender.Feminine ? 'la' : 'le');
    return formatSingleNounPresentation(grammar.lemma, g, art, grammar.is_h_aspire);
  }

  // Case 3: Surface form with gender metadata
  const rawText = item.surface_form || '';
  const clean = cleanNounLemma(rawText);
  if (!clean) return '';

  const g = item.gender === Gender.Feminine || grammar?.gender === Gender.Feminine
    ? Gender.Feminine
    : Gender.Masculine;
  const art = g === Gender.Feminine ? 'la' : 'le';
  return formatSingleNounPresentation(clean, g, art, grammar?.is_h_aspire);
}

/**
 * Presentation getter for any vocabulary item across cards and lists.
 * For nouns, returns the article + noun presentation.
 * For other parts of speech, returns the clean surface form.
 */
export function getCardPresentationTitle(item: VocabularyItem): string {
  if (item.part_of_speech === PartOfSpeech.Noun) {
    return formatNounPresentation(item);
  }
  return item.surface_form;
}
