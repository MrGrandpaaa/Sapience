import { VocabularyItem } from '../../models/vocabulary';
import {
  GameType,
  GameQuestion,
  QuestionEvaluation,
  GameSessionResult,
  VerbConjugationQuestion,
} from '../../models/games';
import { gameApplicabilityService } from './gameApplicabilityService';
import { listeningWritingEngine } from './engines/listeningWritingEngine';
import { listeningMcqEngine } from './engines/listeningMcqEngine';
import { matchingEngine } from './engines/matchingEngine';
import { genderEngine } from './engines/genderEngine';
import { verbConjugationEngine } from './engines/verbConjugationEngine';
import { clozeEngine } from './engines/clozeEngine';
import { srsEngineService } from '../srsEngineService';
import { masterVocabularyService } from '../masterVocabularyService';
import { reviewPriorityService } from '../reviewPriorityService';
import { SkillType } from '../../models/srs';
import { PartOfSpeech, Gender } from '../../models/types';
import { gameSelectionEngine } from './gameSelectionEngine';

export interface GameSessionConfig {
  gameType?: GameType | 'mixed'; // 'mixed' uses algorithm adaptive selection
  count?: number; // default 10
  filterLevel?: number | 'due' | 'all';
}

export class ReviewGameCoordinator {
  /**
   * Builds a game question session where the algorithm decides the game for each item.
   */
  public buildSession(
    allVocab: VocabularyItem[],
    config: GameSessionConfig = {},
  ): GameQuestion[] {
    if (allVocab.length === 0) return [];

    const { gameType = 'mixed', count = 10, filterLevel = 'all' } = config;

    // 1. Filter items by level or due status if requested
    let candidateItems = [...allVocab];
    if (gameType !== 'mixed' && gameType) {
      candidateItems = candidateItems.filter((it) =>
        gameApplicabilityService.isGameApplicable(it, gameType, allVocab)
      );
    }
    if (filterLevel === 'due') {
      const nowMs = Date.now();
      candidateItems = candidateItems.filter((it) => {
        if (!it.next_review_at) return true;
        return new Date(it.next_review_at).getTime() <= nowMs;
      });
      // If none due, do not force non-due words into review queue
      if (candidateItems.length === 0) {
        return [];
      }
    } else if (typeof filterLevel === 'number') {
      const byLevel = candidateItems.filter((it) => it.level === filterLevel);
      if (byLevel.length > 0) candidateItems = byLevel;
    }

    if (candidateItems.length === 0) {
      return [];
    }

    // 2. Rank candidate items according to SRS priority hierarchy:
    // 1. Overdue duration -> 2. Error rate -> 3. Weak skill -> 4. Time since last retrieval
    // Each item is reviewed once.
    const rankedCandidates = reviewPriorityService.rankItemsForReview(candidateItems);
    const selectedItems = rankedCandidates.slice(0, count).map((r) => r.item);
    const questions: GameQuestion[] = [];
    let previousGame: GameType | undefined = undefined;

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      let assignedGame: GameType;
      const decision = gameSelectionEngine.selectGameForItem(item, previousGame, new Date(), allVocab);

      // ── GAME SELECTION LOCKING (Parts 1 & 2) ──────────────────────────────
      // When a specific game was selected, NEVER switch games mid-session.
      if (gameType === 'mixed' || !gameType) {
        assignedGame = decision.selectedGame;
      } else {
        assignedGame = gameType;
      }

      previousGame = assignedGame;
      const q = this.generateSingleQuestion(assignedGame, item, allVocab);
      if (q) {
        q.supportLevel = decision.supportLevel;
        q.selectionReason = decision.selectionReason;
        questions.push(q);
      }
    }

    // For specific games (e.g. gender, listening), randomize question presentation order
    // so items/genders are chosen/presented independently and never forced into alternating patterns
    if (gameType && gameType !== 'mixed') {
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    return questions;
  }

  /**
   * Generates a single question using the appropriate modular engine.
   */
  public generateSingleQuestion(
    gameType: GameType,
    item: VocabularyItem,
    allVocab: VocabularyItem[] = [],
    targetGender?: 'masculine' | 'feminine',
  ): GameQuestion | null {
    try {
      switch (gameType) {
        case 'listening_writing':
          return listeningWritingEngine.generateQuestion(item, targetGender);
        case 'listening_mcq':
          return listeningMcqEngine.generateQuestion(item, allVocab, targetGender);
        case 'matching':
          return matchingEngine.generateQuestion(item, allVocab);
        case 'gender':
          return genderEngine.generateQuestion(item, allVocab);
        case 'verb_conjugation':
          return verbConjugationEngine.generateQuestion(item);
        case 'cloze':
          return clozeEngine.generateQuestion(item);
        default:
          return null;
      }
    } catch (err) {
      console.warn(`Error generating question for ${gameType}:`, err);
      // Return null; do NOT switch to another game (preserve session stability)
      return null;
    }
  }

  /**
   * Evaluates user's answer and updates SRS state.
   */
  public evaluateAndRecord(
    question: GameQuestion,
    userAnswer: string,
    responseTimeMs?: number,
  ): QuestionEvaluation {
    let evaluation: QuestionEvaluation;

    switch (question.gameType) {
      case 'listening_writing':
        evaluation = listeningWritingEngine.evaluateAnswer(
          question as any,
          userAnswer,
        );
        break;
      case 'listening_mcq':
        evaluation = listeningMcqEngine.evaluateAnswer(
          question as any,
          userAnswer,
        );
        break;
      case 'matching':
        evaluation = matchingEngine.evaluateAnswer(
          question as any,
          userAnswer,
        );
        break;
      case 'gender':
        evaluation = genderEngine.evaluateAnswer(question as any, userAnswer);
        break;
      case 'verb_conjugation':
        evaluation = verbConjugationEngine.evaluateAnswer(
          question as any,
          userAnswer,
        );
        break;
      case 'cloze':
        evaluation = clozeEngine.evaluateAnswer(question as any, userAnswer);
        break;
    }

    // Map game type to canonical TrackedSkill
    let testedSkill: SkillType;
    if (question.gameType === 'listening_writing') {
      testedSkill = 'writing';
    } else if (question.gameType === 'listening_mcq') {
      testedSkill = 'listening';
    } else if (question.gameType === 'matching') {
      testedSkill = 'context';
    } else if (question.gameType === 'gender') {
      testedSkill = 'gender';
    } else if (question.gameType === 'verb_conjugation') {
      testedSkill = 'construction';
    } else if (question.gameType === 'cloze') {
      testedSkill = 'cloze';
    } else {
      testedSkill = 'context';
    }

    // Determine error severity category:
    // Core lexical error (wrong preposition, wrong conjugation form, wrong article/gender, wrong root)
    // vs minor error (accent, minor typo, formatting)
    let errorCategory: 'none' | 'minor' | 'core_lexical' = 'none';
    if (!evaluation.isCorrect) {
      if (question.gameType === 'verb_conjugation') {
        errorCategory = 'core_lexical';
      } else if (question.gameType === 'gender') {
        errorCategory = 'core_lexical';
      } else if (question.gameType === 'listening_writing') {
        const errorType = evaluation.detailedAnalysis?.errorType;
        if (errorType === 'accent' || errorType === 'apostrophe') {
          errorCategory = 'minor';
        } else {
          errorCategory = 'core_lexical';
        }
      } else if (question.gameType === 'cloze') {
        errorCategory = evaluation.retrievalResult === 'borderline' ? 'minor' : 'core_lexical';
      } else {
        errorCategory = 'core_lexical';
      }
    }

    evaluation.errorCategory = errorCategory;
    evaluation.testedSkill = testedSkill;

    // PART 7 & 8: EXTRA PRACTICE MUST BE COMPLETELY SEPARATE FROM SRS
    // When practicing through Extra Practice:
    // DO NOT change SRS level, nextReviewAt, lastReviewAt, reviewCount,
    // successfulRetrievals, failedRetrievals, currentStreak, or SRS scheduling.
    if (question.isExtraPractice) {
      return evaluation;
    }

    // Automatically record retrieval in SRS engine and persist in Master Vocabulary Service
    try {
      const targetItem = question.targetItem;

      // If verb conjugation, also record retrieval for the specific conjugation unit
      if (question.gameType === 'verb_conjugation') {
        const vcQ = question as VerbConjugationQuestion;
        if (vcQ.person) {
          masterVocabularyService.recordConjugationRetrieval(targetItem.id, vcQ.person, {
            result: evaluation.retrievalResult,
            responseTimeMs,
            testedSkill: 'construction',
            failureSeverity: errorCategory === 'core_lexical' ? 'severe' : 'mild',
            errorCategory,
          });
        }
      }

      const prevScore = targetItem.skill_performance?.[testedSkill]?.score ?? null;
      const updated = masterVocabularyService.recordRetrieval(targetItem.id, {
        result: evaluation.retrievalResult,
        responseTimeMs,
        testedSkill,
        failureSeverity: errorCategory === 'core_lexical' ? 'severe' : 'mild',
        errorCategory,
      });
      const newScore = updated?.skill_performance?.[testedSkill]?.score ?? null;

      evaluation.skillDelta = {
        skill: testedSkill,
        previousScore: prevScore,
        newScore: newScore,
        isCoreError: errorCategory === 'core_lexical',
      };
      if (updated) {
        evaluation.updatedItem = updated;
      }
    } catch (err) {
      console.error('Failed to update SRS state after game answer:', err);
    }

    return evaluation;
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

export const reviewGameCoordinator = new ReviewGameCoordinator();
