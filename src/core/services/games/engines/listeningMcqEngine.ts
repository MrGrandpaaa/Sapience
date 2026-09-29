import { VocabularyItem } from '../../../models/vocabulary';
import { PartOfSpeech, Gender } from '../../../models/types';
import { FormatANounGrammar } from '../../../models/lexical';
import {
  ListeningMcqQuestion,
  McqOption,
  QuestionEvaluation,
} from '../../../models/games';
import { VALIDATED_FRENCH_LEXICON } from '../validatedFrenchLexicon';
import {
  selectAdjectiveTarget,
  getAdjectiveForms,
  AdjectiveTargetGender,
} from '../../adjectivePresentationService';
import { cleanNounLemma, formatSingleNounPresentation } from '../../nounPresentationService';
import { cleanLexicalText } from '../../audioPronunciationFormatter';

/**
 * GAME 2 ENGINE: LISTENING -> MULTIPLE CHOICE
 *
 * Rules:
 * - Plays audio for exactly ONE atomic lexical item.
 * - Noun plays with its single corresponding article (e.g. 'le compagnon' or 'la compagne').
 * - Adjective plays EXACTLY ONE target form ('grand' or 'grande').
 * - 1 correct answer + 3 wrong answers.
 * - Every option represents exactly ONE atomic record (never combined forms like 'compagnon / compagne').
 * - Counterpart gender forms of the target are strictly excluded from answer options/distractors.
 * - Incorrect result displays ONLY: Incorrect, Correct answer, Meaning.
 * - Correct result displays ONLY: Correct, Meaning.
 */
export class ListeningMcqEngine {
  public generateQuestion(
    targetItem: VocabularyItem,
    allMasterVocab: VocabularyItem[] = [],
    targetGender?: AdjectiveTargetGender,
  ): ListeningMcqQuestion {
    const isNoun = targetItem.part_of_speech === PartOfSpeech.Noun;
    const isAdj = targetItem.part_of_speech === PartOfSpeech.Adjective;

    let audioText = '';
    let cleanTargetText = '';
    let promptSubtext: string | undefined = undefined;
    let effGender: AdjectiveTargetGender | undefined = undefined;
    let targetPosition: any = undefined;
    let adjectiveTargetId: string | undefined = undefined;

    const chosenDistractorTexts: { text: string; subtext?: string }[] = [];
    const usedTexts = new Set<string>();

    if (isAdj) {
      effGender = targetGender || (targetItem.gender === Gender.Feminine ? 'feminine' : 'masculine');
      const adjTarget = selectAdjectiveTarget(targetItem, effGender);
      if (adjTarget) {
        cleanTargetText = adjTarget.form;
        effGender = adjTarget.gender;
        targetPosition = adjTarget.position;
        adjectiveTargetId = adjTarget.id;
      } else {
        const forms = getAdjectiveForms(targetItem);
        const chosen = (effGender === 'feminine' ? forms.feminine : forms.masculine) ||
          cleanLexicalText(targetItem.surface_form).split(/\s*\/\s*/)[effGender === 'feminine' ? 1 : 0] ||
          cleanLexicalText(targetItem.surface_form).split(/\s*\/\s*/)[0];
        cleanTargetText = cleanNounLemma(chosen);
      }
      audioText = cleanTargetText;
      usedTexts.add(cleanTargetText.toLowerCase());
    } else if (isNoun) {
      effGender = (targetItem.gender === Gender.Feminine || targetGender === 'feminine')
        ? 'feminine'
        : 'masculine';
      const rawParts = targetItem.surface_form.split(/\s*\/\s*/);
      const chosenPart = (rawParts.length > 1 && effGender === 'feminine') ? rawParts[1] : rawParts[0];
      cleanTargetText = cleanNounLemma(chosenPart);

      const g = effGender === 'feminine' ? Gender.Feminine : Gender.Masculine;
      const grammar = targetItem.format_a?.grammar as FormatANounGrammar | undefined;
      const art = grammar?.underlying_article || (g === Gender.Feminine ? 'la' : 'le');
      audioText = formatSingleNounPresentation(cleanTargetText, g, art, grammar?.is_h_aspire);

      usedTexts.add(cleanTargetText.toLowerCase());
    } else {
      cleanTargetText = cleanLexicalText(targetItem.surface_form).split(/\s*\/\s*/)[0].trim();
      audioText = cleanTargetText;
      usedTexts.add(cleanTargetText.toLowerCase());
    }

    // Gender label: strictly "masculin" or "feminine" if record has gender, never explanatory sentences
    let genderTag: string | undefined = undefined;
    const itemGender = targetItem.gender || (targetItem.format_a?.grammar as any)?.gender;
    if (isAdj || isNoun || itemGender) {
      const g = effGender || (itemGender === Gender.Feminine ? 'feminine' : itemGender === Gender.Masculine ? 'masculine' : undefined);
      if (g === 'feminine' || itemGender === Gender.Feminine) {
        genderTag = 'feminine';
      } else if (g === 'masculine' || itemGender === Gender.Masculine) {
        genderTag = 'masculin';
      }
    }

    // ── GENDER EXCLUSION (Sections 2 & 7) ──────────────────────────────────
    // If target = masculine: DO NOT include feminine counterpart as an option/distractor.
    // If target = feminine: DO NOT include masculine counterpart as an option/distractor.
    const counterpartTexts = new Set<string>();
    const counterpartIds = new Set<string>();

    for (const it of allMasterVocab) {
      if (it.id === targetItem.id) continue;

      const isSameCard = Boolean(targetItem.card_id && it.card_id && it.card_id === targetItem.card_id);
      const isSameBaseId = it.id.replace(/-(masc|fem)$/, '') === targetItem.id.replace(/-(masc|fem)$/, '');
      const isSameLemma = cleanNounLemma(it.surface_form).toLowerCase() === cleanTargetText.toLowerCase();
      const isOppositeGender =
        (targetItem.gender === Gender.Masculine && it.gender === Gender.Feminine) ||
        (targetItem.gender === Gender.Feminine && it.gender === Gender.Masculine) ||
        (effGender === 'masculine' && it.gender === Gender.Feminine) ||
        (effGender === 'feminine' && it.gender === Gender.Masculine);

      if (isSameCard || isSameBaseId || (isSameLemma && isOppositeGender)) {
        counterpartIds.add(it.id);
        const cleanIt = cleanNounLemma(it.surface_form).toLowerCase();
        if (cleanIt) counterpartTexts.add(cleanIt);
        if (it.word) counterpartTexts.add(cleanNounLemma(it.word).toLowerCase());
      }

      // Check format_a grammar forms in other items referencing this lemma
      const itGrammar = it.format_a?.grammar as any;
      if (itGrammar) {
        const itMasc = itGrammar.masculine_form?.lemma || itGrammar.forms?.masculine || itGrammar.masculine;
        const itFem = itGrammar.feminine_form?.lemma || itGrammar.forms?.feminine || itGrammar.feminine;
        if (
          (itMasc && cleanNounLemma(itMasc).toLowerCase() === cleanTargetText.toLowerCase()) ||
          (itFem && cleanNounLemma(itFem).toLowerCase() === cleanTargetText.toLowerCase())
        ) {
          counterpartIds.add(it.id);
          if (itMasc) counterpartTexts.add(cleanNounLemma(itMasc).toLowerCase());
          if (itFem) counterpartTexts.add(cleanNounLemma(itFem).toLowerCase());
        }
      }
    }

    // Check targetItem's own grammar forms
    const targetGrammar = targetItem.format_a?.grammar as any;
    if (targetGrammar) {
      const isMasc = targetItem.gender === Gender.Masculine || effGender === 'masculine';
      const isFem = targetItem.gender === Gender.Feminine || effGender === 'feminine';

      if (isMasc) {
        const fem = targetGrammar.feminine_form?.lemma || targetGrammar.forms?.feminine || targetGrammar.feminine;
        if (fem) counterpartTexts.add(cleanNounLemma(fem).toLowerCase());
      }
      if (isFem) {
        const masc = targetGrammar.masculine_form?.lemma || targetGrammar.forms?.masculine || targetGrammar.masculine;
        if (masc) counterpartTexts.add(cleanNounLemma(masc).toLowerCase());
      }
    }

    // For adjectives, exclude opposite gender form
    if (isAdj) {
      const forms = getAdjectiveForms(targetItem);
      const isFem = effGender === 'feminine' || targetItem.gender === Gender.Feminine;
      const opp = isFem ? forms.masculine : forms.feminine;
      if (opp) {
        counterpartTexts.add(cleanNounLemma(opp).toLowerCase());
      }
    }

    // Register all counterparts as used to prevent them from becoming distractors
    for (const cp of counterpartTexts) {
      usedTexts.add(cp);
    }

    // 1. Gather candidate distractors from Master Vocabulary List
    // Prioritize same part of speech
    const masterDistractors = allMasterVocab
      .filter((it) => {
        if (it.id === targetItem.id) return false;
        if (counterpartIds.has(it.id)) return false;
        if (targetItem.card_id && it.card_id && it.card_id === targetItem.card_id) return false;
        return true;
      })
      .map((it) => {
        let text = cleanNounLemma(it.surface_form);
        // If distractor has " / ", pick a single atomic form
        if (text.includes('/')) {
          if (it.part_of_speech === PartOfSpeech.Adjective) {
            const adjForms = getAdjectiveForms(it);
            text = (effGender === 'feminine' ? adjForms.feminine : adjForms.masculine) || text.split(/\s*\/\s*/)[0].trim();
          } else {
            text = text.split(/\s*\/\s*/)[0].trim();
          }
        }
        return {
          text,
          meaning_vi: it.format_a?.meaning_vi,
          meaning_en: it.format_a?.meaning_en,
          pos: it.part_of_speech,
        };
      })
      .filter((d) => {
        const lower = d.text.toLowerCase();
        if (lower === cleanTargetText.toLowerCase()) return false;
        if (counterpartTexts.has(lower)) return false;
        return true;
      });

    // Sort same POS first
    masterDistractors.sort((a, b) => {
      const aSamePos = a.pos === targetItem.part_of_speech ? 1 : 0;
      const bSamePos = b.pos === targetItem.part_of_speech ? 1 : 0;
      return bSamePos - aSamePos;
    });

    for (const d of masterDistractors) {
      if (chosenDistractorTexts.length >= 3) break;
      const lower = d.text.toLowerCase();
      if (!usedTexts.has(lower) && !counterpartTexts.has(lower)) {
        usedTexts.add(lower);
        chosenDistractorTexts.push({ text: d.text, subtext: d.meaning_en || d.meaning_vi });
      }
    }

    // 2. If fewer than 3 distractors, fill from VALIDATED_FRENCH_LEXICON
    if (chosenDistractorTexts.length < 3) {
      const lexiconPool = VALIDATED_FRENCH_LEXICON.filter(
        (v) => {
          const lower = v.surface_form.toLowerCase();
          return (
            !usedTexts.has(lower) &&
            !counterpartTexts.has(lower) &&
            lower !== cleanTargetText.toLowerCase()
          );
        },
      );

      // Same POS first
      const samePosLexicon = lexiconPool.filter(
        (v) => v.part_of_speech === targetItem.part_of_speech,
      );
      const otherPosLexicon = lexiconPool.filter(
        (v) => v.part_of_speech !== targetItem.part_of_speech,
      );

      const combinedLexicon = [...samePosLexicon, ...otherPosLexicon];
      for (const entry of combinedLexicon) {
        if (chosenDistractorTexts.length >= 3) break;
        let dText = entry.surface_form;
        if (dText.includes('/')) {
          dText = dText.split(/\s*\/\s*/)[0].trim();
        }
        const dLower = dText.toLowerCase();
        if (!usedTexts.has(dLower) && !counterpartTexts.has(dLower)) {
          usedTexts.add(dLower);
          chosenDistractorTexts.push({
            text: dText,
            subtext: entry.meaning_vi,
          });
        }
      }
    }

    // 3. Assemble 4 options (1 correct + 3 distractors)
    const options: McqOption[] = [
      {
        id: `opt-correct-${Date.now()}`,
        text: cleanTargetText,
        isCorrect: true,
        subtext: targetItem.format_a?.meaning_en || targetItem.format_a?.meaning_vi,
        explanation: 'Correct answer.',
      },
      ...chosenDistractorTexts.slice(0, 3).map((d, idx) => ({
        id: `opt-distractor-${idx}-${Date.now()}`,
        text: d.text,
        isCorrect: false,
        subtext: d.subtext,
        explanation: `Incorrect — This word is "${d.text}" (${d.subtext || ''}).`,
      })),
    ];

    // Shuffle deterministically
    this.shuffleArray(options);

    return {
      id: `lmcq-${targetItem.id}-${effGender || 'target'}-${Date.now()}`,
      gameType: 'listening_mcq',
      targetItem,
      prompt: 'Listen to the pronunciation and choose the correct answer:',
      promptSubtext: undefined,
      audioText,
      options,
      targetGender: effGender,
      targetForm: cleanTargetText,
      targetPosition,
      adjectiveTargetId,
      genderTag,
    };
  }

  public evaluateAnswer(
    question: ListeningMcqQuestion,
    selectedOptionId: string,
  ): QuestionEvaluation {
    const selected = question.options.find((opt) => opt.id === selectedOptionId);
    const correctOpt = question.options.find((opt) => opt.isCorrect);

    const isCorrect = Boolean(selected?.isCorrect);

    return {
      isCorrect,
      userAnswer: selected?.text || '',
      correctAnswer: correctOpt?.text || '',
      feedbackTitle: isCorrect ? 'Correct' : 'Incorrect',
      feedbackMessage: isCorrect ? 'Correct' : 'Incorrect',
      retrievalResult: isCorrect ? 'success' : 'failure',
    };
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

export const listeningMcqEngine = new ListeningMcqEngine();
