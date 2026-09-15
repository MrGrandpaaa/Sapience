import { useState, useEffect, useCallback } from 'react';
import {
  reviewSessionPersistenceService,
  ActiveReviewSession,
} from '../core/services/reviewSessionPersistenceService';

export function useActiveReviewSession() {
  const [activeSession, setActiveSession] = useState<ActiveReviewSession | null>(() =>
    reviewSessionPersistenceService.getActiveSession(),
  );

  useEffect(() => {
    const unsubscribe = reviewSessionPersistenceService.subscribe((session) => {
      setActiveSession(session);
    });
    return unsubscribe;
  }, []);

  const clearSession = useCallback(() => {
    reviewSessionPersistenceService.clearActiveSession();
  }, []);

  return {
    activeSession,
    hasActiveSession: activeSession !== null && activeSession.completedCount < activeSession.totalWords,
    clearSession,
  };
}
