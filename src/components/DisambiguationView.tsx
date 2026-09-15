import { LexicalInterpretation } from '../core/services/lexicalAnalysisService';
import './DisambiguationView.css';

interface DisambiguationViewProps {
  inputWord: string;
  interpretations: LexicalInterpretation[];
  onSelect: (selected: LexicalInterpretation) => void;
  onCancel?: () => void;
}

/**
 * Disambiguation selection view.
 *
 * When a French word has multiple interpretations (e.g. "livre", "tour", "voler"):
 * 1. Full Format A is NOT displayed immediately.
 * 2. Each candidate is rendered with exactly a simple 3-row structure:
 *    - Dòng 1: Ý chính
 *    - Dòng 2: Ví dụ
 *    - Dòng 3: Dịch tự nhiên
 * 3. Learner chooses an interpretation to proceed to full Format A.
 */
export function DisambiguationView({
  inputWord,
  interpretations,
  onSelect,
  onCancel,
}: DisambiguationViewProps) {
  return (
    <div className="disambiguation-container">
      <div className="disambiguation-header">
        <span className="disambiguation-badge">Disambiguation required</span>
        <h3 className="disambiguation-title">
          The word <span className="highlight-word">« {inputWord} »</span> has multiple meanings
        </h3>
        <p className="disambiguation-subtitle">
          Please choose the meaning or usage you want to save to your Master Vocabulary List:
        </p>
      </div>

      <div className="disambiguation-cards-list">
        {interpretations.map((interp, index) => {
          const { candidate } = interp;
          return (
            <div
              key={interp.id || index}
              className="disambiguation-card"
              onClick={() => onSelect(interp)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(interp);
                }
              }}
            >
              <div className="disambiguation-card-header">
                <div className="disambiguation-card-form">
                  <span className="disambiguation-word">{candidate.surface_form}</span>
                  <span className="disambiguation-pos">
                    ({candidate.part_of_speech})
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-select-interpretation"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(interp);
                  }}
                >
                  Select this usage →
                </button>
              </div>

              {/* ── SIMPLE 3-ROW TABLE ── */}
              <div className="disambiguation-table-3rows">
                {/* Row 1: Core meaning */}
                <div className="disambiguation-row">
                  <span className="row-label">1. Core meaning:</span>
                  <span className="row-content row-content--meaning">
                    {candidate.core_meaning}
                  </span>
                </div>

                {/* Row 2: Example */}
                <div className="disambiguation-row">
                  <span className="row-label">2. Example:</span>
                  <span className="row-content row-content--example">
                    « {candidate.example} »
                  </span>
                </div>

                {/* Row 3: Translation */}
                <div className="disambiguation-row">
                  <span className="row-label">3. Translation:</span>
                  <span className="row-content row-content--translation">
                    {candidate.natural_translation}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onCancel && (
        <div className="disambiguation-footer">
          <button type="button" className="btn-back-cancel" onClick={onCancel}>
            ← Back to input
          </button>
        </div>
      )}
    </div>
  );
}
