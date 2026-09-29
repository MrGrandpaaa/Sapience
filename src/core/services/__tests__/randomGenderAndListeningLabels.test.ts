import { describe, it, expect, beforeEach } from 'bun:test';
import { masterVocabularyService } from '../masterVocabularyService';
import { reviewSessionEngine } from '../reviewSessionEngine';
import { reviewGameCoordinator } from '../games/reviewGameCoordinator';
import { listeningMcqEngine } from '../games/engines/listeningMcqEngine';
import { listeningWritingEngine } from '../games/engines/listeningWritingEngine';
import { formatPronunciationText } from '../audioPronunciationFormatter';
import { PartOfSpeech, Gender } from '../../models/types';
import { VocabularyItem } from '../../models/vocabulary';

describe('Verification of Random Gender & Single Listening Labels', () => {
  beforeEach(() => {
    masterVocabularyService.clearAll();
  });

  describe('1 & 2. Random Gender — Không Alternating, Cho phép xuất hiện cùng loại liên tiếp', () => {
    it('allows consecutive questions of the same gender and does not enforce an alternating pattern', () => {
      // Seed a pool of masculine and feminine nouns
      for (let i = 1; i <= 6; i++) {
        masterVocabularyService.addItem({
          id: `item-masc-${i}`,
          surface_form: `motMasc${i}`,
          part_of_speech: PartOfSpeech.Noun,
          gender: Gender.Masculine,
          level: 1,
        } as any);
        masterVocabularyService.addItem({
          id: `item-fem-${i}`,
          surface_form: `motFem${i}`,
          part_of_speech: PartOfSpeech.Noun,
          gender: Gender.Feminine,
          level: 1,
        } as any);
      }

      const allItems = masterVocabularyService.getAllItems();
      expect(allItems.length).toBe(12);

      // Verify that across random sessions, consecutive questions of the same gender can appear
      let foundConsecutiveMasc = false;
      let foundConsecutiveFem = false;
      let foundNonAlternating = false;

      for (let trial = 0; trial < 25; trial++) {
        const session = reviewSessionEngine.startSession(10, {
          customGameType: 'gender',
          allowNonDue: true,
        });

        expect(session).not.toBeNull();
        const questions = session!.serializedQuestions;
        expect(questions.length).toBe(10);

        const genders = questions.map((q) => q.targetItem.gender);

        for (let i = 1; i < genders.length; i++) {
          if (genders[i] === Gender.Masculine && genders[i - 1] === Gender.Masculine) {
            foundConsecutiveMasc = true;
          }
          if (genders[i] === Gender.Feminine && genders[i - 1] === Gender.Feminine) {
            foundConsecutiveFem = true;
          }
          if (genders[i] === genders[i - 1]) {
            foundNonAlternating = true;
          }
        }

        if (foundConsecutiveMasc && foundConsecutiveFem) {
          break;
        }
      }

      expect(foundNonAlternating).toBe(true);
      expect(foundConsecutiveMasc || foundConsecutiveFem).toBe(true);
    });

    it('selects vocabulary records independently from atomic storage for gender game', () => {
      masterVocabularyService.addItem({
        id: 'compagnon-masc',
        surface_form: 'compagnon',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 1,
      } as any);
      masterVocabularyService.addItem({
        id: 'compagne-fem',
        surface_form: 'compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: 1,
      } as any);

      const allItems = masterVocabularyService.getAllItems();
      const q = reviewGameCoordinator.buildSession(allItems, {
        gameType: 'gender',
        count: 2,
      });

      expect(q.length).toBe(2);
      expect(q[0].targetItem.id).toMatch(/compagn(on|e)-(masc|fem)/);
      expect(q[1].targetItem.id).toMatch(/compagn(on|e)-(masc|fem)/);
    });
  });

  describe('3 & 4. Gender Label cho Listening Games — Strictly "masculin" / "feminine" and No Explanatory Sentences', () => {
    it('sets genderTag strictly to "masculin" or "feminine" in listening_mcq and promptSubtext is undefined', () => {
      const mascNoun: VocabularyItem = {
        id: 'masc-noun-1',
        surface_form: 'compagnon',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
      } as any;

      const femNoun: VocabularyItem = {
        id: 'fem-noun-1',
        surface_form: 'compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
      } as any;

      const qMasc = listeningMcqEngine.generateQuestion(mascNoun, [mascNoun, femNoun]);
      expect(qMasc.genderTag).toBe('masculin');
      expect(qMasc.promptSubtext).toBeUndefined();

      const qFem = listeningMcqEngine.generateQuestion(femNoun, [mascNoun, femNoun]);
      expect(qFem.genderTag).toBe('feminine');
      expect(qFem.promptSubtext).toBeUndefined();
    });

    it('sets genderTag strictly to "masculin" or "feminine" in listening_writing and promptSubtext is undefined', () => {
      const mascNoun: VocabularyItem = {
        id: 'masc-noun-1',
        surface_form: 'compagnon',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
      } as any;

      const femNoun: VocabularyItem = {
        id: 'fem-noun-1',
        surface_form: 'compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
      } as any;

      const qMasc = listeningWritingEngine.generateQuestion(mascNoun, [mascNoun, femNoun]);
      expect(qMasc.genderTag).toBe('masculin');
      expect(qMasc.promptSubtext).toBeUndefined();

      const qFem = listeningWritingEngine.generateQuestion(femNoun, [mascNoun, femNoun]);
      expect(qFem.genderTag).toBe('feminine');
      expect(qFem.promptSubtext).toBeUndefined();
    });

    it('handles adjectives with strict gender labels and no explanatory sentences', () => {
      const adjItem: VocabularyItem = {
        id: 'adj-grand',
        surface_form: 'grand / grande',
        part_of_speech: PartOfSpeech.Adjective,
        format_a: {
          entry: 'grand / grande',
          grammar: {
            pos: PartOfSpeech.Adjective,
            masculine_form: { lemma: 'grand' },
            feminine_form: { lemma: 'grande' },
          },
        } as any,
      } as any;

      // Listening MCQ
      const qMcqMasc = listeningMcqEngine.generateQuestion(adjItem, [adjItem], 'masculine');
      expect(qMcqMasc.genderTag).toBe('masculin');
      expect(qMcqMasc.promptSubtext).toBeUndefined();

      const qMcqFem = listeningMcqEngine.generateQuestion(adjItem, [adjItem], 'feminine');
      expect(qMcqFem.genderTag).toBe('feminine');
      expect(qMcqFem.promptSubtext).toBeUndefined();

      // Listening Writing
      const qLwMasc = listeningWritingEngine.generateQuestion(adjItem, [adjItem], 'masculine');
      expect(qLwMasc.genderTag).toBe('masculin');
      expect(qLwMasc.promptSubtext).toBeUndefined();

      const qLwFem = listeningWritingEngine.generateQuestion(adjItem, [adjItem], 'feminine');
      expect(qLwFem.genderTag).toBe('feminine');
      expect(qLwFem.promptSubtext).toBeUndefined();
    });

    it('does not display genderTag for non-gendered parts of speech (e.g. verbs)', () => {
      const verbItem: VocabularyItem = {
        id: 'verb-aimer',
        surface_form: 'aimer',
        part_of_speech: PartOfSpeech.Verb,
      } as any;

      const qMcq = listeningMcqEngine.generateQuestion(verbItem, [verbItem]);
      expect(qMcq.genderTag).toBeUndefined();

      const qLw = listeningWritingEngine.generateQuestion(verbItem, [verbItem]);
      expect(qLw.genderTag).toBeUndefined();
    });
  });

  describe('5. Audio — Reads strictly ONE atomic vocabulary record', () => {
    it('reads single masculine form for masculine noun or adjective, never combined string', () => {
      const mascItem: VocabularyItem = {
        id: 'compagnon-masc',
        surface_form: 'compagnon',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
      } as any;

      const audio = formatPronunciationText(mascItem);
      expect(audio).toBe('le compagnon');
      expect(audio).not.toContain('compagne');
      expect(audio).not.toContain('/');

      const adjMasc: VocabularyItem = {
        id: 'adj-grand-masc',
        surface_form: 'grand',
        part_of_speech: PartOfSpeech.Adjective,
        gender: Gender.Masculine,
      } as any;
      const audioAdj = formatPronunciationText(adjMasc);
      expect(audioAdj).toBe('grand');
      expect(audioAdj).not.toContain('grande');
      expect(audioAdj).not.toContain('/');
    });

    it('reads single feminine form for feminine noun or adjective, never combined string', () => {
      const femItem: VocabularyItem = {
        id: 'compagne-fem',
        surface_form: 'compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
      } as any;

      const audio = formatPronunciationText(femItem);
      expect(audio).toBe('la compagne');
      expect(audio).not.toContain('compagnon');
      expect(audio).not.toContain('/');

      const adjFem: VocabularyItem = {
        id: 'adj-grand-fem',
        surface_form: 'grande',
        part_of_speech: PartOfSpeech.Adjective,
        gender: Gender.Feminine,
      } as any;
      const audioAdj = formatPronunciationText(adjFem);
      expect(audioAdj).toBe('grande');
      expect(audioAdj).not.toBe('grand');
      expect(audioAdj).not.toContain('/');
    });
  });
});
