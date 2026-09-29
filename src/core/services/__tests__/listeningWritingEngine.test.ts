import { describe, it, expect, beforeEach } from 'bun:test';
import { masterVocabularyService } from '../masterVocabularyService';
import { listeningWritingEngine } from '../games/engines/listeningWritingEngine';
import { PartOfSpeech, Gender } from '../../models/types';
import { VocabularyItem } from '../../models/vocabulary';

describe('Prompt 4 Implementation: Listening - Dictation (Writing) Engine', () => {
  beforeEach(() => {
    masterVocabularyService.clearAll();
  });

  describe('1. Normal masculine word (compagnon)', () => {
    it('speaks only one word, sets canonical answer to single word, and has no gender tag', () => {
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

      const question = listeningWritingEngine.generateQuestion(mascItem, items);

      // Audio says only one word (compagnon)
      expect(question.audioText).toBe('compagnon');
      expect(question.audioText).not.toContain('compagne');
      expect(question.audioText).not.toContain('/');

      // Canonical answer is atomic single word
      expect(question.canonicalAnswer).toBe('compagnon');
      expect(question.canonicalAnswer).not.toContain('/');

      // Gender tag shows single-word "masculin"
      expect(question.genderTag).toBe('masculin');

      // Combined card form never used as audio or answer
      expect(question.audioText).not.toContain('compagnon / compagne');
      expect(question.canonicalAnswer).not.toContain('compagnon / compagne');
    });

    it('accepts bare word, un + word, and le + word, while rejecting wrong gender articles', () => {
      const item: VocabularyItem = {
        id: 'rec-compagnon',
        surface_form: 'compagnon',
        normalized_form: 'compagnon',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const question = listeningWritingEngine.generateQuestion(item);

      // Bare word answer accepted
      const evalBare = listeningWritingEngine.evaluateAnswer(question, 'compagnon');
      expect(evalBare.isCorrect).toBe(true);
      expect(evalBare.feedbackTitle).toBe('Correct');

      // Correct masculine indefinite article accepted
      const evalUn = listeningWritingEngine.evaluateAnswer(question, 'un compagnon');
      expect(evalUn.isCorrect).toBe(true);
      expect(evalUn.feedbackTitle).toBe('Correct');

      // Correct masculine definite article accepted
      const evalLe = listeningWritingEngine.evaluateAnswer(question, 'le compagnon');
      expect(evalLe.isCorrect).toBe(true);
      expect(evalLe.feedbackTitle).toBe('Correct');

      // Wrong gender article (une) rejected
      const evalUne = listeningWritingEngine.evaluateAnswer(question, 'une compagnon');
      expect(evalUne.isCorrect).toBe(false);
      expect(evalUne.feedbackTitle).toBe('Incorrect');
      expect(evalUne.correctAnswer).toBe('compagnon');

      // Wrong gender article (la) rejected
      const evalLa = listeningWritingEngine.evaluateAnswer(question, 'la compagnon');
      expect(evalLa.isCorrect).toBe(false);
      expect(evalLa.feedbackTitle).toBe('Incorrect');
    });
  });

  describe('2. Normal feminine word (compagne)', () => {
    it('speaks only one word and accepts bare word, une + word, and la + word, while rejecting masculine articles', () => {
      const item: VocabularyItem = {
        id: 'rec-compagne',
        surface_form: 'compagne',
        normalized_form: 'compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const question = listeningWritingEngine.generateQuestion(item);

      // Audio speaks single atomic word
      expect(question.audioText).toBe('compagne');
      expect(question.canonicalAnswer).toBe('compagne');
      expect(question.genderTag).toBe('feminine');

      // Bare word answer accepted
      const evalBare = listeningWritingEngine.evaluateAnswer(question, 'compagne');
      expect(evalBare.isCorrect).toBe(true);

      // Correct feminine indefinite article accepted
      const evalUne = listeningWritingEngine.evaluateAnswer(question, 'une compagne');
      expect(evalUne.isCorrect).toBe(true);

      // Correct feminine definite article accepted
      const evalLa = listeningWritingEngine.evaluateAnswer(question, 'la compagne');
      expect(evalLa.isCorrect).toBe(true);

      // Wrong gender article (un) rejected
      const evalUn = listeningWritingEngine.evaluateAnswer(question, 'un compagne');
      expect(evalUn.isCorrect).toBe(false);
      expect(evalUn.feedbackTitle).toBe('Incorrect');
      expect(evalUn.correctAnswer).toBe('compagne');

      // Wrong gender article (le) rejected
      const evalLe = listeningWritingEngine.evaluateAnswer(question, 'le compagne');
      expect(evalLe.isCorrect).toBe(false);
      expect(evalLe.feedbackTitle).toBe('Incorrect');
    });
  });

  describe('3. Elision nouns (ami / amie)', () => {
    it('accepts bare word, un/une, and l’/l’ for elision nouns, while rejecting un-elided le/la or wrong gender', () => {
      // Masculine ami
      const itemMasc: VocabularyItem = {
        id: 'rec-ami',
        surface_form: 'ami',
        normalized_form: 'ami',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const qMasc = listeningWritingEngine.generateQuestion(itemMasc);
      expect(qMasc.audioText).toBe('ami');
      expect(listeningWritingEngine.evaluateAnswer(qMasc, 'ami').isCorrect).toBe(true);
      expect(listeningWritingEngine.evaluateAnswer(qMasc, 'un ami').isCorrect).toBe(true);
      expect(listeningWritingEngine.evaluateAnswer(qMasc, "l'ami").isCorrect).toBe(true);
      expect(listeningWritingEngine.evaluateAnswer(qMasc, "l’ami").isCorrect).toBe(true);
      expect(listeningWritingEngine.evaluateAnswer(qMasc, 'une ami').isCorrect).toBe(false);
      expect(listeningWritingEngine.evaluateAnswer(qMasc, 'la ami').isCorrect).toBe(false);

      // Feminine amie
      const itemFem: VocabularyItem = {
        id: 'rec-amie',
        surface_form: 'amie',
        normalized_form: 'amie',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const qFem = listeningWritingEngine.generateQuestion(itemFem);
      expect(qFem.audioText).toBe('amie');
      expect(listeningWritingEngine.evaluateAnswer(qFem, 'amie').isCorrect).toBe(true);
      expect(listeningWritingEngine.evaluateAnswer(qFem, 'une amie').isCorrect).toBe(true);
      expect(listeningWritingEngine.evaluateAnswer(qFem, "l'amie").isCorrect).toBe(true);
      expect(listeningWritingEngine.evaluateAnswer(qFem, 'un amie').isCorrect).toBe(false);
      expect(listeningWritingEngine.evaluateAnswer(qFem, 'le amie').isCorrect).toBe(false);
    });
  });

  describe('4. Homophonic masculine/feminine target (élève / élève)', () => {
    it('displays the correct gender tag and rejects opposite gender article', () => {
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
      const femItem = items.find((i) => i.gender === Gender.Feminine && i.surface_form === 'élève')!;
      expect(mascItem).toBeDefined();
      expect(femItem).toBeDefined();

      // ── Masculine Homophone ──
      const qMasc = listeningWritingEngine.generateQuestion(mascItem, items);
      expect(qMasc.audioText).toBe('élève');
      expect(qMasc.canonicalAnswer).toBe('élève');
      expect(qMasc.genderTag).toBe('masculin');

      // Bare word accepted
      expect(listeningWritingEngine.evaluateAnswer(qMasc, 'élève').isCorrect).toBe(true);
      // Correct masculine article accepted
      expect(listeningWritingEngine.evaluateAnswer(qMasc, 'un élève').isCorrect).toBe(true);
      expect(listeningWritingEngine.evaluateAnswer(qMasc, "l'élève").isCorrect).toBe(true);
      // Opposite gender article rejected
      const evalMascWrong = listeningWritingEngine.evaluateAnswer(qMasc, 'une élève');
      expect(evalMascWrong.isCorrect).toBe(false);
      expect(evalMascWrong.feedbackTitle).toBe('Incorrect');
      expect(evalMascWrong.correctAnswer).toBe('élève');

      // ── Feminine Homophone ──
      const qFem = listeningWritingEngine.generateQuestion(femItem, items);
      expect(qFem.audioText).toBe('élève');
      expect(qFem.canonicalAnswer).toBe('élève');
      expect(qFem.genderTag).toBe('feminine');

      // Bare word accepted
      expect(listeningWritingEngine.evaluateAnswer(qFem, 'élève').isCorrect).toBe(true);
      // Correct feminine article accepted
      expect(listeningWritingEngine.evaluateAnswer(qFem, 'une élève').isCorrect).toBe(true);
      expect(listeningWritingEngine.evaluateAnswer(qFem, "l'élève").isCorrect).toBe(true);
      // Opposite gender article rejected
      const evalFemWrong = listeningWritingEngine.evaluateAnswer(qFem, 'un élève');
      expect(evalFemWrong.isCorrect).toBe(false);
      expect(evalFemWrong.feedbackTitle).toBe('Incorrect');
      expect(evalFemWrong.correctAnswer).toBe('élève');
    });
  });

  describe('5. Clean result outputs', () => {
    it('returns Correct title on right answer without sentences', () => {
      const item: VocabularyItem = {
        id: 'rec-test-clean',
        surface_form: 'maison',
        normalized_form: 'maison',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const q = listeningWritingEngine.generateQuestion(item);
      const evalRes = listeningWritingEngine.evaluateAnswer(q, 'maison');

      expect(evalRes.isCorrect).toBe(true);
      expect(evalRes.feedbackTitle).toBe('Correct');
      expect(evalRes.correctAnswer).toBe('maison');
      expect(evalRes.retrievalResult).toBe('success');
    });

    it('returns Incorrect title on wrong answer with correct answer word and no explanations', () => {
      const item: VocabularyItem = {
        id: 'rec-test-clean-2',
        surface_form: 'voiture',
        normalized_form: 'voiture',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const q = listeningWritingEngine.generateQuestion(item);
      const evalRes = listeningWritingEngine.evaluateAnswer(q, 'camion');

      expect(evalRes.isCorrect).toBe(false);
      expect(evalRes.feedbackTitle).toBe('Incorrect');
      expect(evalRes.correctAnswer).toBe('voiture');
      expect(evalRes.retrievalResult).toBe('failure');
    });
  });
});
