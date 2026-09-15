import { VocabularyItem } from '../models/vocabulary';
import { PartOfSpeech, Gender } from '../models/types';
import { FormatANounGrammar } from '../models/lexical';
import { formatNounPresentation, formatSingleNounPresentation } from './nounPresentationService';
import { getAdjectiveForms, AdjectiveTargetGender } from './adjectivePresentationService';

/**
 * Strips bracketed annotations such as (n, mas), (n, fem), (v), (adj),
 * as well as quotation marks.
 */
export function cleanLexicalText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\s*\([^)]*\)/g, '') // remove (n, mas), (adj, fem), etc.
    .replace(/[«»""]/g, '')       // remove quotes
    .replace(/\s+/g, ' ')         // normalize spaces
    .trim();
}

/**
 * Checks if a string starts with a French article.
 */
export function hasFrenchArticle(text: string): boolean {
  return /^(un|une|le|la|les|des|du|de\s+la|de\s+l'|l'|l’)\s+/i.test(text) ||
         /^(l'|l’)[a-zà-ÿ]/i.test(text);
}

/**
 * Formats pronunciation text according to strict linguistic rules:
 *
 * 1. NOUN:
 *    - MUST read BOTH article and noun.
 *    - Example: 'le livre', 'la voiture', 'l’homme', 'l’école'.
 *    - Dual gender: 'l’acteur, l’actrice'.
 *    - NEVER read just: 'voiture' or 'livre'.
 *
 * 2. VERB:
 *    - Read appropriate lexical form.
 *    - Example: 'se souvenir', 'attendre', 's’attendre à'.
 *
 * 3. ADJECTIVE:
 *    - Must ALWAYS read EXACTLY ONE target form (§2, §3, §10).
 *    - Masculine: 'grand'
 *    - Feminine: 'grande'
 *    - NEVER concatenate both forms (e.g. NEVER "grand grande" or "grand / grande").
 *
 * 4. PHRASE / SENTENCE:
 *    - Clean quotes and read natural French sentence.
 */
export function formatPronunciationText(
  input: VocabularyItem | { text: string; pos?: PartOfSpeech; gender?: Gender; grammar?: any; targetGender?: AdjectiveTargetGender | Gender },
  targetGenderOverride?: AdjectiveTargetGender | Gender,
): string {
  // Case A: Input is a full VocabularyItem
  if ('surface_form' in input) {
    const item = input as VocabularyItem;
    const isNoun = item.part_of_speech === PartOfSpeech.Noun;
    const isVerb = item.part_of_speech === PartOfSpeech.Verb;
    const isAdj = item.part_of_speech === PartOfSpeech.Adjective;

    const cleanedSurface = cleanLexicalText(item.surface_form);

    // Rule 1: NOUN — Must ALWAYS read with article
    if (isNoun) {
      const nounPres = formatNounPresentation(item);
      if (nounPres) {
        return nounPres.replace(/\s*\/\s*/g, ', ');
      }

      // If the surface form already contains an article (e.g. "une voiture", "un livre", "l'homme")
      if (hasFrenchArticle(cleanedSurface)) {
        return cleanedSurface;
      }

      // Check format_a grammar for specific article display or gender
      const nounGrammar = item.format_a?.grammar as FormatANounGrammar | undefined;
      const gender = item.gender || nounGrammar?.gender;

      if (gender === Gender.Feminine) {
        return `la ${cleanedSurface}`;
      }
      return `le ${cleanedSurface}`;
    }

    // Rule 2: VERB — Read appropriate lexical form
    if (isVerb) {
      return cleanedSurface;
    }

    // Rule 3: ADJECTIVE — Must ALWAYS read EXACTLY ONE target form (§2, §3, §10)
    // NEVER read "grand grande" or "grand / grande"!
    if (isAdj) {
      const forms = getAdjectiveForms(item);
      const effectiveGender = targetGenderOverride || (item as any).targetGender || item.gender;
      const isFem = effectiveGender === 'feminine' || effectiveGender === Gender.Feminine;

      if (isFem) {
        return forms.feminine || forms.masculine || cleanedSurface.split(/\s*\/\s*/)[0].trim();
      }
      // Default to masculine form
      return forms.masculine || forms.feminine || cleanedSurface.split(/\s*\/\s*/)[0].trim();
    }

    return cleanedSurface;
  }

  // Case B: Input is custom text with metadata
  const { text, pos, gender } = input;
  const targetGender = targetGenderOverride || (input as any).targetGender;
  const cleaned = cleanLexicalText(text);

  if (pos === PartOfSpeech.Noun) {
    if (hasFrenchArticle(cleaned)) {
      return cleaned;
    }
    const g = gender === Gender.Feminine ? Gender.Feminine : Gender.Masculine;
    return formatSingleNounPresentation(cleaned, g);
  }

  if (pos === PartOfSpeech.Adjective) {
    // If text contains " / " (e.g. "grand / grande"), extract target
    if (cleaned.includes('/')) {
      const parts = cleaned.split(/\s*\/\s*/).map((p) => p.trim());
      const isFem = targetGender === 'feminine' || targetGender === Gender.Feminine || gender === Gender.Feminine;
      if (isFem && parts.length > 1) {
        return parts[1];
      }
      return parts[0];
    }
    return cleaned;
  }

  return cleaned;
}
