import { useEffect } from 'react';
import { GenderQuestion, QuestionEvaluation } from '../../core/models/games';
import { GameAnswerMeanings } from './GameAnswerMeanings';

interface GameCardGenderProps {
  question: GenderQuestion;
  evaluation: QuestionEvaluation | null;
  onSubmitAnswer: (optionId: string) => void;
}

export function GameCardGender({
  question,
  evaluation,
  onSubmitAnswer,
}: GameCardGenderProps) {
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

  return (
    <div className="game-card-content game-card--gender">
      {/* ── Target Noun Presentation ── */}
      <div className="gender-noun-hero">
        <h2 className="gender-noun-text">{question.nounFormWithoutArticle}</h2>
        {question.hasElision && (
          <span className="gender-elision-badge">
            Starts with vowel/mute h: « l'{question.nounFormWithoutArticle} »
          </span>
        )}
      </div>

      {/* ── Options Stack ── */}
      <div className="game-options-stack">
        {question.options.map((opt, idx) => {
          const isSelected = evaluation?.userAnswer === opt.text;
          const isCorrectAnswer = opt.isCorrect;

          let btnClass = '';
          if (evaluation) {
            if (isCorrectAnswer) {
              btnClass = 'option-btn--correct';
            } else if (isSelected) {
              btnClass = 'option-btn--wrong';
            } else {
              btnClass = 'option-btn--dimmed';
            }
          }

          return (
            <button
              key={opt.id}
              type="button"
              className={`game-gender-option-btn ${btnClass}`}
              onClick={() => !evaluation && onSubmitAnswer(opt.id)}
              disabled={Boolean(evaluation)}
            >
              <div className="opt-key-badge">{idx + 1}</div>
              <div className="opt-gender-body">
                <span className="opt-gender-label">{opt.text}</span>
                {evaluation && opt.explanation && (
                  <span className="opt-explanation-inline">
                    {opt.explanation}
                  </span>
                )}
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
