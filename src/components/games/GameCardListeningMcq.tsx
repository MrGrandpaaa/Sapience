import { useEffect } from 'react';
import { ListeningMcqQuestion, QuestionEvaluation } from '../../core/models/games';
import { AudioSpeakerButton } from '../AudioSpeakerButton';
import { GameAnswerMeanings } from './GameAnswerMeanings';

interface GameCardListeningMcqProps {
  question: ListeningMcqQuestion;
  evaluation: QuestionEvaluation | null;
  onSubmitAnswer: (optionId: string) => void;
}

export function GameCardListeningMcq({
  question,
  evaluation,
  onSubmitAnswer,
}: GameCardListeningMcqProps) {
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

  return (
    <div className="game-card-content game-card--listening-mcq">
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

      {/* ── Options Grid ── */}
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
                {opt.subtext && <span className="opt-sub-text">{opt.subtext}</span>}
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
