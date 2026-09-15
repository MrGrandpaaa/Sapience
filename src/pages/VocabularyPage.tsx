import { useState } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { VocabStats } from '../components/VocabStats';
import { VocabActionBar } from '../components/VocabActionBar';
import { AddVocabCard } from '../components/AddVocabCard';
import { SavedVocabList } from '../components/SavedVocabList';
import './VocabularyPage.css';

export function VocabularyPage() {
  const {
    items,
    stats,
    addItem,
    removeItem,
  } = useVocabulary();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'total' | number | null>('total');

  return (
    <div className="vocabulary-page">
      <header className="vocabulary-header">
        <h1 className="vocabulary-title">Vocabulary</h1>
        <p className="vocabulary-subtitle">
          French vocabulary catalog &amp; SRS memory states
        </p>
      </header>

      {/* ── 1. Statistics Banner at the top ── */}
      <VocabStats
        stats={stats}
        selectedLevel={selectedLevel}
        onSelectLevel={setSelectedLevel}
      />

      {/* ── 2. Search + Add Vocabulary frame with border ── */}
      <VocabActionBar
        items={items}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* ── 3. Saved Vocabulary List (Square Reference Library, 4 per row) ── */}
      <SavedVocabList
        items={items}
        onDelete={removeItem}
        selectedLevel={selectedLevel}
        onResetLevel={() => setSelectedLevel('total')}
      />

      {/* ── Modal Add Vocabulary Card ── */}
      <AddVocabCard
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addItem}
      />
    </div>
  );
}
