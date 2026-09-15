import { MouseEvent } from 'react';
import { useAudio } from '../hooks/useAudio';
import { VocabularyItem } from '../core/models/vocabulary';
import { formatPronunciationText, cleanLexicalText } from '../core/services/audioPronunciationFormatter';
import './AudioSpeakerButton.css';

interface AudioSpeakerButtonProps {
  /** Optional VocabularyItem to pronounce with grammatical rules */
  item?: VocabularyItem;
  /** Optional raw text or example sentence to pronounce */
  text?: string;
  /** Whether this is an example sentence (played at slower rate: 0.72) */
  isExample?: boolean;
  /** Custom speech rate override */
  rate?: number;
  /** Button visual size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Custom accessible tooltip title */
  title?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Reusable audio speaker button for French pronunciation.
 *
 * Automatically:
 * - Reads both article and noun for NOUN items (e.g., 'une voiture', 'un livre').
 * - Reads lexical form for VERB items (e.g., 'se souvenir').
 * - Reads adjective for ADJECTIVE items (e.g., 'grand').
 * - Reads example sentences at a slower, clearer cadence (rate 0.72).
 * - Displays loading, playing soundwave, or error fallback states.
 */
export function AudioSpeakerButton({
  item,
  text,
  isExample,
  rate,
  size = 'md',
  title,
  className = '',
}: AudioSpeakerButtonProps) {
  const { state, playVocabularyItem, play, playExample, stop, isSupported } = useAudio();

  // Determine what text is represented
  const targetToSpeak = item
    ? formatPronunciationText(item)
    : text
    ? cleanLexicalText(text)
    : '';

  // Detect example sentences: explicit flag, or title with 'example', or sentence with 3+ words
  const isExampleText =
    isExample ??
    (Boolean(title && (title.toLowerCase().includes('example') || title.toLowerCase().includes('ví dụ'))) ||
      Boolean(text && text.trim().split(/\s+/).length >= 3));

  const isCurrentPlaying =
    state.status === 'playing' &&
    ((item && state.currentItemId === item.id) ||
      (targetToSpeak && state.currentText === targetToSpeak));

  const isCurrentLoading =
    state.status === 'loading' &&
    ((item && state.currentItemId === item.id) ||
      (targetToSpeak && state.currentText === targetToSpeak));

  const isCurrentError =
    state.status === 'error' &&
    ((item && state.currentItemId === item.id) ||
      (targetToSpeak && state.currentText === targetToSpeak));

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation(); // prevent card click / navigation

    if (isCurrentPlaying) {
      stop();
      return;
    }

    if (item) {
      playVocabularyItem(item, rate ? { rate } : undefined);
    } else if (text) {
      if (isExampleText) {
        // Read example sentences slightly slower (rate 0.72)
        playExample(text, rate ? { rate } : undefined);
      } else {
        play(text, rate ? { rate } : undefined);
      }
    }
  };

  const defaultTitle = item
    ? `Listen to pronunciation: « ${targetToSpeak} »`
    : `Pronounce: « ${targetToSpeak} »`;

  const buttonTitle = !isSupported
    ? 'Browser does not support text-to-speech'
    : isCurrentError
    ? `Pronunciation error: ${state.error || 'Try again later'}`
    : title || defaultTitle;

  return (
    <button
      type="button"
      className={`audio-speaker-btn audio-speaker-btn--${size} ${
        isCurrentPlaying ? 'audio-speaker-btn--playing' : ''
      } ${isCurrentLoading ? 'audio-speaker-btn--loading' : ''} ${
        isCurrentError ? 'audio-speaker-btn--error' : ''
      } ${className}`}
      onClick={handleClick}
      title={buttonTitle}
      aria-label={buttonTitle}
      disabled={!isSupported || (!item && !text)}
    >
      {isCurrentLoading ? (
        <span className="audio-spinner" aria-hidden="true" />
      ) : isCurrentPlaying ? (
        <span className="audio-soundwave" aria-hidden="true">
          <span className="wave-bar bar-1" />
          <span className="wave-bar bar-2" />
          <span className="wave-bar bar-3" />
        </span>
      ) : isCurrentError ? (
        <span className="audio-error-icon" aria-hidden="true">!</span>
      ) : (
        <SpeakerIcon />
      )}
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg
      className="speaker-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
