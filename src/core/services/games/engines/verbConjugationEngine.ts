import { VocabularyItem } from '../../../models/vocabulary';
import { PartOfSpeech } from '../../../models/types';
import {
  VerbConjugationQuestion,
  VerbConjugationMode,
  QuestionEvaluation,
  McqOption,
} from '../../../models/games';
import {
  VerbConjugationPerson,
  VerbConjugationUnit,
  PERSON_DISPLAY_LABELS,
  ALL_VERB_CONJUGATION_PERSONS,
  getConjugationUnitsList,
  cleanConjugatedForm,
} from '../../verbConjugationService';

/**
 * GAME 5 ENGINE: VERB CONJUGATION
 *
 * Replaces old Verb Construction game.
 * Tests ACTIVE RETRIEVAL of stored user-entered verb conjugation forms.
 *
 * Rules:
 * - Mode A: Infinitive -> Conjugated form (e.g. parler, nous -> "nous ______" -> expected "parlons")
 * - Mode B: Conjugated form -> Infinitive (e.g. "nous parlons" -> "Infinitif:" -> expected "parler")
 * - Mode C: Audio -> Verb + Person (e.g. audio plays "nous parlons" -> expected "parler (nous)")
 * - Audio plays strictly ONE concrete target ("nous parlons"), never the entire table.
 * - Missing/empty forms are strictly excluded (never AI-generated or inferred).
 * - Identical forms across different persons remain separate learning units.
 */
export class VerbConjugationEngine {
  /**
   * Generates a Verb Conjugation question for the given verb item.
   */
  public generateQuestion(
    item: VocabularyItem,
    preferredPerson?: VerbConjugationPerson,
    preferredMode?: VerbConjugationMode,
  ): VerbConjugationQuestion {
    if (item.part_of_speech !== PartOfSpeech.Verb) {
      throw new Error(`VerbConjugationEngine requires a Verb item, received ${item.part_of_speech}`);
    }

    // 1. Gather all non-empty conjugation units (Part 11)
    const validUnits = getConjugationUnitsList(item).filter((u) => Boolean(u.conjugated_form?.trim()));
    if (validUnits.length === 0) {
      throw new Error(`Động từ "${item.surface_form}" chưa có dữ liệu chia động từ để tạo bài tập Verb Conjugation.`);
    }

    // 2. Select unit: prioritize preferred, or adaptive priority (Part 12, 13)
    let selectedUnit: VerbConjugationUnit;
    if (preferredPerson) {
      const match = validUnits.find((u) => u.person === preferredPerson);
      selectedUnit = match || this.selectAdaptiveUnit(validUnits);
    } else {
      selectedUnit = this.selectAdaptiveUnit(validUnits);
    }

    // 3. Select mode adaptively based on unit level or preferredMode (Part 14)
    const mode = preferredMode || this.selectAdaptiveMode(selectedUnit.level ?? 0);

    const infinitive = item.surface_form.trim();
    const person = selectedUnit.person;
    const personLabel = PERSON_DISPLAY_LABELS[person];
    const conjugatedForm = selectedUnit.conjugated_form.trim();
    const fullFormText = selectedUnit.full_form_text.trim();

    // 4. Build question according to mode
    switch (mode) {
      case 'infinitive_to_conjugated': {
        // MODE A: Infinitive -> Conjugated form (Part 6)
        return {
          id: `vc-${item.id}-${person}-modeA-${Date.now()}`,
          gameType: 'verb_conjugation',
          targetItem: item,
          mode: 'infinitive_to_conjugated',
          infinitive,
          person,
          personLabel,
          conjugatedForm,
          fullFormText,
          displaySubject: personLabel,
          prompt: 'Conjugate the verb in present tense for the given subject:',
          promptSubtext: `Verb: ${infinitive} • Person: ${personLabel}`,
          canonicalAnswer: conjugatedForm,
          acceptableAnswers: Array.from(new Set([conjugatedForm, fullFormText])),
        };
      }

      case 'conjugated_to_infinitive': {
        // MODE B: Conjugated form -> Infinitive (Part 7)
        return {
          id: `vc-${item.id}-${person}-modeB-${Date.now()}`,
          gameType: 'verb_conjugation',
          targetItem: item,
          mode: 'conjugated_to_infinitive',
          infinitive,
          person,
          personLabel,
          conjugatedForm,
          fullFormText,
          prompt: 'Identify the infinitive form of this conjugated verb:',
          promptSubtext: `Form: « ${fullFormText} » (${personLabel})`,
          canonicalAnswer: infinitive,
          acceptableAnswers: [infinitive],
        };
      }

      case 'audio_to_verb_person': {
        // MODE C: Audio -> Verb + Person (Part 8, 9, 10)
        // Canonical answer format MUST be: "parler (nous)"
        const canonicalAnswer = `${infinitive} (${personLabel})`;

        // Build person options for dropdown / quick selection
        const personOptions: McqOption[] = ALL_VERB_CONJUGATION_PERSONS.map((p) => ({
          id: `opt-person-${p}`,
          text: PERSON_DISPLAY_LABELS[p],
          isCorrect: p === person,
        }));

        return {
          id: `vc-${item.id}-${person}-modeC-${Date.now()}`,
          gameType: 'verb_conjugation',
          targetItem: item,
          mode: 'audio_to_verb_person',
          infinitive,
          person,
          personLabel,
          conjugatedForm,
          fullFormText,
          audioText: fullFormText, // Strictly ONE conjugated target form (§10)
          expectedInfinitive: infinitive,
          expectedPerson: person,
          prompt: 'Listen to the conjugated verb and identify its infinitive and grammatical person:',
          promptSubtext: 'Format: Infinitif (pronom), e.g. parler (nous)',
          canonicalAnswer,
          acceptableAnswers: [
            canonicalAnswer,
            `${infinitive} (${person})`,
            `${infinitive} ${personLabel}`,
            `${infinitive}, ${personLabel}`,
          ],
          options: personOptions,
        };
      }
    }
  }

  /**
   * Evaluates user's answer according to mode rules.
   */
  public evaluateAnswer(
    question: VerbConjugationQuestion,
    userAnswer: string,
  ): QuestionEvaluation {
    const rawTrimmed = (userAnswer || '').trim();
    const cleanLower = rawTrimmed.toLowerCase();

    switch (question.mode) {
      case 'infinitive_to_conjugated': {
        // Mode A: user typed conjugated form (e.g. "parlons" or "nous parlons")
        const expectedClean = question.conjugatedForm.toLowerCase().trim();
        const fullClean = question.fullFormText.toLowerCase().trim();
        const userClean = cleanConjugatedForm(rawTrimmed, question.person).toLowerCase();

        const isCorrect = userClean === expectedClean || cleanLower === fullClean || cleanLower === expectedClean;

        return {
          isCorrect,
          userAnswer: rawTrimmed,
          correctAnswer: question.fullFormText,
          feedbackTitle: isCorrect ? 'Correct!' : 'Incorrect',
          feedbackMessage: isCorrect
            ? question.fullFormText
            : `Correct answer: ${question.fullFormText}. Your answer: ${rawTrimmed || '—'}`,
          retrievalResult: isCorrect ? 'success' : 'failure',
        };
      }

      case 'conjugated_to_infinitive': {
        // Mode B: user typed infinitive (e.g. "parler")
        const expectedInfinitive = question.infinitive.toLowerCase().trim();
        const isCorrect = cleanLower === expectedInfinitive;

        return {
          isCorrect,
          userAnswer: rawTrimmed,
          correctAnswer: question.infinitive,
          feedbackTitle: isCorrect ? 'Correct!' : 'Incorrect',
          feedbackMessage: isCorrect
            ? question.infinitive
            : `Correct answer: ${question.infinitive}. Your answer: ${rawTrimmed || '—'}`,
          retrievalResult: isCorrect ? 'success' : 'failure',
        };
      }

      case 'audio_to_verb_person': {
        // Mode C: user identified infinitive + person (Part 8, 9)
        // Canonical: "parler (nous)"
        let parsedInf = '';
        let parsedPerson = '';

        if (rawTrimmed.startsWith('{') && rawTrimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(rawTrimmed);
            parsedInf = (parsed.infinitive || '').trim();
            parsedPerson = (parsed.person || '').trim();
          } catch {
            parsedInf = rawTrimmed;
          }
        } else {
          // Parse string format "parler (nous)" or "parler, nous" or "parler nous"
          const match = rawTrimmed.match(/^(.+?)\s*(?:\(([^)]+)\)|[,–-]\s*(.+)|(\b(?:je|tu|il\s*\/\s*elle\s*\/\s*on|nous|vous|ils\s*\/\s*elles|il_elle_on|ils_elles)\b))$/i);
          if (match) {
            parsedInf = match[1].trim();
            parsedPerson = (match[2] || match[3] || match[4] || '').trim();
          } else {
            parsedInf = rawTrimmed;
          }
        }

        const expectedInf = question.infinitive.toLowerCase().trim();
        const expectedPersonLabel = question.personLabel.toLowerCase().trim();
        const expectedPersonKey = question.person.toLowerCase().trim();

        const infMatches = parsedInf.toLowerCase() === expectedInf;
        const personMatches =
          parsedPerson.toLowerCase() === expectedPersonLabel ||
          parsedPerson.toLowerCase() === expectedPersonKey ||
          (question.person === 'il_elle_on' && /^(il|elle|on|il\s*\/\s*elle\s*\/\s*on)$/i.test(parsedPerson)) ||
          (question.person === 'ils_elles' && /^(ils|elles|ils\s*\/\s*elles)$/i.test(parsedPerson));

        // BOTH infinitive and person MUST be correct (Part 9)
        const isCorrect = infMatches && personMatches;

        const formattedUserAnswer = parsedPerson ? `${parsedInf} (${parsedPerson})` : rawTrimmed;

        return {
          isCorrect,
          userAnswer: formattedUserAnswer,
          correctAnswer: question.canonicalAnswer, // e.g. "parler (nous)"
          feedbackTitle: isCorrect ? 'Correct!' : 'Incorrect',
          feedbackMessage: isCorrect
            ? question.canonicalAnswer
            : `Correct answer: ${question.canonicalAnswer}. Your answer: ${formattedUserAnswer || '—'}`,
          retrievalResult: isCorrect ? 'success' : 'failure',
        };
      }
    }
  }

  /**
   * Computes deterministic priority score for a conjugation unit.
   * Prioritizes:
   * 1. Weak units (failed retrievals, low score)
   * 2. Overdue units (due for review)
   * 3. Stale / least-reviewed units (to prevent starving any person)
   */
  public computeUnitPriorityScore(u: VerbConjugationUnit, asOf: Date = new Date()): number {
    let priorityScore = 0;
    const nowMs = asOf.getTime();

    // 1. Weakness priority: failed retrievals or low success rate
    const failed = u.failed_retrievals ?? 0;
    const successes = u.successful_retrievals ?? 0;
    const total = failed + successes;
    if (failed > 0) {
      priorityScore += 4000 * (failed / Math.max(1, total));
    }

    // 2. Overdue priority
    if (u.level === 0) {
      priorityScore += 3000;
    } else if (u.next_review_at) {
      const nextMs = new Date(u.next_review_at).getTime();
      if (nextMs <= nowMs) {
        const overdueHours = (nowMs - nextMs) / (1000 * 60 * 60);
        priorityScore += 2500 + Math.min(1500, overdueHours * 10);
      }
    }

    // 3. Stale / balance priority: prevent starving any person (Part 13)
    const reviewCount = u.review_count ?? 0;
    priorityScore += Math.max(0, 1000 - reviewCount * 150);

    return priorityScore;
  }

  /**
   * Calculates the maximum unit priority score for a verb item.
   * Used to rank verbs for Extra Practice.
   */
  public getVerbMaxPriorityScore(item: VocabularyItem, asOf: Date = new Date()): number {
    const validUnits = getConjugationUnitsList(item).filter((u) => Boolean(u.conjugated_form?.trim()));
    if (validUnits.length === 0) return 0;
    return Math.max(...validUnits.map((u) => this.computeUnitPriorityScore(u, asOf)));
  }

  /**
   * Adaptive unit selection (Part 12, 13):
   * Prioritizes:
   * 1. Weak units (failed retrievals, low score)
   * 2. Overdue units (due for review)
   * 3. Stale / least-reviewed units (to prevent permanently ignoring any person)
   */
  public selectAdaptiveUnit(units: VerbConjugationUnit[], asOf: Date = new Date()): VerbConjugationUnit {
    if (units.length === 1) return units[0];

    const scored = units.map((u) => ({
      unit: u,
      priorityScore: this.computeUnitPriorityScore(u, asOf),
    }));

    scored.sort((a, b) => b.priorityScore - a.priorityScore);
    return scored[0].unit;
  }

  /**
   * Adaptive mode selection (Part 14):
   * - Level 0-1: Mode A (Infinitive -> Conjugated form)
   * - Level 2: Mode A (70%), Mode B (30%)
   * - Level 3: Mode A (40%), Mode B (40%), Mode C (20%)
   * - Level 4-5: Mode B (40%), Mode C (40%), Mode A (20%)
   */
  public selectAdaptiveMode(level: number): VerbConjugationMode {
    if (level <= 1) {
      return 'infinitive_to_conjugated';
    }

    const rand = Math.random();

    if (level === 2) {
      return rand < 0.7 ? 'infinitive_to_conjugated' : 'conjugated_to_infinitive';
    }

    if (level === 3) {
      if (rand < 0.4) return 'infinitive_to_conjugated';
      if (rand < 0.8) return 'conjugated_to_infinitive';
      return 'audio_to_verb_person';
    }

    // Level 4-5
    if (rand < 0.4) return 'conjugated_to_infinitive';
    if (rand < 0.8) return 'audio_to_verb_person';
    return 'infinitive_to_conjugated';
  }
}

export const verbConjugationEngine = new VerbConjugationEngine();
