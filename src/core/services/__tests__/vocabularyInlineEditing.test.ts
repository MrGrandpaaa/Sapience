import { describe, it, expect, beforeEach } from 'bun:test';
import { masterVocabularyService, normalizeRelatedWord } from '../masterVocabularyService';
import { PartOfSpeech, Gender } from '../../models/types';
import { VocabularyItem } from '../../models/vocabulary';

describe('Prompt 2 Implementation: Inline Editing & Vocab Refinements', () => {
  beforeEach(() => {
    masterVocabularyService.clearAll();
  });

  describe('1. Meaning Inline Editing & Memory Synchronization', () => {
    it('updates meaning across card display data and all constituent atomic memory records without duplicates', () => {
      // Add a combined noun entry (1 card, 2 atomic records)
      masterVocabularyService.addItem({
        id: 'card-compagnon-edit',
        surface_form: 'compagnon / compagne',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Both,
        level: 2,
        review_count: 5,
        successful_retrievals: 4,
        format_a: {
          entry: 'compagnon / compagne',
          meaning_en: 'companion, partner',
          meaning_vi: 'bạn đồng hành',
          example: { french: 'Un bon compagnon.', english: 'A good companion.' },
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'both',
            gender: Gender.Both,
            masculine_form: { lemma: 'compagnon', gender: Gender.Masculine, underlying_article: 'le' },
            feminine_form: { lemma: 'compagne', gender: Gender.Feminine, underlying_article: 'la' },
          },
        },
      } as any);

      expect(masterVocabularyService.getAllCards().length).toBe(1);
      expect(masterVocabularyService.getAllItems().length).toBe(2);

      // Perform inline edit on English meaning
      const updateResult = masterVocabularyService.updateMeaning('card-compagnon-edit', 'en', 'trusted companion, buddy');
      expect(updateResult).toBeDefined();

      // Verify card was updated
      const card = masterVocabularyService.getCardById('card-compagnon-edit');
      expect(card?.format_a?.meaning_en).toBe('trusted companion, buddy');

      // Verify BOTH constituent atomic records were updated in memory
      const items = masterVocabularyService.getAllItems();
      expect(items.length).toBe(2); // NO duplicates created
      for (const item of items) {
        expect(item.format_a?.meaning_en).toBe('trusted companion, buddy');
        // Unrelated SRS metadata is preserved
        expect(item.level).toBe(2);
        expect(item.review_count).toBe(5);
        expect(item.successful_retrievals).toBe(4);
      }

      // Perform inline edit on Vietnamese meaning
      masterVocabularyService.updateMeaning('card-compagnon-edit', 'vi', 'tri kỷ, bạn đường');
      const updatedCard = masterVocabularyService.getCardById('card-compagnon-edit');
      expect(updatedCard?.format_a?.meaning_vi).toBe('tri kỷ, bạn đường');

      for (const item of masterVocabularyService.getAllItems()) {
        expect(item.format_a?.meaning_vi).toBe('tri kỷ, bạn đường');
      }
    });
  });

  describe('2. Synonym / Antonym Gender & Inline Editing', () => {
    it('stores independent gender for each individual synonym and antonym', () => {
      masterVocabularyService.addItem({
        id: 'card-noun-syn-test',
        surface_form: 'ami',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 1,
        format_a: {
          entry: 'ami',
          meaning_en: 'friend',
          meaning_vi: 'người bạn',
          example: { french: 'Un ami.', english: 'A friend.' },
          synonyms: ['copain', 'camarade'],
          antonyms: ['ennemi', 'rival'],
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'masculine',
            gender: Gender.Masculine,
            masculine_form: { lemma: 'ami', gender: Gender.Masculine, underlying_article: 'un' },
          },
        },
      } as any);

      // Change gender of synonym 0 to 'mas' and synonym 1 to 'fem'
      masterVocabularyService.updateSynonym('card-noun-syn-test', 0, undefined, 'mas');
      masterVocabularyService.updateSynonym('card-noun-syn-test', 1, undefined, 'fem');

      // Change gender of antonym 0 to 'mas' and antonym 1 to 'fem'
      masterVocabularyService.updateAntonym('card-noun-syn-test', 0, undefined, 'mas');
      masterVocabularyService.updateAntonym('card-noun-syn-test', 1, undefined, 'fem');

      const card = masterVocabularyService.getCardById('card-noun-syn-test')!;
      const syn0 = normalizeRelatedWord(card.format_a!.synonyms![0]);
      const syn1 = normalizeRelatedWord(card.format_a!.synonyms![1]);
      const ant0 = normalizeRelatedWord(card.format_a!.antonyms![0]);
      const ant1 = normalizeRelatedWord(card.format_a!.antonyms![1]);

      expect(syn0.word).toBe('copain');
      expect(syn0.gender).toBe('mas');

      expect(syn1.word).toBe('camarade');
      expect(syn1.gender).toBe('fem'); // NOT global: each item has its own distinct gender

      expect(ant0.word).toBe('ennemi');
      expect(ant0.gender).toBe('mas');

      expect(ant1.word).toBe('rival');
      expect(ant1.gender).toBe('fem');

      // Verify the atomic record in memory also has these exact independent genders
      const atomicItem = masterVocabularyService.getAllItems()[0];
      const atomicSyn1 = normalizeRelatedWord(atomicItem.format_a!.synonyms![1]);
      expect(atomicSyn1.word).toBe('camarade');
      expect(atomicSyn1.gender).toBe('fem');
    });

    it('edits synonym and antonym text inline and replaces previous value without creating duplicates', () => {
      masterVocabularyService.addItem({
        id: 'card-edit-text-test',
        surface_form: 'livre',
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 1,
        format_a: {
          entry: 'livre',
          meaning_en: 'book',
          meaning_vi: 'cuốn sách',
          example: { french: 'Un livre.', english: 'A book.' },
          synonyms: ['bouquin'],
          antonyms: ['néant'],
          grammar: {
            pos: PartOfSpeech.Noun,
            gender_choice: 'masculine',
            gender: Gender.Masculine,
            masculine_form: { lemma: 'livre', gender: Gender.Masculine, underlying_article: 'un' },
          },
        },
      } as any);

      // Edit synonym text from 'bouquin' to 'ouvrage'
      masterVocabularyService.updateSynonym('card-edit-text-test', 0, 'ouvrage');

      // Edit antonym text
      masterVocabularyService.updateAntonym('card-edit-text-test', 0, 'vide');

      const card = masterVocabularyService.getCardById('card-edit-text-test')!;
      expect(card.format_a!.synonyms!.length).toBe(1); // No duplicate entries
      expect(card.format_a!.antonyms!.length).toBe(1);

      const syn = normalizeRelatedWord(card.format_a!.synonyms![0]);
      const ant = normalizeRelatedWord(card.format_a!.antonyms![0]);

      expect(syn.word).toBe('ouvrage');
      expect(ant.word).toBe('vide');

      // Check atomic record in vocabulary memory
      const item = masterVocabularyService.getAllItems()[0];
      expect(item.format_a!.synonyms!.length).toBe(1);
      expect(normalizeRelatedWord(item.format_a!.synonyms![0]).word).toBe('ouvrage');
    });
  });
});
