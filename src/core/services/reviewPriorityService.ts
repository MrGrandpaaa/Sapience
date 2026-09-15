import { VocabularyItem } from '../models/vocabulary';
import { MEMORY_LEVELS_META, MemoryLevel } from '../models/srs';
import { skillPerformanceService, SKILL_LABELS_VI } from './skillPerformanceService';

export interface PriorityScoreBreakdown {
  totalScore: number;
  isOverdue: boolean;
  overdueMs: number;
  overdueScore: number;
  errorRate: number;
  errorRateScore: number;
  weakestSkillAccuracy: number;
  weakSkillScore: number;
  timeSinceLastRetrievalMs: number;
  stalenessScore: number;
  priorityExplanation: string;
}

export interface PrioritizedItem {
  item: VocabularyItem;
  priority: PriorityScoreBreakdown;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/**
 * Review Priority Service.
 *
 * Implements the deterministic 4-tier Review Priority Hierarchy:
 * 1. Overdue duration (Overdue items MUST be reviewed before currently due)
 * 2. Error rate (Higher error rate -> higher priority)
 * 3. Weak skill performance (Weaker skill -> higher priority)
 * 4. Time since last retrieval (Longer without review -> higher priority)
 *
 * Never uses pure randomness. The algorithm deterministically builds the queue.
 */
export class ReviewPriorityService {
  /**
   * Calculates the multi-tier priority score for a vocabulary item.
   */
  public calculatePriorityScore(
    item: VocabularyItem,
    now: Date = new Date(),
  ): PriorityScoreBreakdown {
    const nowMs = now.getTime();
    const nextReviewMs = item.next_review_at
      ? new Date(item.next_review_at).getTime()
      : nowMs; // If missing, treat as due immediately

    const overdueMs = nowMs - nextReviewMs;
    const isOverdue = overdueMs > 0;

    // ── TIER 1: OVERDUE DURATION ──────────────────────────────────────────
    // Overdue items get a base score of 100,000 to guarantee they strictly
    // outrank all currently-due (0 overdue) and future items.
    // Score scales with overdue hours: items overdue longer get strictly higher priority.
    let overdueScore = 0;
    if (isOverdue) {
      const overdueHours = overdueMs / ONE_HOUR_MS;
      // 100,000 base + 200 points per overdue hour (~4,800 points per day overdue)
      overdueScore = 100000 + overdueHours * 200;
    } else {
      overdueScore = 0;
    }

    // ── TIER 2: ERROR RATE ────────────────────────────────────────────────
    // Error rate = failed / (successful + failed)
    // Higher error rate -> higher priority (contributes up to 5,000 points)
    const successCount = item.successful_retrievals ?? 0;
    const failCount = item.failed_retrievals ?? 0;
    const totalRetrievals = successCount + failCount;

    let errorRate = 0;
    if (totalRetrievals > 0) {
      errorRate = failCount / totalRetrievals;
    } else if (item.level === 0) {
      // Brand-new items with 0 reviews need prompt encoding
      errorRate = 0.8;
    }

    const errorRateScore = errorRate * 5000;

    // ── TIER 3: WEAK SKILL PERFORMANCE ────────────────────────────────────
    // Identify lowest performance score across applicable tested skills
    // Weaker skill performance -> higher priority (contributes up to 3,000 points)
    // Items with CORE lexical errors get an urgent remediation boost!
    const skills = item.skill_performance;
    let weakestSkillAccuracy = 1.0;
    let weakestSkillName = 'balanced';
    let hasCoreLexicalError = false;

    if (skills) {
      const weakest = skillPerformanceService.getWeakestApplicableSkill(skills);
      if (weakest) {
        weakestSkillAccuracy = weakest.score;
        weakestSkillName = SKILL_LABELS_VI[weakest.skill] || weakest.skill;
        hasCoreLexicalError = weakest.hasCoreError;
      } else if (item.level === 0) {
        weakestSkillAccuracy = 0.2; // New item has unverified skills
        weakestSkillName = 'untested';
      }
    }

    const coreErrorBonus = hasCoreLexicalError ? 2500 : 0;
    const weakSkillScore = Math.round((1.0 - weakestSkillAccuracy) * 2500) + coreErrorBonus;

    // ── TIER 4: TIME SINCE LAST RETRIEVAL ──────────────────────────────────
    // Staleness score: how long since learner last retrieved this item
    // Longer staleness -> higher priority (contributes up to 1,000 points)
    let timeSinceLastRetrievalMs = 0;
    if (item.last_review_at) {
      timeSinceLastRetrievalMs = Math.max(
        0,
        nowMs - new Date(item.last_review_at).getTime(),
      );
    } else if (item.created_at) {
      timeSinceLastRetrievalMs = Math.max(
        0,
        nowMs - new Date(item.created_at).getTime(),
      );
    }

    const stalenessDays = timeSinceLastRetrievalMs / ONE_DAY_MS;
    const stalenessScore = Math.min(1000, stalenessDays * 20);

    // ── TOTAL COMPOSITE PRIORITY SCORE ────────────────────────────────────
    const totalScore = Math.round(
      overdueScore + errorRateScore + weakSkillScore + stalenessScore,
    );

    // Build human-friendly explanation
    let explanation = '';
    if (isOverdue) {
      const hours = Math.round(overdueMs / ONE_HOUR_MS);
      explanation =
        hours >= 24
          ? `Overdue by ${Math.floor(hours / 24)} days`
          : `Overdue by ${Math.max(1, hours)} hours`;
    } else {
      explanation = 'Due today';
    }

    if (errorRate > 0) {
      explanation += ` • Error rate: ${Math.round(errorRate * 100)}%`;
    }
    if (hasCoreLexicalError) {
      explanation += ` • Core error: ${weakestSkillName} (${weakestSkillAccuracy.toFixed(1)})`;
    } else if (weakestSkillAccuracy < 0.75 && weakestSkillName !== 'balanced') {
      explanation += ` • Weak skill: ${weakestSkillName} (${weakestSkillAccuracy.toFixed(1)})`;
    }

    return {
      totalScore,
      isOverdue,
      overdueMs,
      overdueScore,
      errorRate,
      errorRateScore,
      weakestSkillAccuracy,
      weakSkillScore,
      timeSinceLastRetrievalMs,
      stalenessScore,
      priorityExplanation: explanation,
    };
  }

  /**
   * Sorts all items by priority hierarchy:
   * 1. Overdue duration (Overdue first, longest overdue higher)
   * 2. Error rate (Higher error rate higher)
   * 3. Weak skill (Weaker skill higher)
   * 4. Time since last retrieval (Longer staleness higher)
   */
  public rankItemsForReview(
    items: VocabularyItem[],
    now: Date = new Date(),
  ): PrioritizedItem[] {
    const scored = items.map((item) => ({
      item,
      priority: this.calculatePriorityScore(item, now),
    }));

    scored.sort((a, b) => b.priority.totalScore - a.priority.totalScore);
    return scored;
  }

  /**
   * Builds the review queue containing exactly the top `count` prioritized items.
   * User selects quantity, algorithm decides which items and their exact order.
   */
  public buildReviewQueue(
    items: VocabularyItem[],
    count: number,
    now: Date = new Date(),
    allowNonDue: boolean = false,
  ): VocabularyItem[] {
    if (items.length === 0 || count <= 0) return [];

    // Filter to items that are currently due or overdue
    const nowMs = now.getTime();
    const dueItems = items.filter((it) => {
      if (!it.next_review_at) return true;
      return new Date(it.next_review_at).getTime() <= nowMs;
    });

    // Each due item is reviewed once, then scheduled into the future.
    // Never force non-due words into review unless explicitly requested for practice.
    if (dueItems.length === 0 && !allowNonDue) {
      return [];
    }

    const pool = dueItems.length > 0 ? dueItems : items;
    const ranked = this.rankItemsForReview(pool, now);

    return ranked.slice(0, count).map((r) => r.item);
  }
}

export const reviewPriorityService = new ReviewPriorityService();
