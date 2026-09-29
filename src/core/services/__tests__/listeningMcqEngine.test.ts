import { describe, it, expect, beforeEach } from 'bun:test';
import { masterVocabularyService } from '../masterVocabularyService';
import { listeningMcqEngine } from '../games/engines/listeningMcqEngine';
import { PartOfSpeech, Gender } from '../../models/types';
import { VocabularyItem } from '../../models/vocabulary';

describe('Prompt 3 Implementation: Listening - Multiple Choice Engine', () => {
  beforeEach(() => {
    masterVocabularyService.clearAll();
  });

  describe('1. Normal masculine target (compagnon)', () => {
    it('uses exactly one atomic word, excludes feminine counterpart, and avoids combined strings', () => {
      // Add dual noun entry which decomposes into compagnon (masc) and compagne (fem)
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
            masculine_form: { lemma: 'compagnon', gender: Gender.Masculine, underlying_article: 'le' },
            feminine_form: { lemma: 'compagne', gender: Gender.Feminine, underlying_article: 'la' },
            forms: { masculine: 'compagnon', feminine: 'compagne' },
          },
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      const mascItem = items.find((i) => i.gender === Gender.Masculine && i.surface_form === 'compagnon')!;
      expect(mascItem).toBeDefined();

      const question = listeningMcqEngine.generateQuestion(mascItem, items);

      // 1. Confirm target is only one word
      expect(question.targetForm).toBe('compagnon');
      expect(question.targetForm).not.toContain('/');

      // 2. Confirm audio speaks only the masculine word
      expect(question.audioText).toBe('le compagnon');
      expect(question.audioText).not.toContain('compagne');
      expect(question.audioText).not.toContain('/');

      // 3. Confirm answer options: 4 options, exactly 1 correct
      expect(question.options.length).toBe(4);
      const correctOpt = question.options.find((o) => o.isCorrect);
      expect(correctOpt).toBeDefined();
      expect(correctOpt!.text).toBe('compagnon');

      // 4. Confirm counterpart gender (compagne) is strictly excluded
      const optionTexts = question.options.map((o) => o.text.toLowerCase());
      expect(optionTexts).not.toContain('compagne');

      // 5. Confirm no combined card string appears as an answer
      for (const opt of question.options) {
        expect(opt.text).not.toContain('/');
        expect(opt.text).not.toContain('compagnon / compagne');
      }

      // 6. Confirm genderTag is "masculin" and promptSubtext has no explanatory sentences
      expect(question.genderTag).toBe('masculin');
      expect(question.promptSubtext).toBeUndefined();
    });
  });

  describe('2. Normal feminine target (compagne)', () => {
    it('uses exactly one atomic word, excludes masculine counterpart, and avoids combined strings', () => {
      masterVocabularyService.addItem({
        id: 'card-compagnon-2',
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
            masculine_form: { lemma: 'compagnon', gender: Gender.Masculine, underlying_article: 'le' },
            feminine_form: { lemma: 'compagne', gender: Gender.Feminine, underlying_article: 'la' },
            forms: { masculine: 'compagnon', feminine: 'compagne' },
          },
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      const femItem = items.find((i) => i.gender === Gender.Feminine && i.surface_form === 'compagne')!;
      expect(femItem).toBeDefined();

      const question = listeningMcqEngine.generateQuestion(femItem, items);

      // 1. Confirm target is only one word
      expect(question.targetForm).toBe('compagne');
      expect(question.targetForm).not.toContain('/');

      // 2. Confirm audio speaks only the feminine word
      expect(question.audioText).toBe('la compagne');
      expect(question.audioText).not.toContain('compagnon');
      expect(question.audioText).not.toContain('/');

      // 3. Confirm answer options: 4 options, exactly 1 correct
      expect(question.options.length).toBe(4);
      const correctOpt = question.options.find((o) => o.isCorrect);
      expect(correctOpt).toBeDefined();
      expect(correctOpt!.text).toBe('compagne');

      // 4. Confirm counterpart gender (compagnon) is strictly excluded
      const optionTexts = question.options.map((o) => o.text.toLowerCase());
      expect(optionTexts).not.toContain('compagnon');

      // 5. Confirm no combined card string appears as an answer
      for (const opt of question.options) {
        expect(opt.text).not.toContain('/');
      }

      // 6. Confirm genderTag is "feminine" and promptSubtext has no explanatory sentences
      expect(question.genderTag).toBe('feminine');
      expect(question.promptSubtext).toBeUndefined();
    });
  });

  describe('3. Masculine/feminine pair with identical pronunciation (ami / amie)', () => {
    it('excludes feminine counterpart amie when masculine ami is target', () => {
      masterVocabularyService.addItem({
        id: 'card-ami',
        surface_form: 'ami / amie',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 1,
        format_a: {
          entry: 'ami / amie',
          meaning_en: 'friend',
          meaning_vi: 'người bạn',
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            masculine_form: { lemma: 'ami', gender: Gender.Masculine, underlying_article: 'le' },
            feminine_form: { lemma: 'amie', gender: Gender.Feminine, underlying_article: 'la' },
            forms: { masculine: 'ami', feminine: 'amie' },
          },
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      const mascItem = items.find((i) => i.gender === Gender.Masculine && i.surface_form === 'ami')!;
      const femItem = items.find((i) => i.gender === Gender.Feminine && i.surface_form === 'amie')!;
      expect(mascItem).toBeDefined();
      expect(femItem).toBeDefined();

      // Test Masc target
      const qMasc = listeningMcqEngine.generateQuestion(mascItem, items);
      expect(qMasc.targetForm).toBe('ami');
      expect(qMasc.audioText).toBe("l'ami");
      const mascOptionTexts = qMasc.options.map((o) => o.text.toLowerCase());
      expect(mascOptionTexts).toContain('ami');
      expect(mascOptionTexts).not.toContain('amie');

      // Test Fem target
      const qFem = listeningMcqEngine.generateQuestion(femItem, items);
      expect(qFem.targetForm).toBe('amie');
      expect(qFem.audioText).toBe("l'amie");
      const femOptionTexts = qFem.options.map((o) => o.text.toLowerCase());
      expect(femOptionTexts).toContain('amie');
      expect(femOptionTexts).not.toContain('ami');
    });

    it('handles homophonic shared-spelling pair (élève / élève) without duplicate distractors', () => {
      masterVocabularyService.addItem({
        id: 'card-eleve',
        surface_form: 'élève',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 1,
        format_a: {
          entry: 'élève',
          meaning_en: 'student, pupil',
          meaning_vi: 'học sinh',
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            is_shared_form: true,
            masculine_form: { lemma: 'élève', gender: Gender.Masculine, underlying_article: 'le' },
            feminine_form: { lemma: 'élève', gender: Gender.Feminine, underlying_article: 'la' },
          },
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      const mascItem = items.find((i) => i.gender === Gender.Masculine && i.surface_form === 'élève')!;
      expect(mascItem).toBeDefined();

      const question = listeningMcqEngine.generateQuestion(mascItem, items);
      expect(question.targetForm).toBe('élève');
      expect(question.audioText).toBe("l'élève");

      // Verify élève appears exactly once in options (the correct answer)
      const eleveMatches = question.options.filter((o) => o.text.toLowerCase() === 'élève');
      expect(eleveMatches.length).toBe(1);
      expect(eleveMatches[0].isCorrect).toBe(true);
    });
  });

  describe('4. Adjective target (grand / grande)', () => {
    it('speaks only one word and excludes counterpart form from distractors', () => {
      masterVocabularyService.addItem({
        id: 'card-grand',
        surface_form: 'grand / grande',
        part_of_speech: PartOfSpeech.Adjective,
        level: 1,
        format_a: {
          entry: 'grand / grande',
          meaning_en: 'tall, big',
          meaning_vi: 'lớn, cao',
          grammar: {
            pos: PartOfSpeech.Adjective,
            masculine: 'grand',
            feminine: 'grande',
          } as any,
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      const mascAdj = items.find((i) => i.gender === Gender.Masculine && i.surface_form === 'grand')!;
      const femAdj = items.find((i) => i.gender === Gender.Feminine && i.surface_form === 'grande')!;

      // ── Masculine target ──
      const qMasc = listeningMcqEngine.generateQuestion(mascAdj, items, 'masculine');
      expect(qMasc.targetForm).toBe('grand');
      expect(qMasc.audioText).toBe('grand');
      expect(qMasc.genderTag).toBe('masculin');
      expect(qMasc.promptSubtext).toBeUndefined();
      const mascTexts = qMasc.options.map((o) => o.text.toLowerCase());
      expect(mascTexts).toContain('grand');
      expect(mascTexts).not.toContain('grande');

      // ── Feminine target ──
      const qFem = listeningMcqEngine.generateQuestion(femAdj, items, 'feminine');
      expect(qFem.targetForm).toBe('grande');
      expect(qFem.audioText).toBe('grande');
      expect(qFem.genderTag).toBe('feminine');
      expect(qFem.promptSubtext).toBeUndefined();
      const femTexts = qFem.options.map((o) => o.text.toLowerCase());
      expect(femTexts).toContain('grande');
      expect(femTexts).not.toContain('grand');
    });
  });

  describe('5. Evaluation results for correct and incorrect answers', () => {
    it('evaluates correct answer with Correct title and no sentences', () => {
      const item: VocabularyItem = {
        id: 'rec-test-1',
        surface_form: 'livre',
        normalized_form: 'livre',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const question = listeningMcqEngine.generateQuestion(item);
      const correctOpt = question.options.find((o) => o.isCorrect)!;

      const evalResult = listeningMcqEngine.evaluateAnswer(question, correctOpt.id);
      expect(evalResult.isCorrect).toBe(true);
      expect(evalResult.feedbackTitle).toBe('Correct');
      expect(evalResult.correctAnswer).toBe('livre');
      expect(evalResult.retrievalResult).toBe('success');
    });

    it('evaluates incorrect answer with Incorrect title and correct answer word', () => {
      const item: VocabularyItem = {
        id: 'rec-test-2',
        surface_form: 'maison',
        normalized_form: 'maison',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const question = listeningMcqEngine.generateQuestion(item);
      const wrongOpt = question.options.find((o) => !o.isCorrect)!;

      const evalResult = listeningMcqEngine.evaluateAnswer(question, wrongOpt.id);
      expect(evalResult.isCorrect).toBe(false);
      expect(evalResult.feedbackTitle).toBe('Incorrect');
      expect(evalResult.correctAnswer).toBe('maison');
      expect(evalResult.retrievalResult).toBe('failure');
    });
  });
});
