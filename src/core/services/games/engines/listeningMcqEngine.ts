import { VocabularyItem } from '../../../models/vocabulary';
import { PartOfSpeech } from '../../../models/types';
import {
  ListeningMcqQuestion,
  McqOption,
  QuestionEvaluation,
} from '../../../models/games';
import { formatPronunciationText } from '../../audioPronunciationFormatter';
import { VALIDATED_FRENCH_LEXICON } from '../validatedFrenchLexicon';
import {
  selectAdjectiveTarget,
  getAdjectiveForms,
  AdjectiveTargetGender,
} from '../../adjectivePresentationService';

/**
 * GAME 2 ENGINE: LISTENING -> MULTIPLE CHOICE
 *
 * Rules:
 * - Website plays audio.
 * - Noun must play with article.
 * - Adjective plays EXACTLY ONE target form ('grand' or 'grande').
 * - 1 correct answer + 3 wrong answers.
 * - Distractors prioritized from Master Vocabulary List.
 * - If not enough saved words (< 4), pulls from validated French lexicon bank.
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
      const adjTarget = selectAdjectiveTarget(targetItem, targetGender);
      cleanTargetText = adjTarget ? adjTarget.form : targetItem.surface_form.split(' / ')[0].trim();
      audioText = cleanTargetText;
      effGender = adjTarget ? adjTarget.gender : (targetGender || 'masculine');
      targetPosition = adjTarget?.position;
      adjectiveTargetId = adjTarget?.id;

      const genderLabel = effGender === 'feminine' ? 'féminin' : 'masculin';
      const posNote = adjTarget?.positionBadge ? ` • Position: ${adjTarget.positionBadge}` : '';
      promptSubtext = `Note: Adjectif (${genderLabel})${posNote}. Choose the matching French word.`;

      usedTexts.add(cleanTargetText.toLowerCase());

      // Smart distractor 1: If opposite gender form exists, add it as a distractor (§6)
      const forms = getAdjectiveForms(targetItem);
      const oppositeForm = effGender === 'feminine' ? forms.masculine : forms.feminine;
      if (oppositeForm && oppositeForm.toLowerCase() !== cleanTargetText.toLowerCase()) {
        chosenDistractorTexts.push({
          text: oppositeForm,
          subtext: effGender === 'feminine' ? 'Masculin' : 'Féminin',
        });
        usedTexts.add(oppositeForm.toLowerCase());
      }
    } else {
      audioText = formatPronunciationText(targetItem);
      cleanTargetText = targetItem.surface_form
        .replace(/\s*\(n,\s*(mas|fem)\)/i, '')
        .trim();
      promptSubtext = isNoun ? 'Nouns are pronounced with their corresponding article.' : undefined;
      usedTexts.add(cleanTargetText.toLowerCase());
    }

    // 1. Gather candidate distractors from Master Vocabulary List
    // Prioritize same part of speech
    const masterDistractors = allMasterVocab
      .filter((it) => it.id !== targetItem.id)
      .map((it) => {
        let text = it.surface_form.replace(/\s*\(n,\s*(mas|fem)\)/i, '').trim();
        // If distractor is adjective with " / ", pick single form
        if (it.part_of_speech === PartOfSpeech.Adjective && text.includes('/')) {
          const adjForms = getAdjectiveForms(it);
          text = (effGender === 'feminine' ? adjForms.feminine : adjForms.masculine) || text.split(/\s*\/\s*/)[0].trim();
        }
        return {
          text,
          meaning_vi: it.format_a?.meaning_vi,
          pos: it.part_of_speech,
        };
      })
      .filter((d) => d.text.toLowerCase() !== cleanTargetText.toLowerCase());

    // Sort same POS first
    masterDistractors.sort((a, b) => {
      const aSamePos = a.pos === targetItem.part_of_speech ? 1 : 0;
      const bSamePos = b.pos === targetItem.part_of_speech ? 1 : 0;
      return bSamePos - aSamePos;
    });

    for (const d of masterDistractors) {
      if (chosenDistractorTexts.length >= 3) break;
      if (!usedTexts.has(d.text.toLowerCase())) {
        usedTexts.add(d.text.toLowerCase());
        chosenDistractorTexts.push({ text: d.text, subtext: d.meaning_vi });
      }
    }

    // 2. If fewer than 3 distractors, fill from VALIDATED_FRENCH_LEXICON
    if (chosenDistractorTexts.length < 3) {
      const lexiconPool = VALIDATED_FRENCH_LEXICON.filter(
        (v) =>
          !usedTexts.has(v.surface_form.toLowerCase()) &&
          v.surface_form.toLowerCase() !== cleanTargetText.toLowerCase(),
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
        if (!usedTexts.has(dText.toLowerCase())) {
          usedTexts.add(dText.toLowerCase());
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
      promptSubtext,
      audioText,
      options,
      targetGender: effGender,
      targetForm: cleanTargetText,
      targetPosition,
      adjectiveTargetId,
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
      feedbackTitle: isCorrect ? 'Correct!' : 'Incorrect!',
      feedbackMessage: isCorrect
        ? `Great job! You recognized « ${correctOpt?.text} » from audio.`
        : `You chose « ${selected?.text} ». The correct answer is « ${correctOpt?.text} » (${correctOpt?.subtext || ''}).`,
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
