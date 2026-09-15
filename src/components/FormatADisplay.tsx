import {
  FormatAData,
  FormatANounGrammar,
  FormatAAdjectiveGrammar,
  NOUN_GENDER_NOTATION,
  ADJECTIVE_POSITION_DISPLAY,
} from '../core/models/lexical';
import { PartOfSpeech, Gender, AdjectivePosition } from '../core/models/types';
import {
  formatNounPresentation,
  formatSingleNounPresentation,
  isNounSharedForm,
  isElisionNoun,
  cleanNounLemma,
} from '../core/services/nounPresentationService';
import { formatAdjectiveGenderNotation } from '../core/services/adjectivePresentationService';
import { AudioSpeakerButton } from './AudioSpeakerButton';
import { formatPronunciationText } from '../core/services/audioPronunciationFormatter';
import './FormatADisplay.css';

interface FormatADisplayProps {
  data: FormatAData;
}

interface AdjectiveColumnProps {
  title: string;
  positionBadge: string;
  badgeType: 'before' | 'after';
  masculine?: string;
  feminine?: string;
  meaningEn?: string;
  meaningVi?: string;
  collocations?: string[];
  synonyms?: string[];
  antonyms?: string[];
  examples?: Array<{ french: string; vietnamese?: string; english?: string }>;
}

function AdjectiveColumn({
  title,
  positionBadge,
  badgeType,
  masculine,
  feminine,
  meaningEn,
  meaningVi,
  collocations,
  synonyms,
  antonyms,
  examples,
}: AdjectiveColumnProps) {
  const notations = formatAdjectiveGenderNotation(masculine, feminine);
  const hasExamples = Boolean(examples && examples.length > 0);

  return (
    <div className="format-a-adj-column-content">
      <div className={`format-a-adj-column-header format-a-adj-column-header--${badgeType}`}>
        <span className="format-a-adj-column-title">{title}</span>
        <span className="format-a-adj-column-badge">{positionBadge}</span>
      </div>

      {/* Gender & Forms with (adj, mas) / (adj, fem) / (adj, mas - fem) notation */}
      <div className="format-a-section format-a-adj-forms-section">
        <h4 className="format-a-section-title">Gender &amp; Forms:</h4>
        <div className="noun-meta-box">
          {notations.isIdentical ? (
            <div className="format-a-adj-form-row">
              <span className="format-a-adj-form-val">{masculine || feminine || '—'}</span>
              <span className="noun-badge-inline">{notations.unifiedNotation}</span>
              {(masculine || feminine) && (
                <AudioSpeakerButton
                  text={masculine || feminine}
                  size="sm"
                  title={`Pronunciation: ${masculine || feminine}`}
                />
              )}
            </div>
          ) : (
            <div className="noun-meta-grid">
              {masculine && (
                <div className="noun-meta-row">
                  <span className="noun-meta-label">Masculin:</span>
                  <span className="noun-meta-val">
                    <span className="format-a-adj-form-val">{masculine}</span>{' '}
                    <span className="noun-badge-inline">(adj, mas)</span>
                    <AudioSpeakerButton
                      text={masculine}
                      size="sm"
                      title={`Pronunciation: ${masculine}`}
                    />
                  </span>
                </div>
              )}
              {feminine && (
                <div className="noun-meta-row">
                  <span className="noun-meta-label">Féminin:</span>
                  <span className="noun-meta-val">
                    <span className="format-a-adj-form-val">{feminine}</span>{' '}
                    <span className="noun-badge-inline">(adj, fem)</span>
                    <AudioSpeakerButton
                      text={feminine}
                      size="sm"
                      title={`Pronunciation: ${feminine}`}
                    />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meanings */}
      {(meaningEn || meaningVi) && (
        <div className="format-a-section format-a-meanings">
          {meaningEn && (
            <div className="format-a-meaning-en">
              <span className="meaning-label">English meaning:</span>
              <span className="meaning-text en">{meaningEn}</span>
            </div>
          )}
          {meaningVi && (
            <div className="format-a-meaning-vi">
              <span className="meaning-label">Vietnamese meaning:</span>
              <span className="meaning-text vi">{meaningVi}</span>
            </div>
          )}
        </div>
      )}

      {/* Collocations */}
      {collocations && collocations.length > 0 && (
        <div className="format-a-section format-a-collocations">
          <h4 className="format-a-section-title">Collocations:</h4>
          <div className="collocation-structured-list">
            {collocations.map((col, idx) => {
              const parts = col.split(/\s*:\s*|\s+–\s+|\s+-\s+/);
              const fr = parts[0];
              const vi = parts.length > 1 ? parts.slice(1).join(' : ') : undefined;
              return (
                <div key={idx} className="collocation-structured-item">
                  <span className="col-idx">{idx + 1}.</span>
                  <span className="col-fr">{fr}</span>
                  {vi && <span className="col-vi"> — {vi}</span>}
                  <AudioSpeakerButton
                    text={fr}
                    size="sm"
                    title={`Pronunciation: ${fr}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Synonyms & Antonyms */}
      {((synonyms && synonyms.length > 0) || (antonyms && antonyms.length > 0)) && (
        <div className="format-a-section format-a-syn-ant">
          {synonyms && synonyms.length > 0 && (
            <div className="syn-box">
              <span className="syn-label">Synonyms:</span>
              <div className="word-tags-list">
                {synonyms.map((s, idx) => (
                  <span key={idx} className="word-tag word-tag--syn">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {antonyms && antonyms.length > 0 && (
            <div className="ant-box">
              <span className="ant-label">Antonyms:</span>
              <div className="word-tags-list">
                {antonyms.map((a, idx) => (
                  <span key={idx} className="word-tag word-tag--ant">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Examples */}
      {hasExamples && (
        <div className="format-a-section format-a-example">
          <h4 className="format-a-section-title">Examples:</h4>
          <div className="examples-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {examples!.map((ex, idx) => {
              if (!ex || !ex.french) return null;
              return (
                <div key={idx} className="example-box">
                  <div className="example-french-row">
                    <p className="example-french">« {ex.french} »</p>
                    <AudioSpeakerButton
                      text={ex.french}
                      size="sm"
                      title="Listen to example"
                      isExample
                    />
                  </div>
                  {ex.vietnamese && (
                    <p className="example-vietnamese">
                      <span className="ex-flag">🇻🇳</span> {ex.vietnamese}
                    </p>
                  )}
                  {ex.english && (
                    <p className="example-english">
                      <span className="ex-flag">🇬🇧</span> {ex.english}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function FormatADisplay({ data }: FormatADisplayProps) {
  const { grammar } = data;
  const isVerb = grammar.pos === PartOfSpeech.Verb;
  const isNoun = grammar.pos === PartOfSpeech.Noun;
  const isAdj = grammar.pos === PartOfSpeech.Adjective;
  const nounGrammar = isNoun ? (grammar as FormatANounGrammar) : undefined;
  const adjGrammar = isAdj ? (grammar as FormatAAdjectiveGrammar) : undefined;
  const isDualAdj =
    isAdj &&
    (adjGrammar?.position === AdjectivePosition.Variable ||
      Boolean(adjGrammar?.before_entry && adjGrammar?.after_entry));

  // Clean entry word and notation for noun
  const isSharedNoun = isNoun && isNounSharedForm(nounGrammar || { pos: PartOfSpeech.Noun });
  const nounNotation = isSharedNoun
    ? 'n, mas - fem'
    : nounGrammar?.gender && NOUN_GENDER_NOTATION[nounGrammar.gender]
    ? NOUN_GENDER_NOTATION[nounGrammar.gender]
    : '';

  const displayWord = isNoun
    ? isSharedNoun
      ? (nounGrammar?.lemma || cleanNounLemma(data.entry))
      : formatNounPresentation({ grammar: data.grammar, surface_form: data.entry, part_of_speech: PartOfSpeech.Noun })
    : data.entry;

  return (
    <div className="format-a-card" aria-label="Format A Vocabulary Entry">
      {/* ── HEADER / ENTRY ── */}
      <div className="format-a-header">
        <div className="format-a-header-top-row">
          <div className="format-a-entry-title">
            <span className="format-a-word">{displayWord}</span>

            {/* Notation placed immediately beside the noun */}
            {isNoun && nounNotation && (
              <span className="format-a-noun-notation-tag">
                {nounNotation}
              </span>
            )}

            <span className="format-a-pos-tag">
              {isVerb
                ? 'Verb'
                : isNoun
                ? 'Noun'
                : isAdj
                ? 'Adjective'
                : grammar.pos}
            </span>

            {isVerb && (
              <span className="format-a-vo-tag">Vo (Infinitive)</span>
            )}
          </div>

          {/* Audio Speaker Button placed on top right, in line with entry word & POS */}
          <AudioSpeakerButton
            text={formatPronunciationText({
              text: displayWord,
              pos: grammar.pos,
              gender: isNoun ? nounGrammar?.gender : undefined,
            })}
            size="md"
            title={`Listen to pronunciation: ${displayWord}`}
          />
        </div>

        {/* Adjective Position & Gender */}
        {isAdj && (
          <div className="format-a-adj-meta">
            {adjGrammar?.position && (
              <span className="format-a-adj-position">
                Position: <strong>{ADJECTIVE_POSITION_DISPLAY[adjGrammar.position] || adjGrammar.position}</strong>
              </span>
            )}
            {(() => {
              const masc = adjGrammar?.masculine || adjGrammar?.before_entry?.masculine || adjGrammar?.after_entry?.masculine;
              const fem = adjGrammar?.feminine || adjGrammar?.before_entry?.feminine || adjGrammar?.after_entry?.feminine;
              if (!masc && !fem) return null;
              const notations = formatAdjectiveGenderNotation(masc, fem);
              return (
                <span className="format-a-adj-forms">
                  {notations.isIdentical ? notations.unifiedNotation : `${notations.masculineNotation} • ${notations.feminineNotation}`}
                </span>
              );
            })()}
          </div>
        )}

        {/* Verb Group */}
        {isVerb && grammar.group && (
          <span className="format-a-verb-group">
            {grammar.group === 1
              ? 'Group 1 (-er)'
              : grammar.group === 2
              ? 'Group 2 (-ir)'
              : 'Group 3 (irregular)'}
          </span>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          FORMAT A — NOUN (7 STRICT SECTIONS)
          ══════════════════════════════════════════════════════════════════ */}
      {isNoun && nounGrammar && (
        <div className="format-a-noun-body">
          {/* ── 1. GENDER + ARTICLE ── */}
          <div className="format-a-section format-a-noun-section1">
            <h4 className="format-a-section-title">
              1. Gender &amp; Article:
            </h4>
            <div className="noun-meta-box">
              {isSharedNoun ? (
                <div className="noun-meta-grid">
                  <div className="noun-meta-row">
                    <span className="noun-meta-label">Gender:</span>
                    <span className="noun-meta-val">
                      Masculin + Féminin{' '}
                      <span className="noun-badge-inline">(n, mas - fem)</span>
                    </span>
                  </div>

                  <div className="noun-meta-row">
                    <span className="noun-meta-label">Articles:</span>
                    <span className="noun-meta-val">
                      <span className="article-pill">
                        {isElisionNoun(nounGrammar.lemma || data.entry) ? "un / l'" : 'un / le'}
                      </span>
                      <span className="article-pill" style={{ marginLeft: '8px' }}>
                        {isElisionNoun(nounGrammar.lemma || data.entry) ? "une / l'" : 'une / la'}
                      </span>
                    </span>
                  </div>

                  <div className="noun-meta-row">
                    <span className="noun-meta-label">Form:</span>
                    <span className="noun-meta-val">
                      <strong>{nounGrammar.lemma || cleanNounLemma(data.entry)}</strong>
                      <span className="article-explanation" style={{ marginLeft: '8px' }}>
                        (shared form for masculine &amp; feminine)
                      </span>
                    </span>
                  </div>
                </div>
              ) : nounGrammar.gender_choice === 'both' || nounGrammar.gender === Gender.Both ? (
                <div className="noun-meta-grid">
                  <div className="noun-meta-row">
                    <span className="noun-meta-label">Gender:</span>
                    <span className="noun-meta-val">
                      Masculin + Féminin{' '}
                      <span className="noun-badge-inline">(n, mas + fem)</span>
                    </span>
                  </div>

                  <div className="noun-meta-row">
                    <span className="noun-meta-label">Masculin form:</span>
                    <span className="noun-meta-val">
                      <span className="article-pill">
                        {formatSingleNounPresentation(
                          nounGrammar.masculine_form?.lemma || '',
                          Gender.Masculine,
                          'le',
                        )}
                      </span>
                      <span className="article-explanation">
                        (lemma: « {nounGrammar.masculine_form?.lemma || ''} », article: « le »)
                      </span>
                    </span>
                  </div>

                  <div className="noun-meta-row">
                    <span className="noun-meta-label">Féminin form:</span>
                    <span className="noun-meta-val">
                      <span className="article-pill">
                        {formatSingleNounPresentation(
                          nounGrammar.feminine_form?.lemma || '',
                          Gender.Feminine,
                          'la',
                        )}
                      </span>
                      <span className="article-explanation">
                        (lemma: « {nounGrammar.feminine_form?.lemma || ''} », article: « la »)
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="noun-meta-grid">
                  <div className="noun-meta-row">
                    <span className="noun-meta-label">Gender:</span>
                    <span className="noun-meta-val">
                      {nounGrammar.gender === Gender.Feminine ? 'Féminin' : 'Masculin'}{' '}
                      <span className="noun-badge-inline">
                        {nounGrammar.gender === Gender.Feminine ? '(n, fem)' : '(n, mas)'}
                      </span>
                    </span>
                  </div>

                  <div className="noun-meta-row">
                    <span className="noun-meta-label">Card presentation:</span>
                    <span className="noun-meta-val">
                      <span className="article-pill">
                        {formatSingleNounPresentation(
                          nounGrammar.lemma || data.entry,
                          nounGrammar.gender === Gender.Feminine ? Gender.Feminine : Gender.Masculine,
                          nounGrammar.underlying_article,
                        )}
                      </span>
                      <span className="article-explanation">
                        (underlying article: « {nounGrammar.underlying_article || (nounGrammar.gender === Gender.Feminine ? 'la' : 'le')} »)
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 2. ENGLISH MEANING & 3. VIETNAMESE MEANING ── */}
          <div className="format-a-section format-a-meanings">
            <div className="format-a-meaning-en">
              <span className="meaning-label">2. English meaning:</span>
              <span className="meaning-text en">{data.meaning_en}</span>
            </div>
            <div className="format-a-meaning-vi">
              <span className="meaning-label">3. Vietnamese meaning:</span>
              <span className="meaning-text vi">{data.meaning_vi}</span>
            </div>
          </div>

          {/* ── 4. 3 COMMON COLLOCATIONS ── */}
          {data.collocations && data.collocations.length > 0 && (
            <div className="format-a-section format-a-collocations">
              <div className="section-title-with-badge">
                <h4 className="format-a-section-title">
                  4. Collocations:
                </h4>
              </div>
              <div className="collocation-structured-list">
                {data.collocations.map((col, idx) => {
                  const parts = col.split(/\s*:\s*|\s+–\s+|\s+-\s+/);
                  const fr = parts[0];
                  const vi = parts.length > 1 ? parts.slice(1).join(' : ') : undefined;
                  return (
                    <div key={idx} className="collocation-structured-item">
                      <span className="col-idx">{idx + 1}.</span>
                      <span className="col-fr">{fr}</span>
                      {vi && <span className="col-vi"> — {vi}</span>}
                      <AudioSpeakerButton
                        text={fr}
                        size="sm"
                        title={`Pronunciation: ${fr}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 5. SYNONYMS & 6. ANTONYMS ── */}
          <div className="format-a-section format-a-syn-ant">
            {data.synonyms && data.synonyms.length > 0 && (
              <div className="syn-box">
                <span className="syn-label">5. Synonyms:</span>
                <div className="word-tags-list">
                  {data.synonyms.map((s, idx) => (
                    <span key={idx} className="word-tag word-tag--syn">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.antonyms && data.antonyms.length > 0 && (
              <div className="ant-box">
                <span className="ant-label">6. Antonyms:</span>
                <div className="word-tags-list">
                  {data.antonyms.map((a, idx) => (
                    <span key={idx} className="word-tag word-tag--ant">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 7. COMMON CONVERSATIONAL EXAMPLES ── */}
          {((data.examples && data.examples.length > 0) || (data.example && data.example.french)) && (
            <div className="format-a-section format-a-example">
              <h4 className="format-a-section-title">
                7. Real-Life Conversational Example{(data.examples && data.examples.length > 1) ? 's' : ''}:
              </h4>
              <div className="examples-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(data.examples && data.examples.length > 0 ? data.examples : [data.example]).map((ex, idx) => {
                  if (!ex || !ex.french) return null;
                  return (
                    <div key={idx} className="example-box">
                      <div className="example-french-row">
                        <p className="example-french">« {ex.french} »</p>
                        <AudioSpeakerButton
                          text={ex.french}
                          size="sm"
                          title="Listen to example"
                          isExample
                        />
                      </div>
                      {ex.vietnamese && (
                        <p className="example-vietnamese">
                          <span className="ex-flag">🇻🇳</span> {ex.vietnamese}
                        </p>
                      )}
                      {ex.english && (
                        <p className="example-english">
                          <span className="ex-flag">🇬🇧</span> {ex.english}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          FORMAT A — ADJECTIF (PARALLEL PANELS FOR BOTH POSITIONS OR SINGLE)
          ══════════════════════════════════════════════════════════════════ */}
      {isAdj && adjGrammar && (
        <div className="format-a-adj-body">
          {isDualAdj ? (
            <div className="format-a-adj-columns">
              <div className="format-a-adj-column">
                <AdjectiveColumn
                  title="TRƯỚC NOM"
                  positionBadge="+ N"
                  badgeType="before"
                  masculine={adjGrammar.before_entry?.masculine || adjGrammar.masculine}
                  feminine={adjGrammar.before_entry?.feminine || adjGrammar.feminine}
                  meaningEn={adjGrammar.before_entry?.meaning_en || data.trc_meaning?.en || data.meaning_en}
                  meaningVi={adjGrammar.before_entry?.meaning_vi || data.trc_meaning?.vi || data.meaning_vi}
                  collocations={adjGrammar.before_entry?.collocations || data.collocations}
                  synonyms={adjGrammar.before_entry?.synonyms || data.synonyms}
                  antonyms={adjGrammar.before_entry?.antonyms || data.antonyms}
                  examples={
                    adjGrammar.before_entry?.examples ||
                    (data.examples && data.examples.length > 0
                      ? data.examples
                      : data.example?.french
                      ? [data.example]
                      : undefined)
                  }
                />
              </div>

              <div className="format-a-adj-divider" aria-hidden="true" />

              <div className="format-a-adj-column">
                <AdjectiveColumn
                  title="SAU NOM"
                  positionBadge="N +"
                  badgeType="after"
                  masculine={adjGrammar.after_entry?.masculine || adjGrammar.masculine}
                  feminine={adjGrammar.after_entry?.feminine || adjGrammar.feminine}
                  meaningEn={
                    adjGrammar.after_entry?.meaning_en ||
                    data.sau_meaning?.en ||
                    (adjGrammar.has_distinct_meanings ? undefined : data.meaning_en)
                  }
                  meaningVi={
                    adjGrammar.after_entry?.meaning_vi ||
                    data.sau_meaning?.vi ||
                    (adjGrammar.has_distinct_meanings ? undefined : data.meaning_vi)
                  }
                  collocations={
                    adjGrammar.after_entry?.collocations ||
                    (adjGrammar.has_distinct_meanings ? undefined : data.collocations)
                  }
                  synonyms={
                    adjGrammar.after_entry?.synonyms ||
                    (adjGrammar.has_distinct_meanings ? undefined : data.synonyms)
                  }
                  antonyms={
                    adjGrammar.after_entry?.antonyms ||
                    (adjGrammar.has_distinct_meanings ? undefined : data.antonyms)
                  }
                  examples={
                    adjGrammar.after_entry?.examples ||
                    (adjGrammar.has_distinct_meanings
                      ? undefined
                      : data.examples && data.examples.length > 0
                      ? data.examples
                      : data.example?.french
                      ? [data.example]
                      : undefined)
                  }
                />
              </div>
            </div>
          ) : (
            <div className="format-a-adj-single-column">
              <AdjectiveColumn
                title={
                  adjGrammar.position === AdjectivePosition.BeforeNoun
                    ? 'TRƯỚC NOM'
                    : adjGrammar.position === AdjectivePosition.AfterNoun
                    ? 'SAU NOM'
                    : 'ADJECTIF'
                }
                positionBadge={
                  adjGrammar.position === AdjectivePosition.BeforeNoun
                    ? '+ N'
                    : adjGrammar.position === AdjectivePosition.AfterNoun
                    ? 'N +'
                    : 'adj'
                }
                badgeType={adjGrammar.position === AdjectivePosition.AfterNoun ? 'after' : 'before'}
                masculine={adjGrammar.masculine}
                feminine={adjGrammar.feminine}
                meaningEn={data.meaning_en}
                meaningVi={data.meaning_vi}
                collocations={data.collocations}
                synonyms={data.synonyms}
                antonyms={data.antonyms}
                examples={
                  data.examples && data.examples.length > 0
                    ? data.examples
                    : data.example?.french
                    ? [data.example]
                    : undefined
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          FORMAT A — VERB & OTHER POS (PRESERVED)
          ══════════════════════════════════════════════════════════════════ */}
      {!isNoun && !isAdj && (
        <>
          {/* ── 3. ENGLISH MEANING & 4. VIETNAMESE MEANING ── */}
          <div className="format-a-section format-a-meanings">
            <div className="format-a-meaning-vi">
              <span className="meaning-label">Vietnamese meaning:</span>
              <span className="meaning-text">{data.meaning_vi}</span>
            </div>
            {data.meaning_en && (
              <div className="format-a-meaning-en">
                <span className="meaning-label">English meaning:</span>
                <span className="meaning-text">{data.meaning_en}</span>
              </div>
            )}
          </div>

          {/* ── 5. VERB CONJUGATION (6 present-tense forms) ── */}
          {isVerb && grammar.conjugation && (
            <div className="format-a-section format-a-conjugation">
              <h4 className="format-a-section-title">Present Tense Conjugation (Présent):</h4>
              <div className="conjugation-grid">
                <div className="conj-cell">
                  <span className="conj-pronoun">je</span>
                  <span className="conj-verb">{grammar.conjugation.je}</span>
                </div>
                <div className="conj-cell">
                  <span className="conj-pronoun">tu</span>
                  <span className="conj-verb">{grammar.conjugation.tu}</span>
                </div>
                <div className="conj-cell">
                  <span className="conj-pronoun">il / elle / on</span>
                  <span className="conj-verb">{grammar.conjugation.il_elle_on || grammar.conjugation.ilElleOn}</span>
                </div>
                <div className="conj-cell">
                  <span className="conj-pronoun">nous</span>
                  <span className="conj-verb">{grammar.conjugation.nous}</span>
                </div>
                <div className="conj-cell">
                  <span className="conj-pronoun">vous</span>
                  <span className="conj-verb">{grammar.conjugation.vous}</span>
                </div>
                <div className="conj-cell">
                  <span className="conj-pronoun">ils / elles</span>
                  <span className="conj-verb">{grammar.conjugation.ils_elles || grammar.conjugation.ilsElles}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── 6. VERB CONSTRUCTIONS & 7. EN + VI MEANINGS ── */}
          {data.constructions && data.constructions.length > 0 && (
            <div className="format-a-section format-a-constructions">
              <div className="section-title-with-badge">
                <h4 className="format-a-section-title">Sentence Patterns &amp; Prepositions:</h4>
                <span className="abbrev-legend">
                  Standard notation: <strong>Vo</strong> (infinitive) • <strong>sone</strong> (someone) • <strong>sth</strong> (something)
                </span>
              </div>
              <ul className="construction-list">
                {data.constructions.slice(0, 3).map((c, i) => {
                  const isBareVerb =
                    c.pattern.trim() === data.entry.trim() ||
                    (!c.pattern.includes(' ') && !c.pattern.includes("'"));

                  return (
                    <li key={i} className="construction-item">
                      <div className="construction-header-row">
                        <span className="construction-pattern">{c.pattern}</span>
                        <span
                          className={`construction-type-badge ${
                            isBareVerb ? 'badge-bare' : 'badge-pattern'
                          }`}
                        >
                          {isBareVerb ? 'Bare verb' : '+ Preposition / Pattern'}
                        </span>
                      </div>

                      <div className="construction-meanings-block">
                        <div className="c-meaning-line">
                          <span className="c-lang-tag vi">VI:</span>
                          <span className="c-meaning-text">{c.meaning_vi}</span>
                        </div>
                        {c.meaning_en && (
                          <div className="c-meaning-line">
                            <span className="c-lang-tag en">EN:</span>
                            <span className="c-meaning-text">{c.meaning_en}</span>
                          </div>
                        )}
                      </div>

                      {c.example_fr && (
                        <div className="construction-example-sub">
                          <span className="c-ex-fr">« {c.example_fr} »</span>
                          {c.example_en && <span className="c-ex-en"> — {c.example_en}</span>}
                          <AudioSpeakerButton
                            text={c.example_fr}
                            size="sm"
                            title="Listen to pattern example"
                            isExample
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ── 4. COLLOCATIONS (For non-nouns) ── */}
          {data.collocations && data.collocations.length > 0 && (
            <div className="format-a-section format-a-collocations">
              <h4 className="format-a-section-title">Collocations:</h4>
              <div className="word-tags-list">
                {data.collocations.map((col, idx) => (
                  <span key={idx} className="word-tag word-tag--collocation">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── 8. SYNONYMS & 9. ANTONYMS ── */}
          {((data.synonyms && data.synonyms.length > 0) ||
            (data.antonyms && data.antonyms.length > 0)) && (
            <div className="format-a-section format-a-syn-ant">
              {data.synonyms && data.synonyms.length > 0 && (
                <div className="syn-box">
                  <span className="syn-label">
                    {isVerb ? 'Synonyms:' : 'Synonyms:'}
                  </span>
                  <div className="word-tags-list">
                    {data.synonyms.map((s, idx) => (
                      <span key={idx} className="word-tag word-tag--syn">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.antonyms && data.antonyms.length > 0 && (
                <div className="ant-box">
                  <span className="ant-label">
                    {isVerb ? 'Antonyms:' : 'Antonyms:'}
                  </span>
                  <div className="word-tags-list">
                    {data.antonyms.map((a, idx) => (
                      <span key={idx} className="word-tag word-tag--ant">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 10. REAL-LIFE CONVERSATIONAL EXAMPLES ── */}
          {((data.examples && data.examples.length > 0) || (data.example && data.example.french)) && (
            <div className="format-a-section format-a-example">
              <h4 className="format-a-section-title">
                Real-Life Conversational Example{data.examples && data.examples.length > 1 ? 's' : ''}:
              </h4>
              <div className="examples-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(data.examples && data.examples.length > 0 ? data.examples : [data.example]).map((ex, idx) => {
                  if (!ex || !ex.french) return null;
                  return (
                    <div key={idx} className="example-box">
                      <div className="example-french-row">
                        <p className="example-french">« {ex.french} »</p>
                        <AudioSpeakerButton
                          text={ex.french}
                          size="sm"
                          title="Listen to example"
                          isExample
                        />
                      </div>
                      {ex.vietnamese && (
                        <p className="example-vietnamese">
                          <span className="ex-flag">🇻🇳</span> {ex.vietnamese}
                        </p>
                      )}
                      {ex.english && (
                        <p className="example-english">
                          <span className="ex-flag">🇬🇧</span> {ex.english}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
