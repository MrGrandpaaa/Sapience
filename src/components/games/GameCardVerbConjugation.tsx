import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { VerbConjugationQuestion, QuestionEvaluation } from '../../core/models/games';
import { ALL_VERB_CONJUGATION_PERSONS, PERSON_DISPLAY_LABELS, VerbConjugationPerson } from '../../core/services/verbConjugationService';
import { AudioSpeakerButton } from '../AudioSpeakerButton';
import { FrenchAccentToolbar } from './FrenchAccentToolbar';
import { GameAnswerMeanings } from './GameAnswerMeanings';

interface GameCardVerbConjugationProps {
  question: VerbConjugationQuestion;
  evaluation: QuestionEvaluation | null;
  onSubmitAnswer: (answer: string) => void;
}

export function GameCardVerbConjugation({
  question,
  evaluation,
  onSubmitAnswer,
}: GameCardVerbConjugationProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<VerbConjugationPerson | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state on question change
  useEffect(() => {
    setInputValue('');
    setSelectedPerson(null);
    if (!evaluation) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [question.id]);

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

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (evaluation) return;

    const raw = inputValue.trim();
    if (!raw) return;

    if (question.mode === 'audio_to_verb_person') {
      // If user selected a person button and typed infinitive
      if (selectedPerson && !raw.includes('(')) {
        const canonical = `${raw} (${PERSON_DISPLAY_LABELS[selectedPerson]})`;
        onSubmitAnswer(canonical);
        return;
      }
      // If user typed the full format e.g. "parler (nous)"
      onSubmitAnswer(raw);
    } else {
      onSubmitAnswer(raw);
    }
  };

  return (
    <div className="game-card-content game-card--verb-conjugation">
      {/* ── Mode A: Infinitive -> Conjugated Form ── */}
      {question.mode === 'infinitive_to_conjugated' && (
        <div className="vc-mode-container vc-mode-a">
          <div className="verb-conjugation-hero">
            <span className="vc-mode-tag">Infinitive → Conjugated Form</span>
            <h2 className="vc-verb-title">{question.infinitive}</h2>
            {(question.targetItem.format_a?.meaning_vi || question.targetItem.format_a?.meaning_en) && (
              <p className="vc-verb-translation">
                {question.targetItem.format_a?.meaning_vi || question.targetItem.format_a?.meaning_en}
              </p>
            )}
          </div>

          <div className="vc-prompt-box">
            <p className="vc-prompt-action">{question.prompt}</p>
            <div className="vc-conjugation-cue">
              <span className="vc-subject-badge">{question.displaySubject || question.personLabel}</span>
              <span className="vc-cue-bracket">[ ____________ ]</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="vc-form">
            <div className="vc-input-row">
              <input
                ref={inputRef}
                type="text"
                className={`vc-input ${
                  evaluation
                    ? evaluation.isCorrect
                      ? 'input-success'
                      : 'input-error'
                    : ''
                }`}
                placeholder={`Form for « ${question.displaySubject || question.personLabel} »`}
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
                  className="btn-vc-submit"
                  disabled={!inputValue.trim()}
                >
                  Submit ↵
                </button>
              )}
            </div>

            <FrenchAccentToolbar
              onInsertChar={handleInsertChar}
              disabled={Boolean(evaluation)}
            />
          </form>
        </div>
      )}

      {/* ── Mode B: Conjugated Form -> Infinitive ── */}
      {question.mode === 'conjugated_to_infinitive' && (
        <div className="vc-mode-container vc-mode-b">
          <div className="verb-conjugation-hero">
            <span className="vc-mode-tag">Conjugated Form → Infinitive</span>
            <div className="vc-conjugated-display">
              <span className="vc-conjugated-form">« {question.fullFormText} »</span>
              <span className="vc-person-pill">{question.personLabel}</span>
            </div>
          </div>

          <div className="vc-prompt-box">
            <p className="vc-prompt-action">{question.prompt}</p>
          </div>

          <form onSubmit={handleSubmit} className="vc-form">
            <div className="vc-input-row">
              <input
                ref={inputRef}
                type="text"
                className={`vc-input ${
                  evaluation
                    ? evaluation.isCorrect
                      ? 'input-success'
                      : 'input-error'
                    : ''
                }`}
                placeholder="Infinitive (e.g. parler, finir, aller...)"
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
                  className="btn-vc-submit"
                  disabled={!inputValue.trim()}
                >
                  Submit ↵
                </button>
              )}
            </div>

            <FrenchAccentToolbar
              onInsertChar={handleInsertChar}
              disabled={Boolean(evaluation)}
            />
          </form>
        </div>
      )}

      {/* ── Mode C: Audio -> Verb + Person ── */}
      {question.mode === 'audio_to_verb_person' && (
        <div className="vc-mode-container vc-mode-c">
          <div className="vc-audio-center-box">
            <span className="vc-mode-tag">Audio → Infinitive & Person</span>
            <AudioSpeakerButton
              text={question.audioText || question.fullFormText}
              size="xl"
              title="Click to replay audio"
            />
            <p className="vc-audio-note">
              Listen carefully to the conjugated verb pronunciation.
            </p>
          </div>

          <div className="vc-prompt-box">
            <p className="vc-prompt-action">{question.prompt}</p>
            <p className="vc-prompt-subtext">{question.promptSubtext}</p>
          </div>

          <form onSubmit={handleSubmit} className="vc-form">
            <div className="vc-mode-c-inputs">
              {/* Infinitive input */}
              <div className="vc-input-group">
                <label className="vc-field-label">1. Infinitive:</label>
                <input
                  ref={inputRef}
                  type="text"
                  className={`vc-input ${
                    evaluation
                      ? evaluation.isCorrect
                        ? 'input-success'
                        : 'input-error'
                      : ''
                  }`}
                  placeholder="e.g. parler"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={Boolean(evaluation)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>

              {/* Person selector buttons */}
              <div className="vc-input-group">
                <label className="vc-field-label">2. Grammatical person:</label>
                <div className="vc-person-buttons-grid">
                  {ALL_VERB_CONJUGATION_PERSONS.map((person) => {
                    const label = PERSON_DISPLAY_LABELS[person];
                    const isSelected =
                      selectedPerson === person ||
                      (inputValue.includes(label) && !selectedPerson);
                    const isCorrectPerson = question.person === person;

                    let btnClass = '';
                    if (evaluation) {
                      if (isCorrectPerson) {
                        btnClass = 'vc-person-btn--correct';
                      } else if (isSelected) {
                        btnClass = 'vc-person-btn--wrong';
                      } else {
                        btnClass = 'vc-person-btn--dimmed';
                      }
                    } else if (isSelected) {
                      btnClass = 'vc-person-btn--selected';
                    }

                    return (
                      <button
                        key={person}
                        type="button"
                        className={`vc-person-btn ${btnClass}`}
                        onClick={() => {
                          if (!evaluation) {
                            setSelectedPerson(person);
                          }
                        }}
                        disabled={Boolean(evaluation)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!evaluation && (
                <button
                  type="submit"
                  className="btn-vc-submit btn-vc-submit--full"
                  disabled={!inputValue.trim()}
                >
                  Submit Answer ↵
                </button>
              )}
            </div>

            <FrenchAccentToolbar
              onInsertChar={handleInsertChar}
              disabled={Boolean(evaluation)}
            />
          </form>
        </div>
      )}

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

          <div className="eval-rule-pill">
            <span className="rule-label">Full Conjugated Form:</span>
            <strong className="rule-text">{question.fullFormText}</strong>
          </div>

          <GameAnswerMeanings item={question.targetItem} />
        </div>
      )}
    </div>
  );
}
