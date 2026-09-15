import React from 'react';
import { VocabularyItem } from '../../core/models/vocabulary';
import './GameAnswerMeanings.css';

export interface GameAnswerMeaningsProps {
  item?: VocabularyItem;
  meaningEn?: string;
  meaningVi?: string;
}

export function getVocabularyMeanings(item?: VocabularyItem): { en: string; vi: string } {
  if (!item) return { en: '', vi: '' };

  let en = item.format_a?.meaning_en || '';
  let vi = item.format_a?.meaning_vi || '';

  // If item is adjective with distinct positional meanings and top level is empty
  if (item.part_of_speech === 'adjective' && item.format_a?.grammar && item.format_a.grammar.pos === 'adjective') {
    const adjGrammar = item.format_a.grammar;
    if (!en) {
      en = adjGrammar.before_entry?.meaning_en || adjGrammar.after_entry?.meaning_en || '';
    }
    if (!vi) {
      vi = adjGrammar.before_entry?.meaning_vi || adjGrammar.after_entry?.meaning_vi || '';
    }
  }

  // Fallbacks for any legacy or alternative fields
  if (!en) en = (item as any)?.meaning_en || (item as any)?.meaning || '';
  if (!vi) vi = (item as any)?.meaning_vi || '';

  return { en: en.trim(), vi: vi.trim() };
}

export const GameAnswerMeanings: React.FC<GameAnswerMeaningsProps> = ({
  item,
  meaningEn,
  meaningVi,
}) => {
  const extracted = getVocabularyMeanings(item);
  const en = (meaningEn || extracted.en).trim();
  const vi = (meaningVi || extracted.vi).trim();

  if (!en && !vi) {
    return null;
  }

  return (
    <div className="game-answer-meanings" data-testid="game-answer-meanings">
      {en && (
        <div className="game-answer-meaning-row">
          <span className="game-meaning-badge game-meaning-badge--en">EN</span>
          <span className="game-meaning-text">{en}</span>
        </div>
      )}
      {vi && (
        <div className="game-answer-meaning-row">
          <span className="game-meaning-badge game-meaning-badge--vi">VI</span>
          <span className="game-meaning-text">{vi}</span>
        </div>
      )}
    </div>
  );
};
