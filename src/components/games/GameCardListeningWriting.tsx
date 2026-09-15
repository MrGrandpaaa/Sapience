import { useState, useRef, useEffect, FormEvent } from 'react';
import { ListeningWritingQuestion, QuestionEvaluation } from '../../core/models/games';
import { AudioSpeakerButton } from '../AudioSpeakerButton';
import { FrenchAccentToolbar } from './FrenchAccentToolbar';
import { GameAnswerMeanings } from './GameAnswerMeanings';

interface GameCardListeningWritingProps {
  question: ListeningWritingQuestion;
  evaluation: QuestionEvaluation | null;
  onSubmitAnswer: (answer: string) => void;
}

export function GameCardListeningWriting({
  question,
  evaluation,
  onSubmitAnswer,
}: GameCardListeningWritingProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input when question changes
  useEffect(() => {
    setInputValue('');
    if (!evaluation) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [question.id]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (evaluation || !inputValue.trim()) return;
    onSubmitAnswer(inputValue.trim());
  };

  const handleInsertChar = (char: string) => {
    if (evaluation || !inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || inputValue.length;
    const end = input.selectionEnd || inputValue.length;

    const newValue = inputValue.substring(0, start) + char + inputValue.substring(end);
    setInputValue(newValue);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    }, 10);
  };

  return (
    <div className="game-card-content game-card--listening-writing">
      {/* ── Audio Speaker & Note Only (Centered & Prominent) ── */}
      <div className="game-audio-center-box">
        <AudioSpeakerButton
          text={question.audioText}
          size="xl"
          title="Click to replay audio"
        />
        {question.promptSubtext && (
          <p className="audio-center-note">{question.promptSubtext}</p>
        )}
      </div>

      {/* ── Input Form ── */}
      <form onSubmit={handleSubmit} className="game-writing-form">
        <div className="writing-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className={`writing-input ${
              evaluation
                ? evaluation.isCorrect
                  ? 'input-success'
                  : 'input-error'
                : ''
            }`}
            placeholder={
              question.requiresArticle
                ? 'e.g. une voiture, un livre...'
                : 'Type the French word...'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={Boolean(evaluation)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {!evaluation && (
            <button
              type="submit"
              className="btn-submit-writing"
              disabled={!inputValue.trim()}
            >
              Check
            </button>
          )}
        </div>

        {/* Accent Bar for Quick Diacritics */}
        {!evaluation && (
          <FrenchAccentToolbar onInsertChar={handleInsertChar} />
        )}
      </form>

      {/* ── Detailed Evaluation Breakdown ── */}
      {evaluation && (
        <div
          className={`game-eval-box ${
            evaluation.isCorrect ? 'eval-box--success' : 'eval-box--error'
          }`}
        >
          <div className="eval-header">
            <span className="eval-icon">
              {evaluation.isCorrect ? '✓' : '✗'}
            </span>
            <strong className="eval-title">{evaluation.feedbackTitle}</strong>
          </div>
          <p className="eval-message">{evaluation.feedbackMessage}</p>

          {!evaluation.isCorrect && (
            <div className="eval-correct-target">
              <span className="target-label">Correct answer:</span>
              <strong className="target-text">
                « {question.canonicalAnswer} »
              </strong>
            </div>
          )}

          <GameAnswerMeanings item={question.targetItem} />
        </div>
      )}
    </div>
  );
}
