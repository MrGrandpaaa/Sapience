import { VocabularyItem } from '../../../models/vocabulary';
import { PartOfSpeech, Gender } from '../../../models/types';
import {
  GenderQuestion,
  McqOption,
  QuestionEvaluation,
} from '../../../models/games';

/**
 * GAME 4 ENGINE: GENDER & ARTICLES
 *
 * Rules:
 * - Only applies to Nouns (pos === Noun).
 * - Tests:
 *   1. Masculine vs Feminine
 *   2. Indefinite article (un vs une)
 *   3. Definite article (le vs la vs l')
 *   4. Elision resolution: identifying underlying gender for elided nouns (l'eau, l'arbre).
 */
export class GenderEngine {
  public generateQuestion(item: VocabularyItem): GenderQuestion {
    if (item.part_of_speech !== PartOfSpeech.Noun) {
      throw new Error(`Game 4 (Gender) chỉ áp dụng cho danh từ. Mục từ "${item.surface_form}" không phải danh từ.`);
    }

    const nounGender =
      item.gender ||
      (item.format_a?.grammar as any)?.gender ||
      Gender.Masculine;

    const isMasc = nounGender === Gender.Masculine;

    // Strip existing articles and notations to get the raw noun
    const rawNoun = item.surface_form
      .replace(/\s*\(n,\s*(mas|fem)\)/i, '')
      .replace(/^(une\b|un\b|des\b|les\b|le\b|la\b|l'|l’)\s*/i, '')
      .trim();

    // Check elision: starts with vowel or silent h
    const startsWithVowelOrH = /^[aeiouyéèêëàâîïôùûh]/i.test(rawNoun);

    // Question modes:
    // If word has elision -> test elision resolution ("Mạo từ xác định là l', vậy mạo từ không xác định & giống là gì?")
    // Otherwise -> alternate between gender choice and article choice
    let questionMode: 'gender_only' | 'article_only' | 'elision_resolution' = 'gender_only';

    if (startsWithVowelOrH) {
      questionMode = 'elision_resolution';
    } else {
      questionMode = Math.random() > 0.5 ? 'gender_only' : 'article_only';
    }

    const canonicalGender = isMasc ? 'masculine' : 'feminine';
    const canonicalArticleIndefinite = isMasc ? 'un' : 'une';
    const canonicalArticleDefinite = startsWithVowelOrH ? "l'" : isMasc ? 'le' : 'la';

    let prompt = '';
    let promptSubtext: string | undefined = undefined;
    let options: McqOption[] = [];

    if (questionMode === 'elision_resolution') {
      prompt = `Identify the grammatical gender and indefinite article for « ${rawNoun} »:`;
      promptSubtext = `Note: Beginning with a vowel/silent h, this noun takes the definite article « l'${rawNoun} ».`;

      options = [
        {
          id: 'opt-correct',
          text: isMasc ? `un ${rawNoun} (Masculine)` : `une ${rawNoun} (Feminine)`,
          isCorrect: true,
          explanation: `Correct! « ${rawNoun} » is ${isMasc ? 'masculine' : 'feminine'}, taking « ${canonicalArticleIndefinite} » and elided definite article « l'${rawNoun} ».`,
        },
        {
          id: 'opt-wrong-1',
          text: isMasc ? `une ${rawNoun} (Feminine)` : `un ${rawNoun} (Masculine)`,
          isCorrect: false,
          explanation: `Incorrect gender: « ${rawNoun} » is not ${isMasc ? 'feminine' : 'masculine'}.`,
        },
        {
          id: 'opt-wrong-2',
          text: isMasc ? `le ${rawNoun} (Unelided masculine)` : `la ${rawNoun} (Unelided feminine)`,
          isCorrect: false,
          explanation: `Incorrect elision: Before a vowel or silent h, elision to « l'${rawNoun} » is mandatory.`,
        },
      ];
    } else if (questionMode === 'article_only') {
      prompt = `Select the accurate article pair (indefinite & definite) for « ${rawNoun} »:`;
      promptSubtext = undefined;

      const correctPair = `${canonicalArticleIndefinite} ${rawNoun}  /  ${canonicalArticleDefinite} ${rawNoun}`;
      const wrongPair = isMasc
        ? `une ${rawNoun}  /  la ${rawNoun}`
        : `un ${rawNoun}  /  le ${rawNoun}`;

      options = [
        {
          id: 'opt-correct',
          text: correctPair,
          isCorrect: true,
          explanation: `Correct! « ${rawNoun} » is ${isMasc ? 'masculine' : 'feminine'}.`,
        },
        {
          id: 'opt-wrong-1',
          text: wrongPair,
          isCorrect: false,
          explanation: `Incorrect gender: « ${rawNoun} » is ${isMasc ? 'masculine' : 'feminine'}, not « ${wrongPair} ».`,
        },
        {
          id: 'opt-wrong-2',
          text: `${isMasc ? 'un' : 'une'} ${rawNoun}  /  ${isMasc ? 'la' : 'le'} ${rawNoun}`,
          isCorrect: false,
          explanation: 'Indefinite and definite articles have conflicting genders!',
        },
        {
          id: 'opt-wrong-3',
          text: `des ${rawNoun}s  /  les ${rawNoun}s`,
          isCorrect: false,
          explanation: 'This is plural form, not singular.',
        },
      ];
    } else {
      // gender_only
      prompt = `Is the noun « ${rawNoun} » masculine or feminine?`;
      promptSubtext = undefined;

      options = [
        {
          id: 'opt-masc',
          text: `Masculine (Masculin) — un / le ${rawNoun}`,
          isCorrect: isMasc,
          explanation: isMasc
            ? `Correct! « ${rawNoun} » is a masculine noun (un ${rawNoun} / le ${rawNoun}).`
            : `Incorrect: « ${rawNoun} » is a feminine noun (une ${rawNoun} / la ${rawNoun}).`,
        },
        {
          id: 'opt-fem',
          text: `Feminine (Féminin) — une / la ${rawNoun}`,
          isCorrect: !isMasc,
          explanation: !isMasc
            ? `Correct! « ${rawNoun} » is a feminine noun (une ${rawNoun} / la ${rawNoun}).`
            : `Incorrect: « ${rawNoun} » is a masculine noun (un ${rawNoun} / le ${rawNoun}).`,
        },
      ];
    }

    return {
      id: `gen-${item.id}-${Date.now()}`,
      gameType: 'gender',
      targetItem: item,
      prompt,
      promptSubtext,
      nounFormWithoutArticle: rawNoun,
      canonicalGender,
      canonicalArticleIndefinite,
      canonicalArticleDefinite,
      hasElision: startsWithVowelOrH,
      options,
      questionMode,
    };
  }

  public evaluateAnswer(
    question: GenderQuestion,
    selectedOptionId: string,
  ): QuestionEvaluation {
    const selected = question.options.find((opt) => opt.id === selectedOptionId);
    const correctOpt = question.options.find((opt) => opt.isCorrect);

    const isCorrect = Boolean(selected?.isCorrect);

    return {
      isCorrect,
      userAnswer: selected?.text || '',
      correctAnswer: correctOpt?.text || '',
      feedbackTitle: isCorrect ? 'Correct Gender & Article!' : 'Incorrect Gender!',
      feedbackMessage: isCorrect
        ? (correctOpt?.explanation || 'Excellent! You remembered the gender of this noun accurately.')
        : `${selected?.explanation || 'Incorrect choice.'} Correct answer: « ${correctOpt?.text} ».`,
      retrievalResult: isCorrect ? 'success' : 'failure',
    };
  }
}

export const genderEngine = new GenderEngine();
