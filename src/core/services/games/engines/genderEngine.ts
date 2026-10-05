import { VocabularyItem } from '../../../models/vocabulary';
import { PartOfSpeech, Gender } from '../../../models/types';
import {
  GenderQuestion,
  McqOption,
  QuestionEvaluation,
} from '../../../models/games';
import { masterVocabularyService } from '../../masterVocabularyService';

function cleanNounLemma(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^(une\b|un\b|des\b|les\b|le\b|la\b|l'|l’)\s*/i, '')
    .trim();
}

function getAtomicNounForm(item: VocabularyItem): string {
  let base = item.word || item.surface_form || '';
  if (base.includes('/')) {
    const parts = base.split(/\s*\/\s*/);
    const isFem =
      item.gender === Gender.Feminine ||
      (item.format_a?.grammar as any)?.gender === Gender.Feminine;
    base = isFem && parts[1] ? parts[1] : parts[0];
  }
  return cleanNounLemma(base);
}

function isDualGenderNoun(
  item: VocabularyItem,
  targetWord: string,
  vocabList: VocabularyItem[] = []
): boolean {
  if (item.gender === Gender.Both) return true;
  const grammar = item.format_a?.grammar as any;
  if (grammar?.gender_choice === 'both' || grammar?.is_shared_form) {
    if (grammar?.masculine_form?.lemma && grammar?.feminine_form?.lemma) {
      if (
        cleanNounLemma(grammar.masculine_form.lemma).toLowerCase() ===
        cleanNounLemma(grammar.feminine_form.lemma).toLowerCase()
      ) {
        return true;
      }
    } else {
      return true;
    }
  }

  const normalizedTarget = (typeof targetWord === 'string' ? targetWord : '').trim().toLowerCase();
  if (!normalizedTarget) return false;

  const pool =
    vocabList && vocabList.length > 0
      ? vocabList
      : masterVocabularyService.getAllItems();

  let hasMasc = false;
  let hasFem = false;

  for (const v of pool) {
    if (v.part_of_speech && v.part_of_speech !== PartOfSpeech.Noun) continue;
    const vWord = getAtomicNounForm(v).toLowerCase();
    if (vWord === normalizedTarget) {
      const vGender = v.gender || (v.format_a?.grammar as any)?.gender;
      if (vGender === Gender.Masculine) hasMasc = true;
      if (vGender === Gender.Feminine) hasFem = true;
      if (vGender === Gender.Both) {
        hasMasc = true;
        hasFem = true;
      }
    }
  }

  return hasMasc && hasFem;
}

/**
 * GAME 4 ENGINE: GENDER & ARTICLES
 *
 * Rules (Prompt 5):
 * - Only applies to Nouns (pos === Noun).
 * - Target displays strictly ONE atomic stored lexical word.
 * - Exactly three answer choices:
 *   1. mas (un - le + word)
 *   2. fem (une - la + word)
 *   3. mas - fem (le + word, la + word)
 * - Words with identical spelling/pronunciation existing as both mas and fem
 *   are classified as mas - fem (Option 3).
 * - Clean evaluation without explanatory sentences.
 */
export class GenderEngine {
  public generateQuestion(
    item: VocabularyItem,
    allVocab: VocabularyItem[] = []
  ): GenderQuestion {
    if (item.part_of_speech !== PartOfSpeech.Noun) {
      throw new Error(`Game 4 (Gender) chỉ áp dụng cho danh từ. Mục từ "${item.surface_form}" không phải danh từ.`);
    }

    const nounFormWithoutArticle = getAtomicNounForm(item);

    const nounGender =
      item.gender ||
      (item.format_a?.grammar as any)?.gender ||
      Gender.Masculine;

    const isMasc = nounGender === Gender.Masculine;

    // Check elision: starts with vowel or silent h
    const startsWithVowelOrH = /^[aeiouyéèêëàâîïôùûh]/i.test(nounFormWithoutArticle);

    // Dynamically check whether this word exists in vocabulary memory as both masculine and feminine
    // with identical written form (spelling and pronunciation)
    const isDual = isDualGenderNoun(item, nounFormWithoutArticle, allVocab);

    const canonicalGender: 'masculine' | 'feminine' | 'both' = isDual
      ? 'both'
      : isMasc
      ? 'masculine'
      : 'feminine';

    const canonicalArticleIndefinite = isMasc ? 'un' : 'une';
    const canonicalArticleDefinite = startsWithVowelOrH ? "l'" : isMasc ? 'le' : 'la';

    const prompt = `Is the noun « ${nounFormWithoutArticle} » masculine, feminine, or both?`;

    // Part C: Exactly three choices:
    // 1. mas (un - le + word)
    // 2. fem (une - la + word)
    // 3. mas - fem (le + word, la + word)
    const options: McqOption[] = [
      {
        id: 'mas',
        text: 'mas',
        subtext: `un - le ${nounFormWithoutArticle}`,
        isCorrect: !isDual && isMasc,
      },
      {
        id: 'fem',
        text: 'fem',
        subtext: `une - la ${nounFormWithoutArticle}`,
        isCorrect: !isDual && !isMasc,
      },
      {
        id: 'mas - fem',
        text: 'mas - fem',
        subtext: `le ${nounFormWithoutArticle}, la ${nounFormWithoutArticle}`,
        isCorrect: isDual,
      },
    ];

    return {
      id: `gen-${item.id}-${Date.now()}`,
      gameType: 'gender',
      targetItem: item,
      prompt,
      promptSubtext: undefined,
      nounFormWithoutArticle,
      canonicalGender,
      canonicalArticleIndefinite,
      canonicalArticleDefinite,
      hasElision: startsWithVowelOrH,
      options,
      questionMode: 'gender_only',
    };
  }

  public evaluateAnswer(
    question: GenderQuestion,
    selectedOptionId: string,
  ): QuestionEvaluation {
    const selected = question.options.find(
      (opt) => opt.id === selectedOptionId || opt.text === selectedOptionId
    );
    const correctOpt = question.options.find((opt) => opt.isCorrect);

    const isCorrect = Boolean(selected?.isCorrect);

    return {
      isCorrect,
      userAnswer: selected?.text || selectedOptionId,
      correctAnswer: correctOpt?.text || '',
      feedbackTitle: isCorrect ? 'Correct' : 'Incorrect',
      feedbackMessage: isCorrect
        ? 'Correct'
        : `Correct answer: ${correctOpt?.text || ''}`,
      retrievalResult: isCorrect ? 'success' : 'failure',
    };
  }
}

export const genderEngine = new GenderEngine();
