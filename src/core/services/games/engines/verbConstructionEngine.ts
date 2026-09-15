import { VocabularyItem } from '../../../models/vocabulary';
import { PartOfSpeech } from '../../../models/types';
import {
  VerbConstructionQuestion,
  McqOption,
  QuestionEvaluation,
} from '../../../models/games';

interface VerbConstructionTemplate {
  verb: string;
  pattern: string;
  sentenceWithBlank: string;
  correctPreposition: string;
  explanation: string;
  distractorPrepositions: string[];
}

const KNOWN_VERB_CONSTRUCTIONS: Record<string, VerbConstructionTemplate> = {
  'se souvenir': {
    verb: 'se souvenir',
    pattern: 'se souvenir + de + qn/qc',
    sentenceWithBlank: 'Je me souviens toujours _____ ce premier voyage à Paris.',
    correctPreposition: 'de',
    explanation: 'Rule: The verb "se souvenir" always takes the preposition "de" (se souvenir de quelqu\'un / quelque chose).',
    distractorPrepositions: ['à', 'pour', 'sur', 'ø (no preposition)'],
  },
  parler: {
    verb: 'parler',
    pattern: 'parler + à + qn',
    sentenceWithBlank: 'Le directeur est en train de parler _____ nos collègues.',
    correctPreposition: 'à',
    explanation: 'Rule: When speaking to someone, use the structure "parler à quelqu\'un".',
    distractorPrepositions: ['de', 'sur', 'pour', 'ø (no preposition)'],
  },
  attendre: {
    verb: 'attendre',
    pattern: 'attendre + qn/qc (direct, sans préposition)',
    sentenceWithBlank: 'Nous attendons _____ le bus depuis un quart d’heure.',
    correctPreposition: 'ø (no preposition)',
    explanation: 'Rule: "attendre" is a direct transitive verb (transitif direct), taking a direct object WITHOUT a preposition.',
    distractorPrepositions: ['à', 'de', 'pour', 'après'],
  },
  "s'attendre": {
    verb: "s'attendre",
    pattern: "s'attendre + à + qc/infinitif",
    sentenceWithBlank: "Il s'attend _____ une promotion à la fin de l’année.",
    correctPreposition: 'à',
    explanation: 'Rule: The pronominal verb "s\'attendre à" (to anticipate, expect) strictly requires "à".',
    distractorPrepositions: ['de', 'pour', 'sur', 'ø (no preposition)'],
  },
  commencer: {
    verb: 'commencer',
    pattern: 'commencer + à / de + infinitif',
    sentenceWithBlank: 'Il commence _____ pleuvoir des cordes dehors.',
    correctPreposition: 'à',
    explanation: 'Rule: The most common structure for beginning an action is "commencer à + infinitif".',
    distractorPrepositions: ['pour', 'de', 'en', 'sur'],
  },
  décider: {
    verb: 'décider',
    pattern: 'décider + de + infinitif',
    sentenceWithBlank: 'Elle a décidé _____ changer de travail le mois prochain.',
    correctPreposition: 'de',
    explanation: 'Rule: When deciding to do something, the standard construction is "décider de + infinitif".',
    distractorPrepositions: ['à', 'pour', 'sur', 'ø (no preposition)'],
  },
  aimer: {
    verb: 'aimer',
    pattern: 'aimer + infinitif (direct)',
    sentenceWithBlank: 'J’aime _____ voyager en train à travers la campagne.',
    correctPreposition: 'ø (no preposition)',
    explanation: 'Rule: Preference verbs like "aimer", "adorer", "détester" directly govern the infinitive WITHOUT a preposition.',
    distractorPrepositions: ['de', 'à', 'pour', 'en'],
  },
  finir: {
    verb: 'finir',
    pattern: 'finir + de + infinitif',
    sentenceWithBlank: 'As-tu fini _____ lire ce roman policier ?',
    correctPreposition: 'de',
    explanation: 'Rule: Finishing or completing an action uses "finir de + infinitif".',
    distractorPrepositions: ['à', 'pour', 'sur', 'ø (no preposition)'],
  },
};

export class VerbConstructionEngine {
  public generateQuestion(item: VocabularyItem): VerbConstructionQuestion {
    if (item.part_of_speech !== PartOfSpeech.Verb) {
      throw new Error(`Game 5 (Verb Construction) chỉ áp dụng cho động từ. Mục từ "${item.surface_form}" không phải động từ.`);
    }

    const cleanVerb = item.surface_form
      .toLowerCase()
      .trim();

    // Look for template in known constructions
    let template = KNOWN_VERB_CONSTRUCTIONS[cleanVerb];

    // If not found, try stripping reflexive pronouns or prefixes
    if (!template) {
      const strippedVerb = cleanVerb.replace(/^(se|s')\s*/i, '').trim();
      template = KNOWN_VERB_CONSTRUCTIONS[strippedVerb];
    }

    // If still not found, check Format A constructions or synthesize from example
    if (!template) {
      const formatAConstructions = (item.format_a?.grammar as any)?.constructions;
      const exampleFr = item.format_a?.example?.french;

      let detectedPrep = 'à';
      let patternText = `${item.surface_form} + à/de`;

      if (formatAConstructions && formatAConstructions.length > 0) {
        patternText = formatAConstructions[0];
        if (patternText.includes('de')) detectedPrep = 'de';
        else if (patternText.includes('à')) detectedPrep = 'à';
        else if (patternText.includes('sur')) detectedPrep = 'sur';
        else if (patternText.includes('pour')) detectedPrep = 'pour';
      }

      const sentenceWithBlank = exampleFr
        ? exampleFr.replace(new RegExp(`\\b${detectedPrep}\\b`, 'i'), '_____')
        : `Il faut ${cleanVerb} _____ cette situation délicate.`;

      template = {
        verb: item.surface_form,
        pattern: patternText,
        sentenceWithBlank,
        correctPreposition: detectedPrep,
        explanation: `Cấu trúc ngữ pháp của động từ « ${item.surface_form} »: ${patternText}.`,
        distractorPrepositions: ['à', 'de', 'pour', 'sur', 'ø (không có giới từ)'].filter(
          (p) => p !== detectedPrep,
        ),
      };
    }

    // Assemble options
    const distractorChoices = template.distractorPrepositions.slice(0, 3);
    const options: McqOption[] = [
      {
        id: 'opt-correct',
        text: template.correctPreposition,
        isCorrect: true,
        explanation: template.explanation,
      },
      ...distractorChoices.map((d, idx) => ({
        id: `opt-distractor-${idx}`,
        text: d,
        isCorrect: false,
        explanation: `Incorrect preposition: « ${template.verb} » does not pair with « ${d} » in this pattern.`,
      })),
    ];

    this.shuffleArray(options);

    return {
      id: `vc-${item.id}-${Date.now()}`,
      gameType: 'verb_construction',
      targetItem: item,
      prompt: `Choose the appropriate preposition for the verb « ${item.surface_form} »:`,
      promptSubtext: `Complete the sentence: « ${template.sentenceWithBlank} »`,
      verbEntry: template.verb,
      pattern: template.pattern,
      sentenceWithBlank: template.sentenceWithBlank,
      correctPreposition: template.correctPreposition,
      options,
      explanation: template.explanation,
    };
  }

  public evaluateAnswer(
    question: VerbConstructionQuestion,
    selectedOptionId: string,
  ): QuestionEvaluation {
    const selected = question.options.find((opt) => opt.id === selectedOptionId);
    const correctOpt = question.options.find((opt) => opt.isCorrect);

    const isCorrect = Boolean(selected?.isCorrect);

    return {
      isCorrect,
      userAnswer: selected?.text || '',
      correctAnswer: correctOpt?.text || '',
      feedbackTitle: isCorrect ? 'Correct Verb Construction!' : 'Incorrect Preposition!',
      feedbackMessage: isCorrect
        ? (question.explanation || `Great job! ${question.pattern}`)
        : `${selected?.explanation || 'Incorrect preposition.'} Standard pattern: ${question.pattern}.`,
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

export const verbConstructionEngine = new VerbConstructionEngine();
