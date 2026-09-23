import { describe, it, expect, beforeEach } from 'bun:test';
import { masterVocabularyService } from '../masterVocabularyService';
import { PartOfSpeech, Gender } from '../../models/types';
import { VocabularyItem, CardDisplayData } from '../../models/vocabulary';
import { genderEngine } from '../games/engines/genderEngine';
import { formatPronunciationText } from '../audioPronunciationFormatter';

describe('Data Architecture: Separation of Card Display Data and Atomic Vocabulary Memory', () => {
  beforeEach(() => {
    masterVocabularyService.clearAll();
  });

  describe('1. Decomposition of Lexical Entries', () => {
    it('decomposes dual-form nouns (e.g. compagnon / compagne) into 1 card and 2 atomic records', () => {
      const combinedNoun: Partial<VocabularyItem> = {
        id: 'test-noun-compagnon',
        surface_form: 'compagnon / compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 2,
        format_a: {
          entry: 'compagnon / compagne',
          meaning_en: 'companion, partner',
          meaning_vi: 'bạn đồng hành',
          example: { french: 'Un bon compagnon.', english: 'A good companion.', vietnamese: 'Một người bạn tốt.' },
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            gender: Gender.Both,
            masculine_form: {
              lemma: 'compagnon',
              gender: Gender.Masculine,
              underlying_article: 'le',
            },
            feminine_form: {
              lemma: 'compagne',
              gender: Gender.Feminine,
              underlying_article: 'la',
            },
          },
        },
      };

      const { card, atomicRecords } = masterVocabularyService.decomposeEntry(combinedNoun);

      // Card Display Data assertions
      expect(card.id).toBe('test-noun-compagnon');
      expect(card.display_title).toBe('compagnon / compagne');
      expect(card.surface_form).toBe('compagnon / compagne');
      expect(card.atomic_record_ids.length).toBe(2);

      // Atomic Vocabulary Memory assertions
      expect(atomicRecords.length).toBe(2);

      const recordA = atomicRecords.find((r) => r.gender === Gender.Masculine);
      const recordB = atomicRecords.find((r) => r.gender === Gender.Feminine);

      expect(recordA).toBeDefined();
      expect(recordA!.word).toBe('compagnon');
      expect(recordA!.surface_form).toBe('compagnon');
      expect(recordA!.gender).toBe(Gender.Masculine);
      expect(recordA!.card_id).toBe('test-noun-compagnon');
      expect(recordA!.level).toBe(2);
      expect(recordA!.format_a?.meaning_en).toBe('companion, partner');

      expect(recordB).toBeDefined();
      expect(recordB!.word).toBe('compagne');
      expect(recordB!.surface_form).toBe('compagne');
      expect(recordB!.gender).toBe(Gender.Feminine);
      expect(recordB!.card_id).toBe('test-noun-compagnon');
      expect(recordB!.level).toBe(2);
      expect(recordB!.format_a?.meaning_en).toBe('companion, partner');

      // Check independent addressability
      expect(recordA!.id).not.toBe(recordB!.id);
    });

    it('decomposes shared-form nouns (e.g. célibataire or élève) into 1 card and 2 atomic records', () => {
      const sharedNoun: Partial<VocabularyItem> = {
        id: 'test-shared-celibataire',
        surface_form: 'célibataire',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 1,
        format_a: {
          entry: 'célibataire',
          meaning_en: 'single, bachelor',
          meaning_vi: 'người độc thân',
          example: { french: 'Il est célibataire.', english: 'He is single.', vietnamese: 'Anh ấy độc thân.' },
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            gender: Gender.Both,
            lemma: 'célibataire',
            masculine_form: {
              lemma: 'célibataire',
              gender: Gender.Masculine,
              underlying_article: 'le',
            },
            feminine_form: {
              lemma: 'célibataire',
              gender: Gender.Feminine,
              underlying_article: 'la',
            },
          },
        },
      };

      const { card, atomicRecords } = masterVocabularyService.decomposeEntry(sharedNoun);

      expect(card.display_title).toBe('célibataire');
      expect(card.atomic_record_ids.length).toBe(2);

      expect(atomicRecords.length).toBe(2);
      const masc = atomicRecords.find((r) => r.gender === Gender.Masculine);
      const fem = atomicRecords.find((r) => r.gender === Gender.Feminine);

      expect(masc).toBeDefined();
      expect(masc!.word).toBe('célibataire');
      expect(masc!.gender).toBe(Gender.Masculine);

      expect(fem).toBeDefined();
      expect(fem!.word).toBe('célibataire');
      expect(fem!.gender).toBe(Gender.Feminine);
    });

    it('handles single-gender nouns without combining', () => {
      const singleNoun: Partial<VocabularyItem> = {
        id: 'test-single-livre',
        surface_form: 'livre',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 3,
        format_a: {
          entry: 'livre',
          meaning_en: 'book',
          meaning_vi: 'sách',
          example: { french: 'Un livre.', english: 'A book.', vietnamese: 'Một cuốn sách.' },
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'masculine',
            gender: Gender.Masculine,
            masculine_form: { lemma: 'livre', gender: Gender.Masculine, underlying_article: 'le' },
          },
        },
      };

      const { card, atomicRecords } = masterVocabularyService.decomposeEntry(singleNoun);

      expect(card.id).toBe('test-single-livre');
      expect(card.atomic_record_ids.length).toBe(1);
      expect(atomicRecords.length).toBe(1);
      expect(atomicRecords[0].word).toBe('livre');
      expect(atomicRecords[0].gender).toBe(Gender.Masculine);
    });

    it('decomposes dual-form adjectives (e.g. grand / grande)', () => {
      const dualAdj: Partial<VocabularyItem> = {
        id: 'test-adj-grand',
        surface_form: 'grand / grande',
        part_of_speech: PartOfSpeech.Adjective,
        level: 1,
        format_a: {
          entry: 'grand / grande',
          meaning_en: 'big, tall',
          meaning_vi: 'to lớn',
          example: { french: 'Un grand arbre.', english: 'A tall tree.', vietnamese: 'Một cái cây lớn.' },
          grammar: {
            pos: PartOfSpeech.Adjective,
            masculine: 'grand',
            feminine: 'grande',
          } as any,
        },
      };

      const { card, atomicRecords } = masterVocabularyService.decomposeEntry(dualAdj);

      expect(card.display_title).toBe('grand / grande');
      expect(atomicRecords.length).toBe(2);
      expect(atomicRecords[0].word).toBe('grand');
      expect(atomicRecords[0].gender).toBe(Gender.Masculine);
      expect(atomicRecords[1].word).toBe('grande');
      expect(atomicRecords[1].gender).toBe(Gender.Feminine);
    });
  });

  describe('2. MasterVocabularyService Storage and Retrieval', () => {
    it('stores atomic records in items and card representations in cards', () => {
      masterVocabularyService.addItem({
        id: 'card-compagnon',
        surface_form: 'compagnon / compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 1,
        format_a: {
          entry: 'compagnon / compagne',
          meaning_en: 'companion',
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            masculine_form: { lemma: 'compagnon', gender: Gender.Masculine, underlying_article: 'le' },
            feminine_form: { lemma: 'compagne', gender: Gender.Feminine, underlying_article: 'la' },
          },
        },
      } as any);

      // Card Display Data
      const cards = masterVocabularyService.getAllCards();
      expect(cards.length).toBe(1);
      expect(cards[0].id).toBe('card-compagnon');
      expect(cards[0].display_title).toBe('compagnon / compagne');

      // Atomic Vocabulary Memory Data
      const items = masterVocabularyService.getAllItems();
      expect(items.length).toBe(2);

      const masc = items.find((i) => i.gender === Gender.Masculine);
      const fem = items.find((i) => i.gender === Gender.Feminine);

      expect(masc).toBeDefined();
      expect(masc!.word).toBe('compagnon');
      expect(fem).toBeDefined();
      expect(fem!.word).toBe('compagne');

      // Independently addressable by ID
      expect(masterVocabularyService.getItemById(masc!.id)).toEqual(masc);
      expect(masterVocabularyService.getItemById(fem!.id)).toEqual(fem);
    });

    it('synchronizes card presentation level when an atomic item advances', () => {
      masterVocabularyService.addItem({
        id: 'card-sync-test',
        surface_form: 'compagnon / compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 0,
        format_a: {
          entry: 'compagnon / compagne',
          meaning_en: 'companion',
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            masculine_form: { lemma: 'compagnon', gender: Gender.Masculine, underlying_article: 'le' },
            feminine_form: { lemma: 'compagne', gender: Gender.Feminine, underlying_article: 'la' },
          },
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      const masc = items.find((i) => i.gender === Gender.Masculine)!;
      const fem = items.find((i) => i.gender === Gender.Feminine)!;

      // Update masculine item level
      masterVocabularyService.updateItemLevel(masc.id, 2);

      expect(masterVocabularyService.getItemById(masc.id)!.level).toBe(2);
      expect(masterVocabularyService.getItemById(fem.id)!.level).toBe(0);

      // Card level reflects minimum of constituent atomic items
      const card = masterVocabularyService.getCardById('card-sync-test')!;
      expect(card.level).toBe(0);

      // Now advance feminine item level as well
      masterVocabularyService.updateItemLevel(fem.id, 3);
      expect(masterVocabularyService.getCardById('card-sync-test')!.level).toBe(2);
    });

    it('deleting a card removes the card and all its atomic records', () => {
      masterVocabularyService.addItem({
        id: 'card-delete-test',
        surface_form: 'compagnon / compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 0,
        format_a: {
          entry: 'compagnon / compagne',
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            masculine_form: { lemma: 'compagnon', gender: Gender.Masculine, underlying_article: 'le' },
            feminine_form: { lemma: 'compagne', gender: Gender.Feminine, underlying_article: 'la' },
          },
        },
      } as any);

      expect(masterVocabularyService.getAllCards().length).toBe(1);
      expect(masterVocabularyService.getAllItems().length).toBe(2);

      // Remove the card
      const removed = masterVocabularyService.removeCard('card-delete-test');
      expect(removed).toBe(true);

      expect(masterVocabularyService.getAllCards().length).toBe(0);
      expect(masterVocabularyService.getAllItems().length).toBe(0);
    });
  });

  describe('3. Game Data Rule Verification', () => {
    it('game engines retrieve ONE atomic record and test it independently', () => {
      masterVocabularyService.addItem({
        id: 'card-game-test',
        surface_form: 'compagnon / compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 0,
        format_a: {
          entry: 'compagnon / compagne',
          meaning_en: 'companion',
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            masculine_form: { lemma: 'compagnon', gender: Gender.Masculine, underlying_article: 'le' },
            feminine_form: { lemma: 'compagne', gender: Gender.Feminine, underlying_article: 'la' },
          },
        },
      } as any);

      const items = masterVocabularyService.getAllItems();
      const mascItem = items.find((i) => i.gender === Gender.Masculine)!;
      const femItem = items.find((i) => i.gender === Gender.Feminine)!;

      // ── Gender Game on Masculine Record ──
      const mascQuestion = genderEngine.generateQuestion(mascItem);
      expect(mascQuestion.prompt).toContain('compagnon');
      expect(mascQuestion.prompt).not.toContain('compagne');
      expect(mascQuestion.canonicalGender).toBe('masculine');
      expect(mascQuestion.canonicalArticleIndefinite).toBe('un');

      // ── Gender Game on Feminine Record ──
      const femQuestion = genderEngine.generateQuestion(femItem);
      expect(femQuestion.prompt).toContain('compagne');
      expect(femQuestion.prompt).not.toContain('compagnon');
      expect(femQuestion.canonicalGender).toBe('feminine');
      expect(femQuestion.canonicalArticleIndefinite).toBe('une');

      // ── Audio Pronunciation for Atomic Records ──
      const mascAudio = formatPronunciationText(mascItem);
      expect(mascAudio).toBe('le compagnon');

      const femAudio = formatPronunciationText(femItem);
      expect(femAudio).toBe('la compagne');
    });
  });
});
