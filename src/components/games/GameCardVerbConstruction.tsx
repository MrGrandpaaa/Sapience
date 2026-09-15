import { useEffect } from 'react';
import { VerbConstructionQuestion, QuestionEvaluation } from '../../core/models/games';

interface GameCardVerbConstructionProps {
  question: VerbConstructionQuestion;
  evaluation: QuestionEvaluation | null;
  onSubmitAnswer: (optionId: string) => void;
}

export function GameCardVerbConstruction({
  question,
  evaluation,
  onSubmitAnswer,
}: GameCardVerbConstructionProps) {
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
    <div className="game-card-content game-card--verb-construction">
      {/* ── Verb Hero ── */}
      <div className="verb-construction-hero">
        <span className="verb-tag">Target verb:</span>
        <h2 className="verb-title-text">{question.verbEntry}</h2>
      </div>

      {/* ── Sentence With Blank ── */}
      <div className="verb-blank-sentence-box">
        <p className="blank-sentence-text">« {question.sentenceWithBlank} »</p>
      </div>

      <p className="prompt-action-label">{question.prompt}</p>

      {/* ── Preposition Options Grid ── */}
      <div className="game-preposition-grid">
        {question.options.map((opt, idx) => {
          const isSelected = evaluation?.userAnswer === opt.text;
          const isCorrectAnswer = opt.isCorrect;

          let btnClass = '';
          if (evaluation) {
            if (isCorrectAnswer) {
              btnClass = 'prep-btn--correct';
            } else if (isSelected) {
              btnClass = 'prep-btn--wrong';
            } else {
              btnClass = 'prep-btn--dimmed';
            }
          }

          return (
            <button
              key={opt.id}
              type="button"
              className={`game-prep-btn ${btnClass}`}
              onClick={() => !evaluation && onSubmitAnswer(opt.id)}
              disabled={Boolean(evaluation)}
            >
              <span className="prep-key-num">{idx + 1}</span>
              <strong className="prep-val-text">{opt.text}</strong>
            </button>
          );
        })}
      </div>

      {/* ── Evaluation Feedback & Rule ── */}
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
          <div className="eval-rule-pill">
            <span className="rule-label">Construction pattern:</span>
            <span className="rule-text">{question.pattern}</span>
          </div>
        </div>
      )}
    </div>
  );
}
