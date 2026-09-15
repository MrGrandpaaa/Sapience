import { useState, useEffect, useMemo } from 'react';
import { UUID } from '../core/models/types';
import {
  VocabularyItem,
  VocabularyStatistics,
  VocabLevel,
  calculateVocabularyStats,
} from '../core/models/vocabulary';
import { masterVocabularyService } from '../core/services/masterVocabularyService';

/**
 * Hook managing the Master Vocabulary List.
 *
 * Connected directly to MasterVocabularyService (the persistent source of truth).
 * - Vocabulary starts completely empty (0 items).
 * - Data is only added when the user enters and learns new words.
 * - All statistics are calculated directly from genuine user data.
 * - Accessible and synchronized across components, game generators, and cloze tests.
 */
export function useVocabulary() {
  const [items, setItemsState] = useState<VocabularyItem[]>(() =>
    masterVocabularyService.getAllItems(),
  );

  // Subscribe to MasterVocabularyService changes
  useEffect(() => {
    const unsubscribe = masterVocabularyService.subscribe((updatedItems) => {
      setItemsState(updatedItems);
    });
    return unsubscribe;
  }, []);

  // Calculate live statistics directly from current items
  const stats: VocabularyStatistics = useMemo(() => {
    return calculateVocabularyStats(items);
  }, [items]);

  const addItem = (newItem: VocabularyItem) => {
    masterVocabularyService.addItem(newItem);
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
    dueItems,
    stats,
    addItem,
    updateItem,
    updateItemLevel,
    recordRetrieval,
    removeItem,
    clearAll,
    setItems: setItemsState,
  };
}
