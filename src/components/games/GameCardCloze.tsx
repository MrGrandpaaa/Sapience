import { useState, useRef, useEffect, FormEvent } from 'react';
import { ClozeQuestion, QuestionEvaluation } from '../../core/models/games';
import { FrenchAccentToolbar } from './FrenchAccentToolbar';
import { GameAnswerMeanings } from './GameAnswerMeanings';

interface GameCardClozeProps {
  question: ClozeQuestion;
  evaluation: QuestionEvaluation | null;
  onSubmitAnswer: (answer: string) => void;
}

export function GameCardCloze({
  question,
  evaluation,
  onSubmitAnswer,
}: GameCardClozeProps) {
  const [typedValue, setTypedValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTypedValue('');
    if (!evaluation) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [question.id]);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (evaluation || !typedValue.trim()) return;
    onSubmitAnswer(typedValue.trim());
  };

  const handleInsertChar = (char: string) => {
    if (evaluation || !inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || typedValue.length;
    const end = input.selectionEnd || typedValue.length;

    const newValue = typedValue.substring(0, start) + char + typedValue.substring(end);
    setTypedValue(newValue);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    }, 10);
  };

  // Parse paragraph into pre-blank, blank slot, and post-blank segments
  const blankRegex = /\[\s*_{3,}\s*\]|\[\s*\.\.\.\s*\]|_{3,}/;
  const match = question.paragraphWithBlank.match(blankRegex);
  const parts = question.paragraphWithBlank.split(blankRegex);

  return (
    <div className="game-card-content game-card--cloze">
      {/* ── 1. Highly Readable Paragraph with Prominent Blank ── */}
      <div className="cloze-paragraph-box">
        {match && parts.length === 2 ? (
          <p className="cloze-reading-paragraph">
            <span>{parts[0]}</span>
            <span
              className={`cloze-blank-inline ${
                evaluation
                  ? evaluation.isCorrect
                    ? 'cloze-blank--correct'
                    : 'cloze-blank--wrong'
                  : typedValue.trim()
                  ? 'cloze-blank--typing'
                  : 'cloze-blank--empty'
              }`}
              aria-label="Blank answer slot"
            >
              {evaluation ? (
                evaluation.isCorrect ? (
                  evaluation.userAnswer
                ) : (
                  <>
                    <s className="cloze-wrong-strikethrough">{evaluation.userAnswer || '...'}</s>
                    <strong className="cloze-correction-slot">{question.blankAnswer}</strong>
                  </>
                )
              ) : typedValue.trim() ? (
                typedValue
              ) : (
                '________'
              )}
            </span>
            <span>{parts[1]}</span>
          </p>
        ) : (
          <p className="cloze-reading-paragraph">
            {question.paragraphWithBlank}
          </p>
        )}
      </div>

      {/* ── 2. Clean, Legible Answer Input & Clear Check Button ── */}
      <form onSubmit={handleFormSubmit} className="cloze-action-form">
        <div className="cloze-input-row">
          <input
            ref={inputRef}
            type="text"
            className={`cloze-main-input ${
              evaluation
                ? evaluation.isCorrect
                  ? 'input-success'
                  : 'input-error'
                : ''
            }`}
            placeholder="Type the missing French word..."
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            disabled={Boolean(evaluation)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            aria-label="Cloze answer input"
          />

          {!evaluation && (
            <button
              type="submit"
              className="btn-cloze-check"
              disabled={!typedValue.trim()}
            >
              Check Answer
            </button>
          )}
        </div>

        {/* French accents toolbar for quick diacritics entry */}
        {!evaluation && (
          <FrenchAccentToolbar onInsertChar={handleInsertChar} />
        )}
      </form>

      {/* ── 4. Clean Evaluation Feedback (Zero Clutter) ── */}
      {evaluation && (
        <div
          className={`cloze-eval-banner ${
            evaluation.isCorrect ? 'eval-banner--success' : 'eval-banner--error'
          }`}
          role="status"
        >
          <div className="cloze-eval-header-line">
            <span className="cloze-eval-icon">
              {evaluation.isCorrect ? '✓' : '✗'}
            </span>
            <strong className="cloze-eval-headline">
              {evaluation.isCorrect ? 'Correct!' : 'Incorrect'}
            </strong>
          </div>

          {!evaluation.isCorrect && (
            <div className="cloze-eval-target-row">
              <span className="cloze-target-label">Correct answer:</span>
              <strong className="cloze-target-word">
                « {question.blankAnswer} »
              </strong>
            </div>
          )}

          {evaluation.feedbackMessage && (
            <p className="cloze-eval-message">{evaluation.feedbackMessage}</p>
          )}

          <GameAnswerMeanings item={question.targetItem} />
        </div>
      )}
    </div>
  );
}
