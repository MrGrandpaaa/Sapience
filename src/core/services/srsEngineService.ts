import {
  MemoryLevel,
  RetrievalEvaluationInput,
  SkillPerformance,
  SrsMemoryData,
  MEMORY_LEVELS_META,
  MAINTENANCE_INTERVALS_DAYS,
} from '../models/srs';
import { PartOfSpeech } from '../models/types';
import { VocabularyItem } from '../models/vocabulary';
import { skillPerformanceService } from './skillPerformanceService';

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class SrsEngineService {
  /**
   * Generates initial SRS memory data for a brand-new vocabulary item.
   * Level 0 — New: Scheduled immediately at input.
   */
  public createInitialMemoryData(
    initialLevel: MemoryLevel = 0,
    pos: PartOfSpeech = PartOfSpeech.Noun,
    item?: Partial<VocabularyItem>,
  ): SrsMemoryData {
    const now = new Date();
    const intervalMs = MEMORY_LEVELS_META[initialLevel].baselineIntervalMs;
    const nextReview = new Date(now.getTime() + intervalMs);

    return {
      level: initialLevel,
      last_review_at: null,
      next_review_at: nextReview.toISOString(),
      review_count: 0,
      successful_retrievals: 0,
      failed_retrievals: 0,
      current_streak: 0,
      average_response_time: 0,
      skill_performance: this.createEmptySkillPerformance(pos, item),
      maintenance_stage: initialLevel === 5 ? 0 : undefined,
    };
  }

  public createEmptySkillPerformance(
    pos: PartOfSpeech = PartOfSpeech.Noun,
    item?: Partial<VocabularyItem>,
  ): SkillPerformance {
    return skillPerformanceService.createInitialPerformance(pos, item);
  }

  /**
   * Evaluates an active retrieval attempt and computes memory state transition.
   *
   * Core Scientific Principles:
   * - Level NEVER advances purely due to the passage of time.
   * - Success promotes memory consolidation to the next interval.
   * - Failure triggers memory decay / relearning (Level 5 drops to Level 3 or 4, NEVER 0).
   * - Level 0 is exclusively reserved for brand-new items.
   * - Borderline retrieval holds the level or reinforces cautiously.
   */
  public evaluateRetrieval(
    current: SrsMemoryData,
    input: RetrievalEvaluationInput,
    now: Date = new Date(),
    itemContext?: Partial<VocabularyItem>,
  ): SrsMemoryData {
    const { result, responseTimeMs = 0, testedSkill, failureSeverity = 'mild', errorCategory } = input;
    const isCoreError = errorCategory === 'core_lexical';
    const effectiveSeverity = isCoreError ? 'severe' : failureSeverity;

    let newLevel = current.level;
    let newIntervalMs = 0;
    let newStreak = current.current_streak;
    let newSuccesses = current.successful_retrievals;
    let newFailures = current.failed_retrievals;
    let newMaintenanceStage = current.maintenance_stage;

    // Retention duration check:
    // Memory level advances ONLY if the item was tested AFTER its scheduled retention duration (storage time)
    // has elapsed, or if it is Level 0 (initial encoding).
    // Simply reviewing repeatedly without storage duration passing will NOT advance levels.
    const scheduledMs = current.next_review_at
      ? new Date(current.next_review_at).getTime()
      : now.getTime();
    const hasElapsedRetention = current.level === 0 || scheduledMs <= now.getTime();

    // ── CASE 1: SUCCESSFUL RETRIEVAL ─────────────────────────────────────────
    if (result === 'success') {
      newSuccesses += 1;
      newStreak += 1;

      if (!hasElapsedRetention) {
        // Reviewed ahead of time: reinforces current level without advancing
        newLevel = current.level;
        newIntervalMs = Math.max(10 * ONE_MINUTE_MS, scheduledMs - now.getTime());
      } else {
        switch (current.level) {
          case 0:
            // Level 0 -> 1: Successful initial retrieval
            newLevel = 1;
            newIntervalMs = MEMORY_LEVELS_META[1].baselineIntervalMs; // 10 minutes
            break;

          case 1:
            // Level 1 -> 2: Successful review after 10 min retention
            newLevel = 2;
            newIntervalMs = MEMORY_LEVELS_META[2].baselineIntervalMs; // 1 day
            break;

          case 2:
            // Level 2 -> 3: Successful review after 1 day retention
            newLevel = 3;
            newIntervalMs = MEMORY_LEVELS_META[3].baselineIntervalMs; // 3 days
            break;

          case 3:
            // Level 3 -> 4: Stable success after 3 days retention
            newLevel = 4;
            newIntervalMs = MEMORY_LEVELS_META[4].baselineIntervalMs; // 7 days
            break;

          case 4: {
            // Level 4 -> 5: Successful consolidation after 7 days retention
            // Must satisfy ITEM-LEVEL MASTERY!
            // "Mastered" KHÔNG có nghĩa: đúng một hoặc hai lần.
            // Mastery phải thể hiện: nhiều lần, qua thời gian, trong nhiều context/skills.
            const itemForMastery: VocabularyItem = {
              ...(itemContext || {}),
              created_at: itemContext?.created_at || current.last_review_at || now.toISOString(),
              successful_retrievals: newSuccesses,
              level: 4,
            } as any;

            const currentSkills = current.skill_performance || skillPerformanceService.createInitialPerformance(itemContext?.part_of_speech);
            const mastery = skillPerformanceService.evaluateItemMastery(
              itemForMastery,
              currentSkills,
              now,
            );

            if (mastery.isMastered) {
              newLevel = 5;
              newIntervalMs = MEMORY_LEVELS_META[5].baselineIntervalMs; // 21 days
              newMaintenanceStage = 0;
            } else {
              // Not yet mastered across multiple skills / contexts: hold at Level 4 for continued consolidation
              newLevel = 4;
              newIntervalMs = 4 * ONE_DAY_MS;
            }
            break;
          }

          case 5: {
            // Level 5: Long-Term Retention Maintenance (45 -> 90 -> 180 -> adaptive)
            newLevel = 5;
            const currentStage = current.maintenance_stage ?? 0;
            const nextStage = currentStage + 1;
            newMaintenanceStage = nextStage;

            if (nextStage === 1) {
              newIntervalMs = 45 * ONE_DAY_MS;
            } else if (nextStage === 2) {
              newIntervalMs = 90 * ONE_DAY_MS;
            } else if (nextStage === 3) {
              newIntervalMs = 180 * ONE_DAY_MS;
            } else {
              // Adaptive maintenance: 180 * 1.5 = 270 days, max 365 days
              const factor = Math.min(365, Math.round(180 * Math.pow(1.5, nextStage - 3)));
              newIntervalMs = factor * ONE_DAY_MS;
            }
            break;
          }
        }
      }
    }

    // ── CASE 2: FAILED RETRIEVAL ─────────────────────────────────────────────
    else if (result === 'failure') {
      newFailures += 1;
      newStreak = 0;
      newMaintenanceStage = 0;

      switch (current.level) {
        case 0:
          // Item was brand new and failed initial encoding: remains Level 0, schedule immediately
          newLevel = 0;
          newIntervalMs = 2 * ONE_MINUTE_MS;
          break;

        case 1:
          // Level 1 failed: remain at Level 1, schedule earlier (5 minutes)
          newLevel = 1;
          newIntervalMs = 5 * ONE_MINUTE_MS;
          break;

        case 2:
          // Level 2 failed: reduce to Level 1
          newLevel = 1;
          newIntervalMs = MEMORY_LEVELS_META[1].baselineIntervalMs; // 10 minutes
          break;

        case 3:
          // Level 3 failed: reduce to Level 2
          newLevel = 2;
          newIntervalMs = MEMORY_LEVELS_META[2].baselineIntervalMs; // 1 day
          break;

        case 4:
          // Level 4 failed: reduce to Level 2 if severe (core lexical error) or Level 3 if mild
          if (effectiveSeverity === 'severe') {
            newLevel = 2;
            newIntervalMs = MEMORY_LEVELS_META[2].baselineIntervalMs; // 1 day
          } else {
            newLevel = 3;
            newIntervalMs = MEMORY_LEVELS_META[3].baselineIntervalMs; // 3 days
          }
          break;

        case 5:
          // CRITICAL: Level 5 failure NEVER resets to Level 0!
          // Level 0 is ONLY for new items. This is memory decay, not new learning.
          // Return to Level 4 (mild severity) or Level 3 (severe core error).
          if (effectiveSeverity === 'severe') {
            newLevel = 3;
            newIntervalMs = MEMORY_LEVELS_META[3].baselineIntervalMs; // 3 days
          } else {
            newLevel = 4;
            newIntervalMs = MEMORY_LEVELS_META[4].baselineIntervalMs; // 7 days
          }
          break;
      }
    }

    // ── CASE 3: BORDERLINE RETRIEVAL ─────────────────────────────────────────
    else if (result === 'borderline') {
      // Correct but slow / hesitant / partial / mixed skill performance
      // Rule: Keep current level or advance cautiously with shorter interval
      newLevel = current.level;

      switch (current.level) {
        case 0:
          // Re-test in 5 minutes
          newIntervalMs = 5 * ONE_MINUTE_MS;
          break;
        case 1:
          // Retain Level 1, repeat 10 minutes
          newIntervalMs = 10 * ONE_MINUTE_MS;
          break;
        case 2:
          // Retain Level 2, repeat 1 day
          newIntervalMs = 1 * ONE_DAY_MS;
          break;
        case 3:
          // Retain Level 3, repeat 2 days
          newIntervalMs = 2 * ONE_DAY_MS;
          break;
        case 4:
          // Retain Level 4, repeat 4 days
          newIntervalMs = 4 * ONE_DAY_MS;
          break;
        case 5:
          // Retain Level 5, repeat 14 days without advancing maintenance stage
          newIntervalMs = 14 * ONE_DAY_MS;
          break;
      }
    }

    // Update running average response time
    const newReviewCount = current.review_count + 1;
    const prevTotalTime = current.average_response_time * current.review_count;
    const newAvgTime =
      responseTimeMs > 0
        ? Math.round((prevTotalTime + responseTimeMs) / newReviewCount)
        : current.average_response_time;

    // Update skill performance using SkillPerformanceService
    const currentSkills =
      current.skill_performance ||
      skillPerformanceService.createInitialPerformance(itemContext?.part_of_speech);
    const targetSkill = testedSkill || 'context';

    const skillResult = skillPerformanceService.recordSkillTrial(
      currentSkills,
      targetSkill,
      {
        result,
        errorCategory: input.errorCategory,
        responseTimeMs,
        now,
      },
    );
    const updatedSkills = skillResult.updatedSkills;

    // Evaluate final Item Mastery status
    const itemMastery = skillPerformanceService.evaluateItemMastery(
      {
        ...(itemContext || {}),
        created_at: itemContext?.created_at || current.last_review_at || now.toISOString(),
        successful_retrievals: newSuccesses,
        level: newLevel,
      } as any,
      updatedSkills,
      now,
    );

    const nextReviewDate = new Date(now.getTime() + newIntervalMs);

    return {
      level: newLevel,
      last_review_at: now.toISOString(),
      next_review_at: nextReviewDate.toISOString(),
      review_count: newReviewCount,
      successful_retrievals: newSuccesses,
      failed_retrievals: newFailures,
      current_streak: newStreak,
      average_response_time: newAvgTime,
      skill_performance: updatedSkills,
      maintenance_stage: newMaintenanceStage,
      item_mastery: itemMastery,
    };
  }

  /**
   * Checks whether an item is currently due for review.
   */
  public isDue(nextReviewAt: string, asOf: Date = new Date()): boolean {
    if (!nextReviewAt) return true;
    return new Date(nextReviewAt).getTime() <= asOf.getTime();
  }

  /**
   * Formats remaining time until next review in friendly Vietnamese.
   */
  public formatTimeRemaining(
    nextReviewAt: string,
    now: Date = new Date(),
  ): { isDue: boolean; text: string; diffMs: number } {
    if (!nextReviewAt) {
      return { isDue: true, text: 'Due now', diffMs: 0 };
    }

    const target = new Date(nextReviewAt).getTime();
    const current = now.getTime();
    const diffMs = target - current;

    if (diffMs <= 0) {
      return { isDue: true, text: 'Due now', diffMs };
    }

    const minutes = Math.floor(diffMs / (60 * 1000));
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (minutes < 60) {
      return { isDue: false, text: `In ${minutes}m`, diffMs };
    }
    if (hours < 24) {
      return { isDue: false, text: `In ${hours}h`, diffMs };
    }
    return { isDue: false, text: `In ${days}d`, diffMs };
  }
}

export const srsEngineService = new SrsEngineService();
