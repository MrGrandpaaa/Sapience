import { VocabularyItem } from '../models/vocabulary';
import { GameQuestion, QuestionEvaluation, GameType } from '../models/games';

export interface ActiveReviewSession {
  id: string;
  totalWords: number;
  completedCount: number; // e.g. 13
  currentIndex: number; // e.g. 13
  queueItemIds: string[];
  serializedQuestions: GameQuestion[];
  isExtraPractice?: boolean;
  customGameType?: GameType;
  stats: {
    correct: number;
    total: number;
    success: number;
    borderline: number;
    failure: number;
    skillsTrained: Record<string, number>;
  };
  testedHistory: {
    item: VocabularyItem;
    evaluation: QuestionEvaluation;
  }[];
  startedAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'sapience_active_session_v1';
const LEGACY_STORAGE_KEY = 'french_vocab_active_session_v1';

class ReviewSessionPersistenceService {
  private listeners: Set<(session: ActiveReviewSession | null) => void> = new Set();
  private inMemorySession: ActiveReviewSession | null = null;

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
    return null;
  }

  public getActiveSession(): ActiveReviewSession | null {
    try {
      const storage = this.getStorage();
      if (storage) {
        if (storage.getItem(LEGACY_STORAGE_KEY)) {
          storage.removeItem(LEGACY_STORAGE_KEY);
        }
        const raw = storage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ActiveReviewSession;
          if (
            parsed &&
            parsed.id &&
            typeof parsed.totalWords === 'number' &&
            typeof parsed.completedCount === 'number' &&
            parsed.completedCount < parsed.totalWords &&
            Array.isArray(parsed.serializedQuestions) &&
            parsed.serializedQuestions.length > 0
          ) {
            this.inMemorySession = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load active review session from storage:', e);
    }

    if (
      this.inMemorySession &&
      this.inMemorySession.completedCount < this.inMemorySession.totalWords
    ) {
      return this.inMemorySession;
    }

    return null;
  }

  public hasActiveSession(): boolean {
    return this.getActiveSession() !== null;
  }

  public saveSession(session: ActiveReviewSession): void {
    this.inMemorySession = session;
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(STORAGE_KEY, JSON.stringify(session));
      }
    } catch (e) {
      console.error('Failed to save active review session:', e);
    }
    this.notify(session);
  }

  public updateSessionProgress(
    completedCount: number,
    currentIndex: number,
    stats: ActiveReviewSession['stats'],
    testedHistory: ActiveReviewSession['testedHistory'],
  ): void {
    const current = this.getActiveSession();
    if (!current) return;

    // If session is complete, remove it
    if (completedCount >= current.totalWords) {
      this.clearActiveSession();
      return;
    }

    const updated: ActiveReviewSession = {
      ...current,
      completedCount,
      currentIndex,
      stats,
      testedHistory,
      updatedAt: new Date().toISOString(),
    };

    this.saveSession(updated);
  }

  public clearActiveSession(): void {
    this.inMemorySession = null;
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to clear active session:', e);
    }
    this.notify(null);
  }

  public subscribe(listener: (session: ActiveReviewSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(session: ActiveReviewSession | null): void {
    for (const listener of this.listeners) {
      try {
        listener(session);
      } catch (e) {
        console.error('Error in session persistence listener:', e);
      }
    }
  }
}

export const reviewSessionPersistenceService = new ReviewSessionPersistenceService();
