import { VocabularyItem } from '../../../models/vocabulary';
import {
  MatchingQuestion,
  McqOption,
  QuestionEvaluation,
} from '../../../models/games';
import { masterVocabularyService } from '../../masterVocabularyService';

/**
 * GAME 3 ENGINE: MATCHING (French <-> English)
 *
 * Rules:
 * - Two-way matching:
 *   1. French -> English: Prompt is French word, 4 options are English meanings.
 *   2. English -> French: Prompt is English meaning, 4 options are French words.
 * - 4 options: 1 correct, 3 distractors.
 * - CRITICAL: Prompt, correct answer, and distractors MUST be sourced strictly
 *   from the saved vocabulary repository (never created/pulled from outside).
 */
export class MatchingEngine {
  public generateQuestion(
    targetItem: VocabularyItem,
    allMasterVocab: VocabularyItem[] = [],
  ): MatchingQuestion {
    // Ensure we have access to the full repository
    let repoItems = allMasterVocab;
    if (!repoItems || repoItems.length === 0) {
      repoItems = masterVocabularyService.getAllItems();
    }

    // Clean French surface form
    const targetFrench = targetItem.surface_form
      .replace(/\s*\(n,\s*(mas|fem)\)/i, '')
      .trim();

    // Extract English meaning (or Vietnamese fallback if English unavailable)
    const targetEnglish = (
      targetItem.format_a?.meaning_en ||
      targetItem.format_a?.meaning_vi ||
      targetFrench
    ).trim();

    // 1. Choose direction: 50% fr_to_en, 50% en_to_fr
    const isFrToEn = Math.random() < 0.5;
    const promptType: 'fr_to_en' | 'en_to_fr' = isFrToEn ? 'fr_to_en' : 'en_to_fr';

    const questionText = isFrToEn ? targetFrench : targetEnglish;
    const canonicalAnswer = isFrToEn ? targetEnglish : targetFrench;

    // 2. Gather distractors strictly from saved vocabulary repository
    const otherItems = repoItems.filter((it) => it.id !== targetItem.id);

    let candidateDistractorTexts: string[] = [];

    if (isFrToEn) {
      // Need English meanings
      const meanings = otherItems
        .map((it) => (it.format_a?.meaning_en || it.format_a?.meaning_vi || '').trim())
        .filter((m) => m.length > 0 && m.toLowerCase() !== targetEnglish.toLowerCase());

      candidateDistractorTexts = Array.from(new Set(meanings));
    } else {
      // Need French words
      const words = otherItems
        .map((it) => it.surface_form.replace(/\s*\(n,\s*(mas|fem)\)/i, '').trim())
        .filter((w) => w.length > 0 && w.toLowerCase() !== targetFrench.toLowerCase());

      candidateDistractorTexts = Array.from(new Set(words));
    }

    // Shuffle candidate distractors
    this.shuffleArray(candidateDistractorTexts);

    // Pick up to 3 distractors
    const chosenDistractors = candidateDistractorTexts.slice(0, 3);

    // Assemble options: 1 correct + up to 3 distractors
    const options: McqOption[] = [
      {
        id: `opt-correct-${Date.now()}`,
        text: canonicalAnswer,
        isCorrect: true,
      },
      ...chosenDistractors.map((d, idx) => ({
        id: `opt-distractor-${idx}-${Date.now()}`,
        text: d,
        isCorrect: false,
      })),
    ];

    // Shuffle options so the correct answer is randomly positioned
    this.shuffleArray(options);

    const prompt = isFrToEn
      ? 'Match the French word with its correct English meaning:'
      : 'Match the English meaning with its correct French vocabulary:';

    return {
      id: `match-${targetItem.id}-${Date.now()}`,
      gameType: 'matching',
      targetItem,
      prompt,
      promptType,
      questionText,
      targetFrench,
      targetEnglish,
      canonicalAnswer,
      options,
    };
  }

  public evaluateAnswer(
    question: MatchingQuestion,
    selectedOptionId: string,
  ): QuestionEvaluation {
    const selected = question.options.find((opt) => opt.id === selectedOptionId);
    const correctOpt = question.options.find((opt) => opt.isCorrect);
    const isCorrect = Boolean(selected?.isCorrect);

    return {
      isCorrect,
      userAnswer: selected?.text || '',
      correctAnswer: question.canonicalAnswer,
      feedbackTitle: isCorrect ? 'Correct Match!' : 'Incorrect Match!',
      feedbackMessage: isCorrect
        ? `Excellent! « ${question.targetFrench} » matches « ${question.targetEnglish} ».`
        : `You chose « ${selected?.text || ''} ». The correct answer is « ${correctOpt?.text || question.canonicalAnswer} ».`,
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

export const matchingEngine = new MatchingEngine();
