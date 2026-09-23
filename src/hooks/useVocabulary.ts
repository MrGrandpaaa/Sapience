import { useState, useEffect, useMemo } from 'react';
import { UUID } from '../core/models/types';
import {
  VocabularyItem,
  CardDisplayData,
  VocabularyStatistics,
  VocabLevel,
  calculateVocabularyStats,
} from '../core/models/vocabulary';
import { masterVocabularyService } from '../core/services/masterVocabularyService';

/**
 * Hook managing the Master Vocabulary List.
 *
 * Connected directly to MasterVocabularyService (the persistent source of truth).
 * - items: Atomic vocabulary memory records (used for games, SRS retrieval, algorithms).
 * - cards: Card display representations (used for rendering the vocabulary card catalog).
 */
export function useVocabulary() {
  const [items, setItemsState] = useState<VocabularyItem[]>(() =>
    masterVocabularyService.getAllItems(),
  );
  const [cards, setCardsState] = useState<CardDisplayData[]>(() =>
    masterVocabularyService.getAllCards(),
  );

  // Subscribe to MasterVocabularyService changes (both atomic items and cards)
  useEffect(() => {
    const unsubscribeItems = masterVocabularyService.subscribe((updatedItems) => {
      setItemsState(updatedItems);
    });
    const unsubscribeCards = masterVocabularyService.subscribeCards((updatedCards) => {
      setCardsState(updatedCards);
    });
    return () => {
      unsubscribeItems();
      unsubscribeCards();
    };
  }, []);

  // Calculate live statistics directly from current items
  const stats: VocabularyStatistics = useMemo(() => {
    return calculateVocabularyStats(items);
  }, [items]);

  const addItem = (newItem: VocabularyItem | CardDisplayData) => {
    return masterVocabularyService.addItem(newItem);
  };

  const updateItem = (id: UUID, updates: Partial<VocabularyItem>) => {
    return masterVocabularyService.updateItem(id, updates);
  };

  const updateItemLevel = (id: UUID, level: VocabLevel) => {
    return masterVocabularyService.updateItemLevel(id, level);
  };

  const removeItem = (id: UUID) => {
    return masterVocabularyService.removeItem(id);
  };

  const removeCard = (cardId: UUID) => {
    return masterVocabularyService.removeCard(cardId);
  };

  const clearAll = () => {
    masterVocabularyService.clearAll();
  };

  const recordRetrieval = (
    id: UUID,
    input: import('../core/models/srs').RetrievalEvaluationInput,
  ) => {
    return masterVocabularyService.recordRetrieval(id, input);
  };

  const dueItems = useMemo(() => {
    return masterVocabularyService.getDueItems();
  }, [items]);

  return {
    items,
    cards,
    dueItems,
    stats,
    addItem,
    updateItem,
    updateItemLevel,
    recordRetrieval,
    removeItem,
    removeCard,
    clearAll,
    setItems: setItemsState,
    setCards: setCardsState,
  };
}
