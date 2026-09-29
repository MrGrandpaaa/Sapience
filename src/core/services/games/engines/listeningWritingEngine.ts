import { VocabularyItem } from '../../../models/vocabulary';
import { PartOfSpeech, Gender } from '../../../models/types';
import {
  ListeningWritingQuestion,
  QuestionEvaluation,
} from '../../../models/games';
import { frenchTextDiffService } from '../frenchTextDiffService';
import {
  cleanNounLemma,
  isElisionNoun,
  KNOWN_SHARED_GENDER_NOUNS,
} from '../../nounPresentationService';
import {
  selectAdjectiveTarget,
  getAdjectiveForms,
  AdjectiveTargetGender,
} from '../../adjectivePresentationService';
import { cleanLexicalText } from '../../audioPronunciationFormatter';

/**
 * GAME 1 ENGINE: LISTENING -> WRITING (DICTATION)
 *
 * Rules (Prompt 4):
 * - Website plays audio for exactly ONE atomic word/form (e.g. 'compagnon' or 'compagne').
 * - Audio must NEVER pronounce combined forms ('compagnon / compagne').
 * - Target, audio, canonical answer, acceptable answers, and evaluation must all derive from
 *   the same atomic stored vocabulary record.
 * - If homophonic masculine/feminine records (identical spelling and pronunciation):
 *   Display the appropriate gender tag (e.g. '(n, mas)' or '(n, fem)') without explanatory sentences.
 * - Acceptable answer for dictation:
 *   A. The stored lexical form itself (bare word)
 *   OR
 *   B. The same lexical form preceded by its valid French gender/article marker (un/le for mas, une/la for fem).
 *   - The exact accepted article must correspond to the stored gender.
 *   - Opposite gender articles are strictly rejected.
 * - Incorrect result displays ONLY: Incorrect, Correct answer, Meaning.
 * - Correct result displays ONLY: Correct, Meaning.
 */
export class ListeningWritingEngine {
  /**
   * Generates a Game 1 question for the target atomic vocabulary item.
   */
  public generateQuestion(
    item: VocabularyItem,
    targetGenderOrAllVocab?: AdjectiveTargetGender | VocabularyItem[],
    explicitTargetGender?: AdjectiveTargetGender,
  ): ListeningWritingQuestion {
    const allVocab: VocabularyItem[] = Array.isArray(targetGenderOrAllVocab)
      ? targetGenderOrAllVocab
      : [];
    const targetGender: AdjectiveTargetGender | undefined = Array.isArray(targetGenderOrAllVocab)
      ? explicitTargetGender
      : targetGenderOrAllVocab;

    const isNoun = item.part_of_speech === PartOfSpeech.Noun;
    const isAdj = item.part_of_speech === PartOfSpeech.Adjective;

    let effGender: AdjectiveTargetGender =
      targetGender || (item.gender === Gender.Feminine ? 'feminine' : 'masculine');

    let cleanTargetWord = '';
    let targetPosition: any = undefined;
    let adjectiveTargetId: string | undefined = undefined;

    if (isAdj) {
      const adjTarget = selectAdjectiveTarget(item, effGender);
      if (adjTarget) {
        cleanTargetWord = adjTarget.form;
        effGender = adjTarget.gender;
        targetPosition = adjTarget.position;
        adjectiveTargetId = adjTarget.id;
      } else {
        const forms = getAdjectiveForms(item);
        const chosen =
          (effGender === 'feminine' ? forms.feminine : forms.masculine) ||
          cleanLexicalText(item.surface_form).split(/\s*\/\s*/)[effGender === 'feminine' ? 1 : 0] ||
          cleanLexicalText(item.surface_form).split(/\s*\/\s*/)[0];
        cleanTargetWord = cleanNounLemma(chosen);
      }
    } else if (isNoun) {
      const rawParts = item.surface_form.split(/\s*\/\s*/);
      const chosenPart = (rawParts.length > 1 && effGender === 'feminine') ? rawParts[1] : rawParts[0];
      cleanTargetWord = cleanNounLemma(chosenPart);
    } else {
      cleanTargetWord = cleanLexicalText(item.surface_form).split(/\s*\/\s*/)[0].trim();
    }

    // ── 1. ATOMIC AUDIO (Section 1) ──────────────────────────────────────────
    // Audio must pronounce exactly ONE atomic lexical item (e.g. 'compagnon', 'compagne').
    // NEVER 'compagnon / compagne'.
    const audioText = cleanTargetWord;
    const canonicalAnswer = cleanTargetWord;

    // ── 2. HOMOPHONIC MASC/FEM DETECTION & GENDER TAG (Section 2) ────────────
    // If masculine and feminine records have identical spelling and pronunciation,
    // display the appropriate gender tag so the learner knows which gender is tested.
    const cleanLower = cleanTargetWord.toLowerCase();
    let isHomophonic = false;

    if (isNoun && KNOWN_SHARED_GENDER_NOUNS.has(cleanLower)) {
      isHomophonic = true;
    }

    const grammar = item.format_a?.grammar as any;
    if (grammar?.is_shared_form) {
      isHomophonic = true;
    }
    if (grammar?.gender_choice === 'both' || grammar?.gender === Gender.Both) {
      const masc = grammar.masculine_form?.lemma || grammar.forms?.masculine;
      const fem = grammar.feminine_form?.lemma || grammar.forms?.feminine;
      if (masc && fem) {
        if (cleanNounLemma(masc).toLowerCase() === cleanNounLemma(fem).toLowerCase()) {
          isHomophonic = true;
        }
      } else {
        isHomophonic = true;
      }
    }

    for (const other of allVocab) {
      if (other.id === item.id) continue;
      const sameCard = Boolean(item.card_id && other.card_id && item.card_id === other.card_id);
      const sameBaseId = other.id.replace(/-(masc|fem)$/, '') === item.id.replace(/-(masc|fem)$/, '');
      const otherClean = cleanNounLemma(other.surface_form).toLowerCase();

      if ((sameCard || sameBaseId) && otherClean === cleanLower) {
        isHomophonic = true;
        break;
      }
    }

    if (isAdj) {
      const forms = getAdjectiveForms(item);
      if (forms.masculine && forms.feminine && forms.masculine.toLowerCase() === forms.feminine.toLowerCase()) {
        isHomophonic = true;
      }
    }

    // Gender label: strictly "masculin" or "feminine" if record has gender, never explanatory sentences
    let genderTag: string | undefined = undefined;
    const itemGender = item.gender || (item.format_a?.grammar as any)?.gender;
    if (isAdj || isNoun || itemGender) {
      const g = effGender || (itemGender === Gender.Feminine ? 'feminine' : itemGender === Gender.Masculine ? 'masculine' : undefined);
      if (g === 'feminine' || itemGender === Gender.Feminine) {
        genderTag = 'feminine';
      } else if (g === 'masculine' || itemGender === Gender.Masculine) {
        genderTag = 'masculin';
      }
    }

    // ── 3. ACCEPTABLE ANSWERS (Section 3) ───────────────────────────────────
    // User answer is CORRECT if it matches:
    // A. The stored lexical form itself (bare word)
    // OR
    // B. The same lexical form preceded by its valid French gender/article marker.
    // Masculine: word, un + word, le + word (or l' + word if elision)
    // Feminine: word, une + word, la + word (or l' + word if elision)
    // Do not accept the opposite gender article.
    const acceptableAnswers = new Set<string>();

    // Rule A: The stored lexical form itself
    acceptableAnswers.add(cleanTargetWord);

    // Rule B: Valid French gender/article marker
    if (isNoun) {
      const isHAspire = Boolean((item.format_a?.grammar as any)?.is_h_aspire);
      const elides = isElisionNoun(cleanTargetWord, isHAspire);

      if (effGender === 'masculine') {
        acceptableAnswers.add(`un ${cleanTargetWord}`);
        if (elides) {
          acceptableAnswers.add(`l'${cleanTargetWord}`);
          acceptableAnswers.add(`l’${cleanTargetWord}`);
        } else {
          acceptableAnswers.add(`le ${cleanTargetWord}`);
        }
      } else {
        acceptableAnswers.add(`une ${cleanTargetWord}`);
        if (elides) {
          acceptableAnswers.add(`l'${cleanTargetWord}`);
          acceptableAnswers.add(`l’${cleanTargetWord}`);
        } else {
          acceptableAnswers.add(`la ${cleanTargetWord}`);
        }
      }
    }

    return {
      id: `lw-${item.id}-${effGender || 'target'}-${Date.now()}`,
      gameType: 'listening_writing',
      targetItem: item,
      prompt: 'Listen to the pronunciation and transcribe the French vocabulary accurately:',
      promptSubtext: undefined,
      audioText,
      canonicalAnswer,
      acceptableAnswers: Array.from(acceptableAnswers),
      requiresArticle: false,
      hintVietnamese: item.format_a?.meaning_en || item.format_a?.meaning_vi,
      partOfSpeech: item.part_of_speech,
      targetGender: effGender,
      targetForm: cleanTargetWord,
      targetPosition,
      adjectiveTargetId,
      genderTag,
    };
  }

  /**
   * Evaluates user answer with deep French text diff.
   */
  public evaluateAnswer(
    question: ListeningWritingQuestion,
    userAnswer: string,
  ): QuestionEvaluation {
    const diff = frenchTextDiffService.evaluate(
      userAnswer,
      question.canonicalAnswer,
      question.acceptableAnswers,
      false, // requiresArticle is false because bare word is accepted!
    );

    const isCorrect = diff.isCorrect;

    return {
      isCorrect,
      userAnswer,
      correctAnswer: question.canonicalAnswer,
      feedbackTitle: isCorrect ? 'Correct' : 'Incorrect',
      feedbackMessage: isCorrect ? 'Correct' : 'Incorrect',
      detailedAnalysis: diff,
      retrievalResult: isCorrect ? 'success' : 'failure',
    };
  }
}

export const listeningWritingEngine = new ListeningWritingEngine();
