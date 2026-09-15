import { useEffect } from 'react';
import { MatchingQuestion, QuestionEvaluation } from '../../core/models/games';
import { GameAnswerMeanings } from './GameAnswerMeanings';

interface GameCardMatchingProps {
  question: MatchingQuestion;
  evaluation: QuestionEvaluation | null;
  onSubmitAnswer: (optionId: string) => void;
}

export function GameCardMatching({
  question,
  evaluation,
  onSubmitAnswer,
}: GameCardMatchingProps) {
  // Support number keys 1-4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (evaluation) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= question.options.length) {
        e.preventDefault();
        onSubmitAnswer(question.options[num - 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question.id, evaluation, onSubmitAnswer]);

  const isFrToEn = question.promptType === 'fr_to_en';

  return (
    <div className="game-card-content matching-game-layout">
      {/* ── Prompt Hero Card ── */}
      <div className="matching-prompt-hero">
        <span className="matching-direction-badge">
          {isFrToEn ? 'French → English' : 'English → French'}
        </span>
        <h2 className="matching-target-text">{question.questionText}</h2>
        <p className="matching-instruction-text">
          {isFrToEn
            ? 'Select the matching English meaning:'
            : 'Select the matching French vocabulary:'}
        </p>
      </div>

      {/* ── 4 Options Grid (1 correct, 3 wrong) ── */}
      <div className="game-options-grid">
        {question.options.map((opt, idx) => {
          const isSelected = evaluation?.userAnswer === opt.text;
          const isCorrectAnswer = opt.isCorrect;

          let btnStateClass = '';
          if (evaluation) {
            if (isCorrectAnswer) {
              btnStateClass = 'option-btn--correct';
            } else if (isSelected) {
              btnStateClass = 'option-btn--wrong';
            } else {
              btnStateClass = 'option-btn--dimmed';
            }
          }

          return (
            <button
              key={opt.id}
              type="button"
              className={`game-option-btn ${btnStateClass}`}
              onClick={() => !evaluation && onSubmitAnswer(opt.id)}
              disabled={Boolean(evaluation)}
            >
              <div className="opt-key-badge">{idx + 1}</div>
              <div className="opt-text-group">
                <span className="opt-main-text">{opt.text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Evaluation Feedback ── */}
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
          <GameAnswerMeanings item={question.targetItem} />
        </div>
      )}
    </div>
  );
}
