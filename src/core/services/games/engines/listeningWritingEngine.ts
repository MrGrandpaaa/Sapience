import { VocabularyItem } from '../../../models/vocabulary';
import { PartOfSpeech, Gender } from '../../../models/types';
import {
  ListeningWritingQuestion,
  QuestionEvaluation,
} from '../../../models/games';
import { frenchTextDiffService } from '../frenchTextDiffService';
import { formatPronunciationText } from '../../audioPronunciationFormatter';
import { isElisionNoun } from '../../nounPresentationService';
import { selectAdjectiveTarget, AdjectiveTargetGender } from '../../adjectivePresentationService';

/**
 * GAME 1 ENGINE: LISTENING -> WRITING
 *
 * Rules:
 * - Website plays French audio.
 * - User types the French word or phrase.
 * - Evaluates: spelling, accents, apostrophes, correct form, and articles (for nouns).
 * - For Adjectives (§2, §4, §5): Tests exactly ONE gender target ('grand' or 'grande').
 *   Audio plays ONLY that target. User types ONLY that target.
 */
export class ListeningWritingEngine {
  /**
   * Generates a Game 1 question for the target vocabulary item.
   */
  public generateQuestion(
    item: VocabularyItem,
    targetGender?: AdjectiveTargetGender,
  ): ListeningWritingQuestion {
    const isNoun = item.part_of_speech === PartOfSpeech.Noun;
    const isAdj = item.part_of_speech === PartOfSpeech.Adjective;

    // ── ADJECTIVE HANDLING (§2, §4, §5) ──────────────────────────────────────
    if (isAdj) {
      const adjTarget = selectAdjectiveTarget(item, targetGender);
      const targetForm = adjTarget ? adjTarget.form : item.surface_form.split(' / ')[0].trim();
      const effGender = adjTarget ? adjTarget.gender : (targetGender || 'masculine');

      const genderLabel = effGender === 'feminine' ? 'féminin' : 'masculin';
      const posNote = adjTarget?.positionBadge ? ` • Position: ${adjTarget.positionBadge}` : '';
      const promptSubtext = `Note: Adjectif (${genderLabel})${posNote}. Pay attention to spelling and accents.`;

      return {
        id: `lw-${item.id}-${adjTarget?.id || effGender}-${Date.now()}`,
        gameType: 'listening_writing',
        targetItem: item,
        prompt: 'Listen to the pronunciation and transcribe the French vocabulary accurately:',
        promptSubtext,
        audioText: targetForm,
        canonicalAnswer: targetForm,
        acceptableAnswers: [targetForm],
        requiresArticle: false,
        hintVietnamese: adjTarget?.meaning_vi || adjTarget?.meaning_en || item.format_a?.meaning_vi || item.format_a?.meaning_en,
        partOfSpeech: PartOfSpeech.Adjective,
        targetGender: effGender,
        targetForm,
        targetPosition: adjTarget?.position,
        adjectiveTargetId: adjTarget?.id,
      };
    }

    const audioText = formatPronunciationText(item);

    // Determine canonical answer
    // For nouns: includes article (e.g. "une voiture" or "un livre")
    let canonical = item.surface_form.trim();
    // Clean any '(n, mas)' notation
    canonical = canonical.replace(/\s*\(n,\s*(mas|fem)\)/i, '').trim();

    const acceptableAnswers: string[] = [canonical];

    // For nouns: add definite/indefinite equivalents if appropriate
    if (isNoun) {
      const nounGender = item.gender || (item.format_a?.grammar as any)?.gender;
      const cleanRoot = canonical
        .replace(/^(une\b|un\b|des\b|les\b|le\b|la\b|l'|l’)\s*/i, '')
        .trim();

      if (nounGender === Gender.Masculine) {
        acceptableAnswers.push(`un ${cleanRoot}`, `le ${cleanRoot}`);
      } else if (nounGender === Gender.Feminine) {
        acceptableAnswers.push(`une ${cleanRoot}`, `la ${cleanRoot}`);
      }

      if (isElisionNoun(cleanRoot)) {
        acceptableAnswers.push(`l'${cleanRoot}`, `l’${cleanRoot}`);
      }
    }

    return {
      id: `lw-${item.id}-${Date.now()}`,
      gameType: 'listening_writing',
      targetItem: item,
      prompt: 'Listen to the pronunciation and transcribe the French vocabulary accurately:',
      promptSubtext: isNoun
        ? 'Note: For nouns, include the required article (e.g. un / une / le / la).'
        : 'Note: Pay attention to spelling, accents, and apostrophes.',
      audioText,
      canonicalAnswer: canonical,
      acceptableAnswers: Array.from(new Set(acceptableAnswers)),
      requiresArticle: isNoun,
      hintVietnamese: item.format_a?.meaning_en || item.format_a?.meaning_vi,
      partOfSpeech: item.part_of_speech,
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
      question.requiresArticle,
    );

    let feedbackTitle = 'Correct!';
    let retrievalResult: 'success' | 'borderline' | 'failure' = 'success';

    if (!diff.isCorrect) {
      if (diff.errorType === 'accent') {
        feedbackTitle = 'Accent Error';
        // Accent mistakes count as borderline (partial recall)
        retrievalResult = 'borderline';
      } else if (diff.errorType === 'apostrophe') {
        feedbackTitle = 'Elision Apostrophe Error';
        retrievalResult = 'borderline';
      } else if (diff.errorType === 'missing_article') {
        feedbackTitle = 'Missing Article';
        retrievalResult = 'borderline';
      } else if (diff.errorType === 'wrong_article') {
        feedbackTitle = 'Incorrect Article / Gender';
        retrievalResult = 'failure';
      } else {
        feedbackTitle = 'Spelling Error';
        retrievalResult = 'failure';
      }
    }

    return {
      isCorrect: diff.isCorrect,
      userAnswer,
      correctAnswer: question.canonicalAnswer,
      feedbackTitle,
      feedbackMessage: diff.feedbackMessage,
      detailedAnalysis: diff,
      retrievalResult,
    };
  }
}

export const listeningWritingEngine = new ListeningWritingEngine();
