import { VocabularyItem } from '../../../models/vocabulary';
import { PartOfSpeech } from '../../../models/types';
import {
  ClozeQuestion,
  McqOption,
  QuestionEvaluation,
} from '../../../models/games';
import { frenchTextDiffService } from '../frenchTextDiffService';
import { VALIDATED_FRENCH_LEXICON } from '../validatedFrenchLexicon';
import {
  getConjugationUnitsList,
  cleanConjugatedForm,
} from '../../verbConjugationService';

export interface ClozeTargetMatch {
  exampleFr: string;
  exampleTranslation?: string;
  targetWordInSentence: string;
  paragraphWithBlank: string;
  blankAnswer: string;
  acceptableVariants: string[];
  testedAspect: 'vocabulary' | 'conjugation' | 'collocation' | 'grammar';
  explanation: string;
}

/**
 * Searches user-entered examples for an occurrence of the target vocabulary or its valid forms.
 *
 * Requirements:
 * - Strictly searches ONLY user-entered example sentences (example.french or examples[].french).
 * - NEVER uses constructions or collocations as fallback examples.
 * - NEVER fabricates or appends blanks to random sentences.
 * - If no user example contains the target word or any conjugated/plural/feminine form, returns null.
 */
export function findClozeTargetMatch(item: VocabularyItem): ClozeTargetMatch | null {
  const isVerb = item.part_of_speech === PartOfSpeech.Verb;
  const isNoun = item.part_of_speech === PartOfSpeech.Noun;
  const isAdj = item.part_of_speech === PartOfSpeech.Adjective;

  // 1. Gather ONLY user-entered examples (no constructions, no collocations)
  const candidateExamples: Array<{ french: string; translation?: string }> = [];
  const primaryExFr = item.format_a?.example?.french;
  if (typeof primaryExFr === 'string' && primaryExFr.trim()) {
    candidateExamples.push({
      french: primaryExFr.trim(),
      translation: item.format_a?.example?.vietnamese || item.format_a?.example?.english,
    });
  }
  if (item.format_a?.examples && Array.isArray(item.format_a.examples)) {
    for (const ex of item.format_a.examples) {
      if (typeof ex?.french === 'string' && ex.french.trim()) {
        candidateExamples.push({
          french: ex.french.trim(),
          translation: ex.vietnamese || ex.english,
        });
      }
    }
  }

  if (candidateExamples.length === 0) {
    return null;
  }

  // 2. Identify all valid word forms of this vocabulary item
  const surface = typeof item.surface_form === 'string' ? item.surface_form : '';
  const cleanSurface = surface
    .replace(/\s*\(n,\s*(mas|fem)\)/i, '')
    .trim();

  const rootWord = isNoun
    ? cleanSurface.replace(/^(une\b|un\b|des\b|les\b|le\b|la\b|l'|l’)\s*/i, '').trim()
    : isAdj && cleanSurface.includes('/')
    ? cleanSurface.split(/\s*\/\s*/)[0].trim()
    : cleanSurface;

  const candidateForms: string[] = [];
  if (rootWord) candidateForms.push(rootWord);
  if (cleanSurface && cleanSurface !== rootWord) candidateForms.push(cleanSurface);

  if (isAdj) {
    if (cleanSurface.includes('/')) {
      for (const part of cleanSurface.split(/\s*\/\s*/)) {
        if (part.trim()) candidateForms.push(part.trim());
      }
    }
    const grammar = item.format_a?.grammar as any;
    if (grammar) {
      if (typeof grammar.masculine === 'string') {
        candidateForms.push(grammar.masculine);
      } else if (grammar.masculine?.lemma && typeof grammar.masculine.lemma === 'string') {
        candidateForms.push(grammar.masculine.lemma);
      }

      if (typeof grammar.feminine === 'string') {
        candidateForms.push(grammar.feminine);
      } else if (grammar.feminine?.lemma && typeof grammar.feminine.lemma === 'string') {
        candidateForms.push(grammar.feminine.lemma);
      }

      if (typeof grammar.masculine_plural === 'string') candidateForms.push(grammar.masculine_plural);
      if (typeof grammar.feminine_plural === 'string') candidateForms.push(grammar.feminine_plural);
    }
  } else if (isNoun) {
    const grammar = item.format_a?.grammar as any;
    if (grammar) {
      // Plural can be a string or structured object { masculine?: string; feminine?: string; shared?: string }
      if (typeof grammar.plural === 'string') {
        candidateForms.push(grammar.plural);
      } else if (typeof grammar.plural === 'object' && grammar.plural !== null) {
        if (typeof grammar.plural.masculine === 'string') candidateForms.push(grammar.plural.masculine);
        if (typeof grammar.plural.feminine === 'string') candidateForms.push(grammar.plural.feminine);
        if (typeof grammar.plural.shared === 'string') candidateForms.push(grammar.plural.shared);
      }

      // masculine_form can be a string or a NounFormItem object { lemma: string, ... }
      if (typeof grammar.masculine_form === 'string') {
        candidateForms.push(grammar.masculine_form);
      } else if (grammar.masculine_form?.lemma && typeof grammar.masculine_form.lemma === 'string') {
        candidateForms.push(grammar.masculine_form.lemma);
      }

      // feminine_form can be a string or a NounFormItem object { lemma: string, ... }
      if (typeof grammar.feminine_form === 'string') {
        candidateForms.push(grammar.feminine_form);
      } else if (grammar.feminine_form?.lemma && typeof grammar.feminine_form.lemma === 'string') {
        candidateForms.push(grammar.feminine_form.lemma);
      }

      // forms map: { masculine?: string, feminine?: string }
      if (grammar.forms && typeof grammar.forms === 'object') {
        if (typeof grammar.forms.masculine === 'string') candidateForms.push(grammar.forms.masculine);
        if (typeof grammar.forms.feminine === 'string') candidateForms.push(grammar.forms.feminine);
      }

      // lemma if present as string
      if (typeof grammar.lemma === 'string') {
        candidateForms.push(grammar.lemma);
      }
    }

    // Standard plural (+s)
    if (rootWord && !rootWord.endsWith('s') && !rootWord.endsWith('x')) {
      candidateForms.push(`${rootWord}s`);
    }
  } else if (isVerb) {
    // Include non-empty conjugated forms
    const conjUnits = getConjugationUnitsList(item);
    for (const u of conjUnits) {
      if (typeof u.conjugated_form === 'string' && u.conjugated_form.trim()) {
        const cleanConj = cleanConjugatedForm(u.conjugated_form, u.person);
        if (cleanConj) candidateForms.push(cleanConj);
      }
    }
    // Also check format_a.grammar.conjugation if exists
    const conj = (item.format_a?.grammar as any)?.conjugation;
    if (conj) {
      for (const val of Object.values(conj)) {
        if (typeof val === 'string' && val.trim()) {
          candidateForms.push(val.trim());
        }
      }
    }
    // If pronominal verb (se laver), also include bare infinitive
    if (/^(se|s')\s+/i.test(rootWord)) {
      candidateForms.push(rootWord.replace(/^(se|s')\s+/i, '').trim());
    }
  }

  // Deduplicate and filter non-empty candidate forms
  const uniqueCandidates = Array.from(
    new Set(
      candidateForms
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => c.trim()),
    ),
  );

  // 3. Search each user example to find a valid match
  for (const ex of candidateExamples) {
    const sentence = ex.french;
    const tokens = sentence.split(/([\s,.;:!?«»"()’'—–]+)/);

    // Try multi-word candidates first
    const multiWordCandidates = uniqueCandidates.filter((c) => c.includes(' '));
    for (const mwc of multiWordCandidates) {
      const escaped = mwc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'i');
      const match = sentence.match(re);
      if (match) {
        const matchedStr = match[0];
        const paragraphWithBlank = sentence.replace(re, '[ _____ ]');
        return {
          exampleFr: sentence,
          exampleTranslation: ex.translation,
          targetWordInSentence: matchedStr,
          paragraphWithBlank,
          blankAnswer: matchedStr,
          acceptableVariants: Array.from(new Set([matchedStr, mwc, rootWord])),
          testedAspect: 'vocabulary',
          explanation: `The phrase « ${matchedStr} » accurately completes the passage.`,
        };
      }
    }

    // Try single-word candidates against tokens
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();
      if (!token) continue;
      const tokenNorm = token.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      for (const cand of uniqueCandidates) {
        if (cand.includes(' ')) continue;
        const candNorm = cand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (token.toLowerCase() === cand.toLowerCase() || (tokenNorm.length >= 3 && tokenNorm === candNorm)) {
          const targetWordInSentence = tokens[i];
          const blankTokens = [...tokens];
          blankTokens[i] = '[ _____ ]';
          const paragraphWithBlank = blankTokens.join('');

          const isConjugatedVerb = isVerb && targetWordInSentence.toLowerCase() !== rootWord.toLowerCase();
          const testedAspect: 'vocabulary' | 'conjugation' | 'collocation' | 'grammar' =
            isConjugatedVerb ? 'conjugation' : isAdj ? 'grammar' : 'vocabulary';

          const explanation = isVerb
            ? `The verb « ${item.surface_form} » is conjugated as « ${targetWordInSentence} » in this context.`
            : `The vocabulary word « ${item.surface_form} » accurately completes the context.`;

          return {
            exampleFr: sentence,
            exampleTranslation: ex.translation,
            targetWordInSentence,
            paragraphWithBlank,
            blankAnswer: targetWordInSentence,
            acceptableVariants: Array.from(new Set([targetWordInSentence, cand, rootWord])),
            testedAspect,
            explanation,
          };
        }
      }
    }
  }

  return null;
}

/**
 * GAME 6 ENGINE: CLOZE (Đoạn văn điền khuyết)
 *
 * Rules:
 * - Natural French short paragraph with target learned vocabulary blanked out.
 * - Sourced strictly from user-entered examples.
 */
export class ClozeEngine {
  public generateQuestion(item: VocabularyItem): ClozeQuestion {
    const isVerb = item.part_of_speech === PartOfSpeech.Verb;
    const isNoun = item.part_of_speech === PartOfSpeech.Noun;

    const match = findClozeTargetMatch(item);
    if (!match) {
      throw new Error(`Game Cloze yêu cầu câu ví dụ đã lưu chứa từ vựng "${item.surface_form}".`);
    }

    const {
      paragraphWithBlank,
      exampleTranslation,
      blankAnswer,
      acceptableVariants,
      testedAspect,
      explanation,
    } = match;

    // Generate word bank options for multiple choice cloze mode
    const distractorPool = VALIDATED_FRENCH_LEXICON.filter(
      (v) => v.surface_form.toLowerCase() !== blankAnswer.toLowerCase(),
    );

    const distractorWords: string[] = [];
    for (const d of distractorPool) {
      if (distractorWords.length >= 3) break;
      const cleanD = isNoun
        ? d.surface_form.replace(/^(une\b|un\b|des\b|les\b|le\b|la\b|l'|l’)\s*/i, '').trim()
        : d.surface_form;
      if (!distractorWords.includes(cleanD) && cleanD.toLowerCase() !== blankAnswer.toLowerCase()) {
        distractorWords.push(cleanD);
      }
    }

    const options: McqOption[] = [
      {
        id: 'opt-correct',
        text: blankAnswer,
        isCorrect: true,
        explanation: 'Correct answer.',
      },
      ...distractorWords.slice(0, 3).map((d, idx) => ({
        id: `opt-distractor-${idx}`,
        text: d,
        isCorrect: false,
        explanation: `« ${d} » does not fit the context or grammar of the sentence.`,
      })),
    ];
    this.shuffleArray(options);

    return {
      id: `cloze-${item.id}-${Date.now()}`,
      gameType: 'cloze',
      targetItem: item,
      prompt: 'Fill in the blank with the correct word in the following passage:',
      promptSubtext: isVerb
        ? 'Note: Conjugate the verb properly for the subject and tense in context.'
        : 'Note: Pay attention to natural meaning and grammatical agreement.',
      paragraphWithBlank,
      paragraphTranslationVi: exampleTranslation || item.format_a?.example?.vietnamese || item.format_a?.example?.english,
      blankAnswer,
      acceptableVariants: Array.from(new Set(acceptableVariants)),
      testedAspect,
      options,
      explanation,
    };
  }

  public evaluateAnswer(
    question: ClozeQuestion,
    userAnswer: string,
  ): QuestionEvaluation {
    // If userAnswer is an option ID
    const selectedOpt = question.options?.find((opt) => opt.id === userAnswer);
    const textToCheck = selectedOpt ? selectedOpt.text : userAnswer;

    const diff = frenchTextDiffService.evaluate(
      textToCheck,
      question.blankAnswer,
      question.acceptableVariants,
      false,
    );

    const isCorrect = diff.isCorrect;

    return {
      isCorrect,
      userAnswer: textToCheck,
      correctAnswer: question.blankAnswer,
      feedbackTitle: isCorrect ? 'Cloze Completed!' : 'Incorrect!',
      feedbackMessage: isCorrect
        ? (question.explanation || `Great job! « ${question.blankAnswer} » completes the sentence perfectly.`)
        : `You entered « ${textToCheck} ». Correct answer is « ${question.blankAnswer} ». ${question.explanation}`,
      detailedAnalysis: diff,
      retrievalResult: isCorrect ? 'success' : 'failure',
    };
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

export const clozeEngine = new ClozeEngine();
