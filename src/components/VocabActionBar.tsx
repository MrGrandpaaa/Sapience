import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { VocabularyItem } from '../core/models/vocabulary';
import { searchBySpelling } from '../utils/spellingSearch';
import './VocabActionBar.css';

interface VocabActionBarProps {
  items: VocabularyItem[];
  onOpenAddModal: () => void;
}

export function VocabActionBar({ items, onOpenAddModal }: VocabActionBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search results computed strictly by spelling similarity
  const searchResults = searchQuery.trim()
    ? searchBySpelling(items, searchQuery)
    : [];

  const showDropdown = isFocused && searchQuery.trim().length > 0;

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <div className="vocab-action-frame" aria-label="Vocabulary Actions">
      {/* ── BÊN TRÁI: Search box (Kiểm tra từ đã lưu theo spelling) ── */}
      <div className="vocab-search-wrapper" ref={containerRef}>
        <div className="vocab-search-input-group">
          <SearchIcon />
          <input
            type="text"
            className="vocab-search-input"
            placeholder="Search saved vocabulary (by spelling)..."
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
          />
          {searchQuery && (
            <button
              type="button"
              className="vocab-search-clear"
              onClick={handleClear}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* ── Search results dropdown ── */}
        {showDropdown && (
          <div className="vocab-search-dropdown">
            {searchResults.length === 0 ? (
              <div className="vocab-search-empty">
                <span className="vocab-search-not-saved">word not saved</span>
              </div>
            ) : (
              <div className="vocab-search-results">
                <div className="vocab-search-results-header">
                  Found {searchResults.length} items with similar spelling:
                </div>
                <ul className="vocab-search-list">
                  {searchResults.map((item) => (
                    <li key={item.id} className="vocab-search-item">
                      <div className="vocab-search-item-main">
                        <span className="vocab-search-item-word">
                          {item.surface_form}
                        </span>
                        <span className="vocab-search-item-pos">
                          ({item.gender ? `${item.part_of_speech}, ${item.gender}` : item.part_of_speech})
                        </span>
                        <span className={`vocab-search-level-tag level-${item.level}`}>
                          Level {item.level}
                        </span>
                      </div>
                      {item.format_a?.meaning_vi && (
                        <div className="vocab-search-item-meaning">
                          {item.format_a.meaning_vi}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: Add Vocabulary Button ── */}
      <div className="vocab-action-right">
        <button
          type="button"
          className="btn-add-vocabulary"
          onClick={onOpenAddModal}
        >
          <PlusIcon />
          <span>Add Vocabulary</span>
        </button>
      </div>
    </div>
  );
}

/* ── Inline SVG icons ───────────────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg
      className="vocab-search-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="btn-add-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
