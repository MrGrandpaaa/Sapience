import { useState, useEffect, useCallback } from 'react';
import { dailyStreakService, DailyStreakData } from '../core/services/dailyStreakService';
import { VocabularyItem } from '../core/models/vocabulary';

export function useDailyStreak(items?: VocabularyItem[]) {
  const [streakData, setStreakData] = useState<DailyStreakData>(() =>
    dailyStreakService.getStreakData(items),
  );

  // Re-sync when items update
  useEffect(() => {
    setStreakData(dailyStreakService.getStreakData(items));
  }, [items]);

  // Subscribe to updates from other components / reviews
  useEffect(() => {
    const unsubscribe = dailyStreakService.subscribe((updated) => {
      setStreakData(updated);
    });
    return unsubscribe;
  }, []);

  const recordActivity = useCallback(() => {
    return dailyStreakService.recordActivity();
  }, []);

  return {
    streak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    lastActiveDate: streakData.lastActiveDate,
    recordActivity,
  };
}
