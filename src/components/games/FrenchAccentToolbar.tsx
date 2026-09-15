import React from 'react';
import './FrenchAccentToolbar.css';

interface FrenchAccentToolbarProps {
  onInsertChar: (char: string) => void;
  disabled?: boolean;
}

const ACCENT_CHARS = ['é', 'è', 'ê', 'ë', 'à', 'â', 'î', 'ï', 'ô', 'ù', 'û', 'ç', 'œ', "'"];

export function FrenchAccentToolbar({
  onInsertChar,
  disabled = false,
}: FrenchAccentToolbarProps) {
  return (
    <div className="french-accent-toolbar" aria-label="French accent characters toolbar">
      <span className="accent-bar-label">Accents:</span>
      <div className="accent-btn-list">
        {ACCENT_CHARS.map((char) => (
          <button
            key={char}
            type="button"
            className="btn-accent-char"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsertChar(char)}
            disabled={disabled}
            tabIndex={-1}
            title={`Insert ${char}`}
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  );
}
