import { useState, useCallback, type FormEvent } from 'react';
import './NamePrompt.css';

interface NamePromptProps {
  onSubmit: (name: string) => void;
}

/**
 * Full-screen prompt shown on first visit.
 * User enters their name and presses Enter to continue.
 */
export function NamePrompt({ onSubmit }: NamePromptProps) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit(trimmed);
      }
    },
    [value, onSubmit],
  );

  return (
    <div className="name-prompt">
      <form className="name-prompt-card" onSubmit={handleSubmit}>
        <h1 className="name-prompt-title">Sapience 🇫🇷</h1>
        <p className="name-prompt-subtitle">Bienvenue! What is your name?</p>
        <input
          className="name-prompt-input"
          type="text"
          placeholder="Enter your name..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          maxLength={50}
        />
        <p className="name-prompt-hint">Press Enter to continue</p>
      </form>
    </div>
  );
}
