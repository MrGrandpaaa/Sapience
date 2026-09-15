import { VocabularyItem } from '../models/vocabulary';
import { GameQuestion, QuestionEvaluation, GameType } from '../models/games';
import { SkillType } from '../models/srs';
import { reviewPriorityService } from './reviewPriorityService';
import { gameSelectionEngine, GameSelectionDecision } from './games/gameSelectionEngine';
import { reviewGameCoordinator } from './games/reviewGameCoordinator';
import { masterVocabularyService } from './masterVocabularyService';
import {
  reviewSessionPersistenceService,
  ActiveReviewSession,
} from './reviewSessionPersistenceService';
import { reviewDashboardService } from './reviewDashboardService';
import { gameApplicabilityService } from './games/gameApplicabilityService';
import { verbConjugationEngine } from './games/engines/verbConjugationEngine';

export interface ReviewAttemptRecord {
  id: string;
  sessionId: string;
  questionId: string;
  itemId: string;
  word: string;
  gameType: GameType;
  testedSkill: SkillType;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  retrievalResult: 'success' | 'borderline' | 'failure';
  errorCategory: 'none' | 'minor' | 'core_lexical';
  responseTimeMs: number;
  timestamp: string;
  skillScoreBefore: number | null;
  skillScoreAfter: number | null;
  levelBefore: number;
  levelAfter: number;
  nextReviewAt: string | null;
}

export interface ReviewSessionSummary {
  sessionId: string;
  totalQuestions: number;
  completedCount: number;
  correctCount: number;
  accuracyPercent: number;
  successCount: number;
  borderlineCount: number;
  failureCount: number;
  skillsTrained: Record<string, number>;
  attemptRecords: ReviewAttemptRecord[];
}

export interface StartSessionOptions {
  allowNonDue?: boolean;
  customGameType?: GameType | 'mixed';
}

const ATTEMPTS_STORAGE_KEY = 'sapience_review_attempts_v1';
const LEGACY_ATTEMPTS_STORAGE_KEY = 'french_vocab_review_attempt_records_v1';
const MAX_STORED_ATTEMPTS = 500;

/**
 * REVIEW SESSION ENGINE
 *
 * Coordinates the complete end-to-end review lifecycle:
 *
 * 1. Home Dashboard: user chooses review quantity
 * 2. Start Review: priority algorithm constructs queue
 * 3. Game Selection Engine: adaptively assigns optimal game per item
 * 4. User Retrieval: interaction inside modular game UI
 * 5. Scoring & Validation: evaluates spelling, accents, grammar, prepositions
 * 6. Skill Performance: updates per-skill mastery weights (core vs minor error)
 * 7. SRS Engine: updates level, streak, intervals, and schedules next_review_at
 * 8. Session Progress: updates completed count and persists mid-session progress
 * 9. Session Conclusion: clears active session and updates Home Dashboard
 *
 * Strict Rules:
 * - UI components MUST NEVER directly modify SRS memory state.
 * - Only Review & SRS services are permitted to update learning state.
 * - Every review attempt creates a persistent ReviewAttemptRecord.
 * - Vocabulary card viewing in library never passes through this engine.
 */
class ReviewSessionEngine {
  private inMemoryAttempts: ReviewAttemptRecord[] = [];
  private lastActiveSession: ActiveReviewSession | null = null;

  constructor() {
    this.loadAttempts();
  }

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
    return null;
  }

  private loadAttempts(): void {
    try {
      const storage = this.getStorage();
      if (!storage) return;
      if (storage.getItem(LEGACY_ATTEMPTS_STORAGE_KEY)) {
        storage.removeItem(LEGACY_ATTEMPTS_STORAGE_KEY);
      }
      const raw = storage.getItem(ATTEMPTS_STORAGE_KEY);
      if (raw) {
        this.inMemoryAttempts = JSON.parse(raw);
      }
    } catch {
      this.inMemoryAttempts = [];
    }
  }

  private saveAttempts(): void {
    try {
      const storage = this.getStorage();
      if (!storage) return;
      const trimmed = this.inMemoryAttempts.slice(-MAX_STORED_ATTEMPTS);
      storage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore storage error
    }
  }

  /**
   * Starts a new review session.
   *
   * Flow:
   * 1. Validates quantity against available vocabulary
   * 2. Runs priority algorithm to rank & slice candidate queue
   * 3. Runs game selection engine to assign optimal game per item
   * 4. Generates questions for each item
   * 5. Saves initial active session in persistence service
   */
  public startSession(
    desiredQuantity: number,
    options: StartSessionOptions = {},
  ): ActiveReviewSession | null {
    const allVocab = masterVocabularyService.getAllItems();
    if (allVocab.length === 0) return null;

    const now = new Date();
    const nowMs = now.getTime();

    // ── SPECIFIC GAME SESSION (Parts 1, 2, 3, 4, 5, 6, 10, 11, 12, 13) ────
    if (options.customGameType && options.customGameType !== 'mixed') {
      const targetGame = options.customGameType;

      // 1. Pre-filter by game applicability (Game-Specific Eligibility - Part 12)
      const eligibleItems = allVocab.filter((it) =>
        gameApplicabilityService.isGameApplicable(it, targetGame, allVocab)
      );
      if (eligibleItems.length === 0) return null;

      // 2. Prepare 10 items pool (or all eligible if < 10 - Part 3 & 10)
      const poolTarget = Math.min(10, eligibleItems.length);

      // 3. Separate into due items and non-due items
      const dueItems = eligibleItems.filter((it) => {
        if (!it.next_review_at) return true;
        return new Date(it.next_review_at).getTime() <= nowMs;
      });
      const nonDueItems = eligibleItems.filter((it) => {
        if (!it.next_review_at) return false;
        return new Date(it.next_review_at).getTime() > nowMs;
      });

      // 4. Normal review items have priority (Part 4)
      const rankedDue = reviewPriorityService
        .rankItemsForReview(dueItems, now)
        .map((r) => r.item);
      const selectedDue = rankedDue.slice(0, poolTarget);

      // 5. If everything reviewed or fewer than poolTarget due items, use Extra Practice (Parts 5, 6, 11)
      const neededExtra = poolTarget - selectedDue.length;
      let selectedExtra: VocabularyItem[] = [];

      if (neededExtra > 0 && nonDueItems.length > 0) {
        let rankedExtra = [...nonDueItems];

        if (targetGame === 'verb_conjugation') {
          // Rank verbs by maximum priority score among their conjugation units (Part 6 & 11)
          rankedExtra.sort((a, b) => {
            const scoreA = verbConjugationEngine.getVerbMaxPriorityScore(a, now);
            const scoreB = verbConjugationEngine.getVerbMaxPriorityScore(b, now);
            if (scoreB !== scoreA) return scoreB - scoreA;
            return (a.review_count ?? 0) - (b.review_count ?? 0);
          });
        } else {
          // Rank other POS by error rate, lowest skill performance, staleness
          rankedExtra.sort((a, b) => {
            const failRateA =
              (a.failed_retrievals ?? 0) /
              Math.max(1, (a.failed_retrievals ?? 0) + (a.successful_retrievals ?? 0));
            const failRateB =
              (b.failed_retrievals ?? 0) /
              Math.max(1, (b.failed_retrievals ?? 0) + (b.successful_retrievals ?? 0));
            if (failRateB !== failRateA) return failRateB - failRateA;
            return (a.review_count ?? 0) - (b.review_count ?? 0);
          });
        }

        selectedExtra = rankedExtra.slice(0, neededExtra);
      }

      // 6. Generate questions strictly for targetGame (Game Session Locking - Part 1)
      const questions: GameQuestion[] = [];
      const queue: VocabularyItem[] = [];

      // Add normal review questions first
      for (const item of selectedDue) {
        const q = reviewGameCoordinator.generateSingleQuestion(targetGame, item, allVocab);
        if (q) {
          q.isExtraPractice = false;
          questions.push(q);
          queue.push(item);
        }
      }

      // Add extra practice questions
      for (const item of selectedExtra) {
        const q = reviewGameCoordinator.generateSingleQuestion(targetGame, item, allVocab);
        if (q) {
          q.isExtraPractice = true;
          questions.push(q);
          queue.push(item);
        }
      }

      if (questions.length === 0) return null;

      const isSessionExtraPractice = selectedDue.length === 0;

      const newSession: ActiveReviewSession = {
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        totalWords: questions.length,
        completedCount: 0,
        currentIndex: 0,
        queueItemIds: queue.map((it) => it.id),
        serializedQuestions: questions,
        isExtraPractice: isSessionExtraPractice,
        customGameType: targetGame,
        stats: {
          correct: 0,
          total: 0,
          success: 0,
          borderline: 0,
          failure: 0,
          skillsTrained: {},
        },
        testedHistory: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      reviewSessionPersistenceService.saveSession(newSession);
      return newSession;
    }

    // ── MIXED / ADAPTIVE REVIEW MODE (Default) ───────────────────────────
    const { totalDueCount } = reviewDashboardService.categorizeReviewItems(allVocab);

    // Validate review quantity
    const validatedCount = options.allowNonDue
      ? Math.min(Math.max(1, desiredQuantity), allVocab.length)
      : reviewDashboardService.validateSessionSize(desiredQuantity, totalDueCount);

    // Build queue using priority algorithm:
    // Overdue duration -> Error rate -> Weak skills -> Time since last retrieval
    const queue = reviewPriorityService.buildReviewQueue(
      allVocab,
      validatedCount,
      now,
      options.allowNonDue ?? false,
    );

    if (queue.length === 0) return null;

    // Adaptively assign games via Game Selection Engine
    const questions: GameQuestion[] = [];
    const decisions: GameSelectionDecision[] = [];
    let prevGame: GameType | undefined = undefined;

    for (const item of queue) {
      const decision = gameSelectionEngine.selectGameForItem(
        item,
        prevGame,
        now,
        allVocab,
      );

      const assignedGame = decision.selectedGame;
      prevGame = assignedGame;

      const q = reviewGameCoordinator.generateSingleQuestion(
        assignedGame,
        item,
        allVocab,
      );

      if (q) {
        q.supportLevel = decision.supportLevel;
        q.selectionReason = decision.selectionReason;
        questions.push(q);
        decisions.push(decision);
      }
    }

    if (questions.length === 0) return null;

    // Build active session structure
    const initialStats = {
      correct: 0,
      total: 0,
      success: 0,
      borderline: 0,
      failure: 0,
      skillsTrained: {},
    };

    const newSession: ActiveReviewSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      totalWords: questions.length,
      completedCount: 0,
      currentIndex: 0,
      queueItemIds: queue.map((it) => it.id),
      serializedQuestions: questions,
      stats: initialStats,
      testedHistory: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Persist session to support mid-session resumption
    reviewSessionPersistenceService.saveSession(newSession);

    return newSession;
  }

  /**
   * Resumes an existing active review session if present.
   */
  public resumeSession(): ActiveReviewSession | null {
    return reviewSessionPersistenceService.getActiveSession();
  }

  /**
   * Checks if an active session is currently in progress.
   */
  public hasActiveSession(): boolean {
    return reviewSessionPersistenceService.hasActiveSession();
  }

  /**
   * Processes a single user retrieval attempt in a review session.
   *
   * Flow:
   * 1. Evaluates user answer via modular game scoring
   * 2. Captures item state BEFORE and AFTER retrieval
   * 3. Updates skill performance and SRS memory state
   * 4. Persists the ReviewAttemptRecord
   * 5. Updates session progress (completedCount, stats, testedHistory)
   */
  public processRetrievalAttempt(
    questionIndex: number,
    userAnswer: string,
    responseTimeMs: number = 0,
  ): {
    evaluation: QuestionEvaluation;
    record: ReviewAttemptRecord;
    session: ActiveReviewSession;
  } | null {
    const session = reviewSessionPersistenceService.getActiveSession();
    if (!session || !session.serializedQuestions[questionIndex]) return null;

    const question = session.serializedQuestions[questionIndex];
    const targetItem = question.targetItem;

    // Snapshot state BEFORE retrieval
    const itemBefore = masterVocabularyService.getItemById(targetItem.id) || targetItem;
    const levelBefore = itemBefore.level ?? 0;

    // Evaluate answer and record in SRS & skill services (UI never mutates SRS directly)
    const evaluation = reviewGameCoordinator.evaluateAndRecord(
      question,
      userAnswer,
      responseTimeMs,
    );

    // Snapshot state AFTER retrieval
    const itemAfter = evaluation.updatedItem || masterVocabularyService.getItemById(targetItem.id) || targetItem;
    const levelAfter = itemAfter.level ?? levelBefore;
    const rawSkill: SkillType = (evaluation.testedSkill as SkillType) || 'context';
    const canonicalSkillKey: keyof import('../models/srs').SkillPerformance =
      rawSkill === 'spelling'
        ? 'writing'
        : rawSkill === 'recognition'
        ? 'listening'
        : rawSkill === 'recall'
        ? 'context'
        : (rawSkill as any);

    const skillBefore =
      evaluation.skillDelta?.previousScore ??
      itemBefore.skill_performance?.[canonicalSkillKey]?.score ??
      null;
    const skillAfter =
      evaluation.skillDelta?.newScore ??
      itemAfter.skill_performance?.[canonicalSkillKey]?.score ??
      null;

    const testedSkill: SkillType = rawSkill;

    // Create persistent attempt record
    const record: ReviewAttemptRecord = {
      id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId: session.id,
      questionId: question.id,
      itemId: targetItem.id,
      word: targetItem.surface_form,
      gameType: question.gameType,
      testedSkill,
      userAnswer,
      correctAnswer: evaluation.correctAnswer,
      isCorrect: evaluation.isCorrect,
      retrievalResult: evaluation.retrievalResult,
      errorCategory: evaluation.errorCategory || (evaluation.isCorrect ? 'none' : 'core_lexical'),
      responseTimeMs,
      timestamp: new Date().toISOString(),
      skillScoreBefore: skillBefore,
      skillScoreAfter: skillAfter,
      levelBefore,
      levelAfter,
      nextReviewAt: itemAfter.next_review_at || null,
    };

    // Persist attempt record ONLY if NOT extra practice (Part 7 & 8)
    if (!question.isExtraPractice) {
      this.inMemoryAttempts.push(record);
      this.saveAttempts();
    }

    // Update session stats
    const isCorrect = evaluation.isCorrect;
    const trainedSkills = { ...session.stats.skillsTrained };
    trainedSkills[testedSkill] = (trainedSkills[testedSkill] || 0) + 1;

    const updatedStats = {
      ...session.stats,
      correct: session.stats.correct + (isCorrect ? 1 : 0),
      total: session.stats.total + 1,
      success: session.stats.success + (evaluation.retrievalResult === 'success' ? 1 : 0),
      borderline: session.stats.borderline + (evaluation.retrievalResult === 'borderline' ? 1 : 0),
      failure: session.stats.failure + (evaluation.retrievalResult === 'failure' ? 1 : 0),
      skillsTrained: trainedSkills,
    };

    const nextCompleted = questionIndex + 1;
    const updatedHistory = [
      ...session.testedHistory,
      { item: itemAfter, evaluation },
    ];

    // Save session progress
    reviewSessionPersistenceService.updateSessionProgress(
      nextCompleted,
      nextCompleted,
      updatedStats,
      updatedHistory,
    );

    const updatedSession: ActiveReviewSession = {
      ...session,
      completedCount: nextCompleted,
      currentIndex: nextCompleted,
      stats: updatedStats,
      testedHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    };

    this.lastActiveSession = updatedSession;

    return {
      evaluation,
      record,
      session: updatedSession,
    };
  }

  /**
   * Concludes the review session cleanly.
   *
   * Flow:
   * 1. Clears active session in persistence
   * 2. Home Dashboard updates automatically because items were promoted and next_review_at updated
   * 3. Returns completed session summary
   */
  public concludeSession(): ReviewSessionSummary | null {
    const session = reviewSessionPersistenceService.getActiveSession() || this.lastActiveSession;
    if (!session) return null;

    const summary: ReviewSessionSummary = {
      sessionId: session.id,
      totalQuestions: session.totalWords,
      completedCount: session.completedCount,
      correctCount: session.stats.correct,
      accuracyPercent:
        session.totalWords > 0
          ? Math.round((session.stats.correct / session.totalWords) * 100)
          : 0,
      successCount: session.stats.success,
      borderlineCount: session.stats.borderline,
      failureCount: session.stats.failure,
      skillsTrained: session.stats.skillsTrained,
      attemptRecords: this.getAttemptsForSession(session.id),
    };

    reviewSessionPersistenceService.clearActiveSession();
    this.lastActiveSession = null;
    return summary;
  }

  /**
   * Discards the active review session without concluding.
   */
  public discardSession(): void {
    reviewSessionPersistenceService.clearActiveSession();
  }

  /**
   * Retrieves all attempt records for a specific session ID.
   */
  public getAttemptsForSession(sessionId: string): ReviewAttemptRecord[] {
    return this.inMemoryAttempts.filter((a) => a.sessionId === sessionId);
  }

  /**
   * Retrieves recent attempt records for analytics or testing.
   */
  public getRecentAttempts(limit: number = 20): ReviewAttemptRecord[] {
    return this.inMemoryAttempts.slice(-limit);
  }
}

export const reviewSessionEngine = new ReviewSessionEngine();
