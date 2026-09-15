import { VocabularyItem } from '../models/vocabulary';

export interface ReviewDueBreakdown {
  overdueItems: VocabularyItem[];
  dueItems: VocabularyItem[];
  totalDueCount: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export class ReviewDashboardService {
  /**
   * Categorizes vocabulary items into strictly Overdue and Due items.
   *
   * Rules:
   * - ONLY returns items that are due right now (next_review_at <= now).
   * - Upcoming / future review items (next_review_at > now) are STRICTLY EXCLUDED.
   * - 🔴 OVERDUE: Scheduled before today (< startOfToday) OR overdue by >= 1 hour.
   * - 🟡 DUE: Became due today / within the current window (< 1 hour overdue).
   */
  public categorizeReviewItems(
    items: VocabularyItem[],
    now: Date = new Date(),
  ): ReviewDueBreakdown {
    const nowMs = now.getTime();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();

    const overdueItems: VocabularyItem[] = [];
    const dueItems: VocabularyItem[] = [];

    for (const item of items) {
      // Items with no timestamp (e.g. brand new Level 0) are due immediately
      const nextReviewMs = item.next_review_at
        ? new Date(item.next_review_at).getTime()
        : nowMs;

      // Filter out upcoming / future items strictly
      if (nextReviewMs <= nowMs) {
        const overdueMs = nowMs - nextReviewMs;

        // Overdue if scheduled on a prior calendar day OR overdue by at least 1 hour
        if (nextReviewMs < startOfToday || overdueMs >= ONE_HOUR_MS) {
          overdueItems.push(item);
        } else {
          dueItems.push(item);
        }
      }
    }

    return {
      overdueItems,
      dueItems,
      totalDueCount: overdueItems.length + dueItems.length,
    };
  }

  /**
   * Calculates estimated review time in minutes.
   *
   * Specification:
   * - Baseline = 30 seconds per word.
   * - Displayed estimate = 20% lower than baseline (motivational, not guarantee).
   * - Formula: wordCount * 30 * 0.80 = wordCount * 24 seconds.
   * - 20 words = 8 minutes.
   * - 32 words = 12.8 ~ 13 minutes.
   */
  public calculateEstimatedMinutes(wordCount: number): number {
    if (wordCount <= 0) return 0;
    const estimatedSeconds = wordCount * 24;
    return Math.max(1, Math.round(estimatedSeconds / 60));
  }

  /**
   * Validates and normalizes user-requested session size.
   *
   * Rules:
   * - If total due items >= 20: minimum allowed is 20.
   * - If total due items < 20: minimum is 1, allows reviewing all available.
   * - No hard upper limit.
   */
  public getMinimumSessionSize(totalDueCount: number): number {
    if (totalDueCount >= 20) return 20;
    return totalDueCount > 0 ? 1 : 0;
  }

  public validateSessionSize(desiredCount: number, totalDueCount: number): number {
    const min = this.getMinimumSessionSize(totalDueCount);
    if (isNaN(desiredCount) || desiredCount < min) {
      return min;
    }
    return desiredCount;
  }

  private inMemoryPreferredQuantity: number = 20;

  /**
   * Retrieves user-configured review batch size ("How many words do you want to review?").
   * Synchronized across Home and Game page. Defaults to 20.
   */
  public getPreferredReviewQuantity(): number {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (localStorage.getItem('french_vocab_target_review_quantity')) {
          localStorage.removeItem('french_vocab_target_review_quantity');
        }
        const val = localStorage.getItem('sapience_target_review_quantity');
        if (val) {
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }
    } catch {
      // fallback to memory
    }
    return this.inMemoryPreferredQuantity;
  }

  public setPreferredReviewQuantity(qty: number): void {
    this.inMemoryPreferredQuantity = qty;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('sapience_target_review_quantity', String(qty));
      }
    } catch {
      // ignore storage error
    }
  }
}

export const reviewDashboardService = new ReviewDashboardService();
