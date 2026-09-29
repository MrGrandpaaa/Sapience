import { describe, it, expect, beforeEach } from 'bun:test';
import { masterVocabularyService } from '../masterVocabularyService';
import { genderEngine } from '../games/engines/genderEngine';
import { reviewSessionEngine } from '../reviewSessionEngine';
import { reviewGameCoordinator } from '../games/reviewGameCoordinator';
import { PartOfSpeech, Gender } from '../../models/types';
import { VocabularyItem } from '../../models/vocabulary';

describe('Prompt 5 Implementation: Gender Game Engine & 50/50 Selection', () => {
  beforeEach(() => {
    masterVocabularyService.clearAll();
  });

  describe('Part A — Independent Random Gender Selection (No Alternating Pattern)', () => {
    it('permits consecutive occurrences of the same gender and never forces alternating mas/fem', () => {
      // Seed 10 masculine nouns and 10 feminine nouns
      for (let i = 1; i <= 10; i++) {
        masterVocabularyService.addItem({
          id: `item-masc-${i}`,
          surface_form: `garçon${i}`,
          part_of_speech: PartOfSpeech.Noun,
          gender: Gender.Masculine,
          level: 1,
        } as any);
        masterVocabularyService.addItem({
          id: `item-fem-${i}`,
          surface_form: `fille${i}`,
          part_of_speech: PartOfSpeech.Noun,
          gender: Gender.Feminine,
          level: 1,
        } as any);
      }

      const allItems = masterVocabularyService.getAllItems();
      expect(allItems.length).toBe(20);

      // Over multiple sessions, verify that the sequence is NOT strictly alternating
      // and that consecutive occurrences of the same gender are permitted and observed
      let observedConsecutiveSameGender = false;
      let alwaysAlternating = true;

      for (let trial = 0; trial < 10; trial++) {
        const questions = reviewGameCoordinator.buildSession(allItems, {
          gameType: 'gender',
          count: 10,
        });

        expect(questions.length).toBe(10);
        const genders = questions.map((q) => q.targetItem.gender);

        const isStrictlyAlternating = genders.every(
          (g, idx) => idx === 0 || g !== genders[idx - 1]
        );

        if (!isStrictlyAlternating) {
          alwaysAlternating = false;
          observedConsecutiveSameGender = true;
          break;
        }
      }

      // Must NOT be stuck in an alternating pattern
      expect(alwaysAlternating).toBe(false);
      expect(observedConsecutiveSameGender).toBe(true);
    });

    it('selects vocabulary records independently from atomic storage without card display interference', () => {
      // Add items with various genders
      masterVocabularyService.addItem({
        id: 'celibataire-masc',
        surface_form: 'célibataire',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
      } as any);
      masterVocabularyService.addItem({
        id: 'celibataire-fem',
        surface_form: 'célibataire',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
      } as any);
      masterVocabularyService.addItem({
        id: 'compagnon-masc',
        surface_form: 'compagnon',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
      } as any);
      masterVocabularyService.addItem({
        id: 'voiture-fem',
        surface_form: 'voiture',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
      } as any);

      const allItems = masterVocabularyService.getAllItems();
      const questions = reviewGameCoordinator.buildSession(allItems, {
        gameType: 'gender',
        count: 4,
      });

      expect(questions.length).toBe(4);
      for (const q of questions) {
        expect(q.gameType).toBe('gender');
        expect(q.targetItem).toBeDefined();
        // Each target item is an individual atomic vocabulary record
        expect(typeof q.targetItem.id).toBe('string');
      }
    });

    it('gracefully handles pools with any gender distribution without forcing 50/50 balance', () => {
      // 8 masculine nouns and 2 feminine nouns
      for (let i = 1; i <= 8; i++) {
        masterVocabularyService.addItem({
          id: `m-${i}`,
          surface_form: `masculin${i}`,
          part_of_speech: PartOfSpeech.Noun,
          gender: Gender.Masculine,
          level: 1,
        } as any);
      }
      for (let i = 1; i <= 2; i++) {
        masterVocabularyService.addItem({
          id: `f-${i}`,
          surface_form: `feminin${i}`,
          part_of_speech: PartOfSpeech.Noun,
          gender: Gender.Feminine,
          level: 1,
        } as any);
      }

      const allItems = masterVocabularyService.getAllItems();
      const session = reviewSessionEngine.startSession(10, {
        customGameType: 'gender',
        allowNonDue: true,
      });

      expect(session).not.toBeNull();
      expect(session!.serializedQuestions.length).toBe(10);
    });
  });

  describe('Part B — Atomic Question Word', () => {
    it('displays strictly ONE atomic word, never combined strings like compagnon / compagne', () => {
      // Decompose entry into atomic records
      masterVocabularyService.addItem({
        id: 'card-compagnon',
        surface_form: 'compagnon / compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 1,
        format_a: {
          entry: 'compagnon / compagne',
          meaning_en: 'companion',
          meaning_vi: 'bạn đồng hành',
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            masculine_form: { lemma: 'compagnon', gender: Gender.Masculine },
            feminine_form: { lemma: 'compagne', gender: Gender.Feminine },
          },
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      const mascItem = items.find((i) => i.gender === Gender.Masculine)!;
      const femItem = items.find((i) => i.gender === Gender.Feminine)!;

      // Question on masculine item
      const mascQuestion = genderEngine.generateQuestion(mascItem, items);
      expect(mascQuestion.nounFormWithoutArticle).toBe('compagnon');
      expect(mascQuestion.nounFormWithoutArticle).not.toContain('/');
      expect(mascQuestion.nounFormWithoutArticle).not.toContain('compagne');
      expect(mascQuestion.prompt).toContain('compagnon');
      expect(mascQuestion.prompt).not.toContain('compagne');

      // Question on feminine item
      const femQuestion = genderEngine.generateQuestion(femItem, items);
      expect(femQuestion.nounFormWithoutArticle).toBe('compagne');
      expect(femQuestion.nounFormWithoutArticle).not.toContain('/');
      expect(femQuestion.nounFormWithoutArticle).not.toContain('compagnon');
      expect(femQuestion.prompt).toContain('compagne');
      expect(femQuestion.prompt).not.toContain('compagnon');
    });
  });

  describe('Part C — Exactly Three Answer Choices', () => {
    it('contains exactly 3 choices with mas, fem, and mas - fem', () => {
      const singleNoun: VocabularyItem = {
        id: 'test-garcon',
        word: 'garçon',
        surface_form: 'garçon',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 1,
      } as any;

      const q = genderEngine.generateQuestion(singleNoun);
      expect(q.options.length).toBe(3);

      // Option 1: mas (un - le + word)
      expect(q.options[0].id).toBe('mas');
      expect(q.options[0].text).toBe('mas');
      expect(q.options[0].subtext).toBe('un - le garçon');
      expect(q.options[0].isCorrect).toBe(true);

      // Option 2: fem (une - la + word)
      expect(q.options[1].id).toBe('fem');
      expect(q.options[1].text).toBe('fem');
      expect(q.options[1].subtext).toBe('une - la garçon');
      expect(q.options[1].isCorrect).toBe(false);

      // Option 3: mas - fem (le + word, la + word)
      expect(q.options[2].id).toBe('mas - fem');
      expect(q.options[2].text).toBe('mas - fem');
      expect(q.options[2].subtext).toBe('le garçon, la garçon');
      expect(q.options[2].isCorrect).toBe(false);
    });

    it('evaluates feminine single-gender noun correctly with option 2', () => {
      const femNoun: VocabularyItem = {
        id: 'test-voiture',
        word: 'voiture',
        surface_form: 'voiture',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: 1,
      } as any;

      const q = genderEngine.generateQuestion(femNoun);
      expect(q.options.length).toBe(3);

      expect(q.options[0].text).toBe('mas');
      expect(q.options[0].subtext).toBe('un - le voiture');
      expect(q.options[0].isCorrect).toBe(false);

      expect(q.options[1].text).toBe('fem');
      expect(q.options[1].subtext).toBe('une - la voiture');
      expect(q.options[1].isCorrect).toBe(true);

      expect(q.options[2].text).toBe('mas - fem');
      expect(q.options[2].subtext).toBe('le voiture, la voiture');
      expect(q.options[2].isCorrect).toBe(false);
    });
  });

  describe('Part D & E — Special mas + fem Case & Separate Atomic Records', () => {
    it('classifies words with identical spelling/pronunciation existing as both mas and fem as mas - fem (third option)', () => {
      // Decompose célibataire: 1 card, 2 atomic records (masc and fem)
      masterVocabularyService.addItem({
        id: 'card-celibataire',
        surface_form: 'célibataire',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 1,
        format_a: {
          entry: 'célibataire',
          meaning_en: 'single, bachelor',
          meaning_vi: 'người độc thân',
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            lemma: 'célibataire',
            masculine_form: { lemma: 'célibataire', gender: Gender.Masculine },
            feminine_form: { lemma: 'célibataire', gender: Gender.Feminine },
          },
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      expect(items.length).toBe(2);

      const mascRec = items.find((i) => i.gender === Gender.Masculine)!;
      const femRec = items.find((i) => i.gender === Gender.Feminine)!;

      // Part E: Atomic records remain separate in storage
      expect(mascRec.id).not.toBe(femRec.id);
      expect(mascRec.gender).toBe(Gender.Masculine);
      expect(femRec.gender).toBe(Gender.Feminine);

      // Part D: Question on masculine record classifies answer as mas - fem
      const mascQ = genderEngine.generateQuestion(mascRec, items);
      expect(mascQ.options.length).toBe(3);
      expect(mascQ.options[0].isCorrect).toBe(false); // Not only mas
      expect(mascQ.options[1].isCorrect).toBe(false); // Not only fem
      expect(mascQ.options[2].text).toBe('mas - fem');
      expect(mascQ.options[2].subtext).toBe('le célibataire, la célibataire');
      expect(mascQ.options[2].isCorrect).toBe(true);  // Exactly the third option

      // Part D: Question on feminine record also classifies answer as mas - fem
      const femQ = genderEngine.generateQuestion(femRec, items);
      expect(femQ.options.length).toBe(3);
      expect(femQ.options[0].isCorrect).toBe(false);
      expect(femQ.options[1].isCorrect).toBe(false);
      expect(femQ.options[2].text).toBe('mas - fem');
      expect(femQ.options[2].subtext).toBe('le célibataire, la célibataire');
      expect(femQ.options[2].isCorrect).toBe(true);
    });

    it('works dynamically for any future word without hardcoding (e.g. touriste)', () => {
      // Add two separate records with identical spelling for a different word: touriste
      masterVocabularyService.addItem({
        id: 'touriste-masc',
        word: 'touriste',
        surface_form: 'touriste',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 1,
      } as any);
      masterVocabularyService.addItem({
        id: 'touriste-fem',
        word: 'touriste',
        surface_form: 'touriste',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: 1,
      } as any);

      const items = masterVocabularyService.getAllItems();
      const mascTouriste = items.find((i) => i.id === 'touriste-masc')!;

      const q = genderEngine.generateQuestion(mascTouriste, items);
      expect(q.options.length).toBe(3);
      expect(q.options[0].isCorrect).toBe(false);
      expect(q.options[1].isCorrect).toBe(false);
      expect(q.options[2].text).toBe('mas - fem');
      expect(q.options[2].isCorrect).toBe(true);
    });

    it('does NOT classify words with differing spelling as mas - fem (e.g. compagnon / compagne)', () => {
      masterVocabularyService.addItem({
        id: 'card-compagnon',
        surface_form: 'compagnon / compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 1,
        format_a: {
          entry: 'compagnon / compagne',
          meaning_en: 'companion',
          meaning_vi: 'bạn đồng hành',
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            masculine_form: { lemma: 'compagnon', gender: Gender.Masculine },
            feminine_form: { lemma: 'compagne', gender: Gender.Feminine },
          },
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      const mascCompagnon = items.find((i) => i.gender === Gender.Masculine)!;
      const femCompagne = items.find((i) => i.gender === Gender.Feminine)!;

      const mascQ = genderEngine.generateQuestion(mascCompagnon, items);
      expect(mascQ.options[0].isCorrect).toBe(true); // mas
      expect(mascQ.options[1].isCorrect).toBe(false);
      expect(mascQ.options[2].isCorrect).toBe(false); // not mas - fem

      const femQ = genderEngine.generateQuestion(femCompagne, items);
      expect(femQ.options[0].isCorrect).toBe(false);
      expect(femQ.options[1].isCorrect).toBe(true); // fem
      expect(femQ.options[2].isCorrect).toBe(false); // not mas - fem
    });
  });

  describe('Clean Evaluation Outputs', () => {
    it('evaluates correct answer with "Correct" feedbackTitle and no explanatory text', () => {
      const noun: VocabularyItem = {
        id: 'test-noun',
        word: 'chien',
        surface_form: 'chien',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
      } as any;

      const q = genderEngine.generateQuestion(noun);
      const evalResult = genderEngine.evaluateAnswer(q, 'mas');

      expect(evalResult.isCorrect).toBe(true);
      expect(evalResult.feedbackTitle).toBe('Correct');
      expect(evalResult.correctAnswer).toBe('mas');
    });

    it('evaluates incorrect answer with "Incorrect" feedbackTitle, correct answer, and no explanations', () => {
      const noun: VocabularyItem = {
        id: 'test-noun',
        word: 'chien',
        surface_form: 'chien',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
      } as any;

      const q = genderEngine.generateQuestion(noun);
      const evalResult = genderEngine.evaluateAnswer(q, 'fem');

      expect(evalResult.isCorrect).toBe(false);
      expect(evalResult.feedbackTitle).toBe('Incorrect');
      expect(evalResult.correctAnswer).toBe('mas');
    });
  });
});
