import { VocabularyItem } from '../models/vocabulary';

export interface DailyStreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // Format: 'YYYY-MM-DD'
  historyDates: string[]; // List of 'YYYY-MM-DD' active dates
}

const STORAGE_KEY = 'sapience_daily_streak_v1';
const LEGACY_STORAGE_KEY = 'french_vocab_daily_streak';

function formatDateToIsoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayIsoDay(date: Date = new Date()): string {
  const yest = new Date(date);
  yest.setDate(yest.getDate() - 1);
  return formatDateToIsoDay(yest);
}

class DailyStreakService {
  private listeners: Set<(data: DailyStreakData) => void> = new Set();

  /**
   * Loads streak data from localStorage or reconstructs it from user's item review history.
   */
  public getStreakData(items?: VocabularyItem[], now: Date = new Date()): DailyStreakData {
    const todayStr = formatDateToIsoDay(now);
    const yesterdayStr = getYesterdayIsoDay(now);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DailyStreakData;
          if (parsed && typeof parsed.currentStreak === 'number') {
            // Check if the streak is still alive
            if (parsed.lastActiveDate === todayStr || parsed.lastActiveDate === yesterdayStr) {
              return parsed;
            } else if (parsed.lastActiveDate && parsed.lastActiveDate < yesterdayStr) {
              // Missed at least one day: streak reset to 0
              const updated: DailyStreakData = {
                ...parsed,
                currentStreak: 0,
              };
              this.saveStreakData(updated);
              return updated;
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load streak data:', e);
    }

    // Fallback: Reconstruct streak from vocabulary items' review dates if available
    if (items && items.length > 0) {
      const reconstructed = this.reconstructStreakFromItems(items, now);
      this.saveStreakData(reconstructed);
      return reconstructed;
    }

    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      historyDates: [],
    };
  }

  /**
   * Reconstructs daily streak based on distinct dates in item.last_review_at.
   */
  private reconstructStreakFromItems(items: VocabularyItem[], now: Date): DailyStreakData {
    const activeDatesSet = new Set<string>();

    for (const it of items) {
      if (it.last_review_at) {
        const d = new Date(it.last_review_at);
        if (!isNaN(d.getTime())) {
          activeDatesSet.add(formatDateToIsoDay(d));
        }
      }
    }

    if (activeDatesSet.size === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: '',
        historyDates: [],
      };
    }

    const sortedDates = Array.from(activeDatesSet).sort();
    const todayStr = formatDateToIsoDay(now);
    const yesterdayStr = getYesterdayIsoDay(now);

    const lastDate = sortedDates[sortedDates.length - 1];

    // Count backwards from last active date
    let currentStreak = 0;
    const isStreakAlive = lastDate === todayStr || lastDate === yesterdayStr;

    if (isStreakAlive) {
      let checkDate = new Date(now);
      if (lastDate === yesterdayStr) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const checkStr = formatDateToIsoDay(checkDate);
        if (activeDatesSet.has(checkStr)) {
          currentStreak += 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      currentStreak,
      longestStreak: Math.max(currentStreak, 1),
      lastActiveDate: lastDate,
      historyDates: sortedDates,
    };
  }

  /**
   * Records a study activity (review) on the specified date.
   */
  public recordActivity(now: Date = new Date()): DailyStreakData {
    const todayStr = formatDateToIsoDay(now);
    const yesterdayStr = getYesterdayIsoDay(now);
    const current = this.getStreakData(undefined, now);

    let newStreak = current.currentStreak;
    const history = new Set(current.historyDates);
    history.add(todayStr);

    if (current.lastActiveDate === todayStr) {
      // Already recorded for today
      return current;
    } else if (current.lastActiveDate === yesterdayStr) {
      // Consecutive day!
      newStreak = (current.currentStreak || 0) + 1;
    } else {
      // First day or streak broken
      newStreak = 1;
    }

    const updated: DailyStreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(current.longestStreak, newStreak),
      lastActiveDate: todayStr,
      historyDates: Array.from(history).sort(),
    };

    this.saveStreakData(updated);
    this.notify(updated);
    return updated;
  }

  private saveStreakData(data: DailyStreakData): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Failed to save daily streak to storage:', e);
    }
  }

  public subscribe(listener: (data: DailyStreakData) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(data: DailyStreakData): void {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (e) {
        console.error('Error in daily streak listener:', e);
      }
    }
  }
}

export const dailyStreakService = new DailyStreakService();
