import { describe, it, expect, beforeEach } from 'bun:test';
import { masterVocabularyService } from '../masterVocabularyService';
import { PartOfSpeech, Gender } from '../../models/types';
import { VocabularyItem, CardDisplayData } from '../../models/vocabulary';
import { genderEngine } from '../games/engines/genderEngine';

const STORAGE_KEY_ITEMS = 'sapience_vocab_items_v1';
const STORAGE_KEY_CARDS = 'sapience_vocab_cards_v1';

// In-memory mock storage for Bun testing
const memoryStorage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => memoryStorage.get(key) || null,
  setItem: (key: string, val: string) => memoryStorage.set(key, String(val)),
  removeItem: (key: string) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};

(globalThis as any).window = globalThis;
(globalThis as any).localStorage = mockLocalStorage;

describe('Vocabulary Recovery and Multi-Reload Stability', () => {
  beforeEach(() => {
    memoryStorage.clear();
    masterVocabularyService.clearAll();
  });

  it('1. Recovers exact original vocabulary set from heavily duplicated localStorage', () => {
    // Construct original realistic dataset of 10 vocabulary cards
    // - 3 dual-form adjectives (3 cards, 6 atomic items)
    // - 2 dual-form nouns (2 cards, 4 atomic items)
    // - 3 single-gender nouns (3 cards, 3 atomic items)
    // - 2 verbs (2 cards, 2 atomic items)
    // Total original: 10 cards, 15 atomic items

    const originalItems: any[] = [];
    const originalCards: any[] = [];

    // 3 Adjectives
    for (let i = 1; i <= 3; i++) {
      const cardId = `test-adj-${i}`;
      const mascId = `${cardId}-masc`;
      const femId = `${cardId}-fem`;
      originalCards.push({
        id: cardId,
        display_title: `adj${i} / adj${i}e`,
        surface_form: `adj${i} / adj${i}e`,
        normalized_form: `adj${i} / adj${i}e`,
        part_of_speech: PartOfSpeech.Adjective,
        atomic_record_ids: [mascId, femId],
        level: 1,
        next_review_at: '2026-09-29T00:00:00.000Z',
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-21T00:00:00.000Z',
        format_a: { meaning_en: `adjective ${i} English`, meaning_vi: `tính từ ${i} Tiếng Việt` },
      });
      originalItems.push({
        id: mascId,
        card_id: cardId,
        word: `adj${i}`,
        surface_form: `adj${i}`,
        normalized_form: `adj${i}`,
        part_of_speech: PartOfSpeech.Adjective,
        gender: Gender.Masculine,
        level: 1,
        review_count: 3,
        successful_retrievals: 3,
        failed_retrievals: 0,
        current_streak: 3,
        last_review_at: '2026-09-21T00:00:00.000Z',
        next_review_at: '2026-09-29T00:00:00.000Z',
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-21T00:00:00.000Z',
        format_a: {
          meaning_en: `adjective ${i} English`,
          meaning_vi: `tính từ ${i} Tiếng Việt`,
          grammar: { pos: PartOfSpeech.Adjective, masculine: `adj${i}`, feminine: `adj${i}e` },
        },
      });
      originalItems.push({
        id: femId,
        card_id: cardId,
        word: `adj${i}e`,
        surface_form: `adj${i}e`,
        normalized_form: `adj${i}e`,
        part_of_speech: PartOfSpeech.Adjective,
        gender: Gender.Feminine,
        level: 1,
        review_count: 2,
        successful_retrievals: 2,
        failed_retrievals: 0,
        current_streak: 2,
        last_review_at: '2026-09-21T00:00:00.000Z',
        next_review_at: '2026-09-29T00:00:00.000Z',
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-21T00:00:00.000Z',
        format_a: {
          meaning_en: `adjective ${i} English`,
          meaning_vi: `tính từ ${i} Tiếng Việt`,
          grammar: { pos: PartOfSpeech.Adjective, masculine: `adj${i}`, feminine: `adj${i}e` },
        },
      });
    }

    // 2 Dual nouns
    for (let i = 1; i <= 2; i++) {
      const cardId = `test-dual-noun-${i}`;
      const mascId = `${cardId}-masc`;
      const femId = `${cardId}-fem`;
      originalCards.push({
        id: cardId,
        display_title: `ami${i} / amie${i}`,
        surface_form: `ami${i} / amie${i}`,
        normalized_form: `ami${i} / amie${i}`,
        part_of_speech: PartOfSpeech.Noun,
        atomic_record_ids: [mascId, femId],
        level: 2,
        next_review_at: '2026-09-30T00:00:00.000Z',
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-22T00:00:00.000Z',
      });
      originalItems.push({
        id: mascId,
        card_id: cardId,
        word: `ami${i}`,
        surface_form: `ami${i}`,
        normalized_form: `ami${i}`,
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 2,
        review_count: 5,
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-22T00:00:00.000Z',
      });
      originalItems.push({
        id: femId,
        card_id: cardId,
        word: `amie${i}`,
        surface_form: `amie${i}`,
        normalized_form: `amie${i}`,
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Feminine,
        level: 2,
        review_count: 4,
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-22T00:00:00.000Z',
      });
    }

    // 3 Single nouns
    for (let i = 1; i <= 3; i++) {
      const cardId = `test-single-noun-${i}`;
      originalCards.push({
        id: cardId,
        display_title: `livre${i}`,
        surface_form: `livre${i}`,
        normalized_form: `livre${i}`,
        part_of_speech: PartOfSpeech.Noun,
        atomic_record_ids: [cardId],
        level: 0,
        next_review_at: '2026-09-29T00:00:00.000Z',
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-20T00:00:00.000Z',
      });
      originalItems.push({
        id: cardId,
        card_id: cardId,
        word: `livre${i}`,
        surface_form: `livre${i}`,
        normalized_form: `livre${i}`,
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 0,
        review_count: 0,
        next_review_at: '2026-09-29T00:00:00.000Z',
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-20T00:00:00.000Z',
      });
    }

    // 2 Verbs
    for (let i = 1; i <= 2; i++) {
      const cardId = `test-verb-${i}`;
      originalCards.push({
        id: cardId,
        display_title: `parler${i}`,
        surface_form: `parler${i}`,
        normalized_form: `parler${i}`,
        part_of_speech: PartOfSpeech.Verb,
        atomic_record_ids: [cardId],
        level: 3,
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-23T00:00:00.000Z',
      });
      originalItems.push({
        id: cardId,
        card_id: cardId,
        word: `parler${i}`,
        surface_form: `parler${i}`,
        normalized_form: `parler${i}`,
        part_of_speech: PartOfSpeech.Verb,
        level: 3,
        review_count: 8,
        created_at: '2026-09-20T00:00:00.000Z',
        updated_at: '2026-09-23T00:00:00.000Z',
      });
    }

    expect(originalCards.length).toBe(10);
    expect(originalItems.length).toBe(15);

    // Simulate bug: multiply dataset 8 times into localStorage
    const duplicatedItems: any[] = [];
    const duplicatedCards: any[] = [];
    for (let copy = 0; copy < 8; copy++) {
      for (const item of originalItems) {
        duplicatedItems.push({ ...item });
      }
      for (const card of originalCards) {
        duplicatedCards.push({ ...card });
      }
    }

    // Give one copy of adj-1-masc a higher review count and level to simulate active user session
    duplicatedItems[0].review_count = 10;
    duplicatedItems[0].level = 3;

    expect(duplicatedCards.length).toBe(80);
    expect(duplicatedItems.length).toBe(120);

    // Save corrupted duplicated data to storage
    memoryStorage.set(STORAGE_KEY_ITEMS, JSON.stringify(duplicatedItems));
    memoryStorage.set(STORAGE_KEY_CARDS, JSON.stringify(duplicatedCards));

    // RUN REPAIR VIA SERVICE INITIALIZATION / LOAD
    (masterVocabularyService as any).loadFromStorage();

    const recoveredCards = masterVocabularyService.getAllCards();
    const recoveredItems = masterVocabularyService.getAllItems();

    // Verification 1: Exactly matches original counts
    expect(recoveredCards.length).toBe(10);
    expect(recoveredItems.length).toBe(15);

    // Verification 2: Zero duplicate IDs
    const itemIds = recoveredItems.map((it) => it.id);
    const cardIds = recoveredCards.map((c) => c.id);
    expect(new Set(itemIds).size).toBe(15);
    expect(new Set(cardIds).size).toBe(10);

    // Verification 3: Best SRS state preserved (adj-1-masc has review_count = 10 and level = 3)
    const adj1Masc = recoveredItems.find((it) => it.id === 'test-adj-1-masc')!;
    expect(adj1Masc).toBeDefined();
    expect(adj1Masc.review_count).toBe(10);
    expect(adj1Masc.level).toBe(3);

    // Verification 4: User edits preserved
    expect(adj1Masc.format_a?.meaning_en).toBe('adjective 1 English');
    expect(adj1Masc.format_a?.meaning_vi).toBe('tính từ 1 Tiếng Việt');

    // Verification 5: Cross-gender fields cleaned from atomic adjective grammar
    expect((adj1Masc.format_a?.grammar as any)?.feminine).toBeUndefined();
    const adj1Fem = recoveredItems.find((it) => it.id === 'test-adj-1-fem')!;
    expect((adj1Fem.format_a?.grammar as any)?.masculine).toBeUndefined();
  });

  it('2. Multi-reload stability: 10 consecutive reloads never increase card or item counts', () => {
    // Add 1 dual adjective, 1 dual noun, 1 verb, 1 single noun
    masterVocabularyService.addItem({
      id: 'stab-adj',
      surface_form: 'grand / grande',
      part_of_speech: PartOfSpeech.Adjective,
      format_a: {
        entry: 'grand / grande',
        grammar: { pos: PartOfSpeech.Adjective, masculine: 'grand', feminine: 'grande' } as any,
      },
      level: 0,
    } as any);

    masterVocabularyService.addItem({
      id: 'stab-noun-dual',
      surface_form: 'chat / chatte',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Both,
      format_a: {
        entry: 'chat / chatte',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender_choice: 'both',
          masculine_form: { lemma: 'chat', gender: Gender.Masculine },
          feminine_form: { lemma: 'chatte', gender: Gender.Feminine },
        } as any,
      },
      level: 0,
    } as any);

    masterVocabularyService.addItem({
      id: 'stab-single-noun',
      surface_form: 'maison',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Feminine,
      level: 0,
    } as any);

    masterVocabularyService.addItem({
      id: 'stab-verb',
      surface_form: 'manger',
      part_of_speech: PartOfSpeech.Verb,
      level: 0,
    } as any);

    const initialCardCount = masterVocabularyService.getAllCards().length; // 4
    const initialItemCount = masterVocabularyService.getAllItems().length; // 2 + 2 + 1 + 1 = 6
    const initialDueCount = masterVocabularyService.getDueItems().length;

    expect(initialCardCount).toBe(4);
    expect(initialItemCount).toBe(6);

    // Simulate 10 consecutive reloads
    for (let reload = 1; reload <= 10; reload++) {
      (masterVocabularyService as any).loadFromStorage();

      const cardsAfter = masterVocabularyService.getAllCards();
      const itemsAfter = masterVocabularyService.getAllItems();
      const dueAfter = masterVocabularyService.getDueItems();

      expect(cardsAfter.length).toBe(initialCardCount);
      expect(itemsAfter.length).toBe(initialItemCount);
      expect(dueAfter.length).toBe(initialDueCount);

      // Verify no duplicate IDs on any reload
      const itemIds = itemsAfter.map((it) => it.id);
      expect(new Set(itemIds).size).toBe(initialItemCount);

      const cardIds = cardsAfter.map((c) => c.id);
      expect(new Set(cardIds).size).toBe(initialCardCount);
    }
  });

  it('3. Preserves separate vocabulary records with identical spelling but different IDs', () => {
    // E.g. "livre" (noun, masculine - book) and "livre" (noun, feminine - pound)
    masterVocabularyService.addItem({
      id: 'word-livre-book',
      surface_form: 'livre',
      word: 'livre',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Masculine,
      level: 1,
      format_a: { meaning_en: 'book', meaning_vi: 'cuốn sách' },
    } as any);

    masterVocabularyService.addItem({
      id: 'word-livre-pound',
      surface_form: 'livre',
      word: 'livre',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Feminine,
      level: 2,
      format_a: { meaning_en: 'pound', meaning_vi: 'đơn vị cân' },
    } as any);

    expect(masterVocabularyService.getAllCards().length).toBe(2);
    expect(masterVocabularyService.getAllItems().length).toBe(2);

    // Reload multiple times
    (masterVocabularyService as any).loadFromStorage();
    (masterVocabularyService as any).loadFromStorage();

    const cards = masterVocabularyService.getAllCards();
    const items = masterVocabularyService.getAllItems();

    expect(cards.length).toBe(2);
    expect(items.length).toBe(2);

    const book = items.find((i) => i.id === 'word-livre-book')!;
    const pound = items.find((i) => i.id === 'word-livre-pound')!;

    expect(book).toBeDefined();
    expect(book.format_a?.meaning_en).toBe('book');
    expect(book.level).toBe(1);

    expect(pound).toBeDefined();
    expect(pound.format_a?.meaning_en).toBe('pound');
    expect(pound.level).toBe(2);
  });

  it('4. Games continue to retrieve atomic records seamlessly after recovery', () => {
    // Add dual noun and dual adjective
    masterVocabularyService.addItem({
      id: 'game-noun-test',
      surface_form: 'compagnon / compagne',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Both,
      format_a: {
        entry: 'compagnon / compagne',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender_choice: 'both',
          masculine_form: { lemma: 'compagnon', gender: Gender.Masculine },
          feminine_form: { lemma: 'compagne', gender: Gender.Feminine },
        } as any,
      },
      level: 0,
    } as any);

    masterVocabularyService.addItem({
      id: 'game-adj-test',
      surface_form: 'grand / grande',
      part_of_speech: PartOfSpeech.Adjective,
      format_a: {
        entry: 'grand / grande',
        grammar: { pos: PartOfSpeech.Adjective, masculine: 'grand', feminine: 'grande' } as any,
      },
      level: 0,
    } as any);

    // Reload
    (masterVocabularyService as any).loadFromStorage();

    const allItems = masterVocabularyService.getAllItems();
    expect(allItems.length).toBe(4);

    // Test Noun with Gender Engine
    const mascNoun = allItems.find((it) => it.id === 'game-noun-test-masc')!;
    expect(mascNoun).toBeDefined();
    expect(mascNoun.word).toBe('compagnon');

    const qNoun = genderEngine.generateQuestion(mascNoun, allItems);
    expect(qNoun).toBeDefined();
    expect(qNoun.nounFormWithoutArticle).toBe('compagnon');
    expect(qNoun.nounFormWithoutArticle.includes('/')).toBe(false);

    // Test Adjective atomic retrieval
    const mascAdj = allItems.find((it) => it.id === 'game-adj-test-masc')!;
    const femAdj = allItems.find((it) => it.id === 'game-adj-test-fem')!;
    expect(mascAdj).toBeDefined();
    expect(mascAdj.word).toBe('grand');
    expect(femAdj).toBeDefined();
    expect(femAdj.word).toBe('grande');
  });
});
