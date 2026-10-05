import { describe, it, expect, beforeEach } from 'bun:test';
import { gameApplicabilityService } from '../games/gameApplicabilityService';
import { findClozeTargetMatch, clozeEngine } from '../games/engines/clozeEngine';
import { gameSelectionEngine } from '../games/gameSelectionEngine';
import { reviewSessionEngine } from '../reviewSessionEngine';
import { masterVocabularyService } from '../masterVocabularyService';
import { reviewDashboardService } from '../reviewDashboardService';
import { PartOfSpeech, Gender } from '../../models/types';
import { AtomicVocabularyRecord } from '../../models/vocabulary';

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

describe('Regression Tests: Cloze & Review Session Start Crash Prevention (.trim is not a function)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    masterVocabularyService.clearAll();
  });

  it('1. Noun with NounFormItem objects in masculine_form / feminine_form and object plural does not throw .trim is not a function', () => {
    const dualGenderNoun: any = {
      id: 'rec-immigre-masc',
      card_id: 'card-immigre',
      word: 'immigré',
      surface_form: 'immigré',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Masculine,
      level: 1,
      format_a: {
        entry: 'immigré',
        example: {
          french: "C'est un immigré qui s'est bien intégré dans la société.",
          vietnamese: 'Đó là một người nhập cư đã hòa nhập tốt vào xã hội.',
        },
        grammar: {
          pos: PartOfSpeech.Noun,
          gender_choice: 'both',
          lemma: 'immigré',
          underlying_article: 'le',
          masculine_form: {
            lemma: 'immigré',
            gender: Gender.Masculine,
            underlying_article: 'le',
            definite_article: "l'",
            indefinite_article: 'un',
            singular: 'immigré',
            plural: 'immigrés',
          },
          feminine_form: {
            lemma: 'immigrée',
            gender: Gender.Feminine,
            underlying_article: 'la',
            definite_article: "l'",
            indefinite_article: 'une',
            singular: 'immigrée',
            plural: 'immigrées',
          },
          plural: {
            masculine: 'immigrés',
            feminine: 'immigrées',
          },
          forms: {
            masculine: 'immigré',
            feminine: 'immigrée',
          },
        },
      },
    };

    expect(() => {
      const match = findClozeTargetMatch(dualGenderNoun);
      expect(match).not.toBeNull();
      expect(match?.blankAnswer).toBe('immigré');
    }).not.toThrow();

    expect(() => {
      const applicability = gameApplicabilityService.checkApplicability(dualGenderNoun);
      expect(applicability.cloze.isApplicable).toBe(true);
    }).not.toThrow();

    expect(() => {
      const decision = gameSelectionEngine.selectGameForItem(dualGenderNoun, undefined, new Date(), [dualGenderNoun]);
      expect(decision).toBeDefined();
      expect(decision.selectedGame).toBeDefined();
    }).not.toThrow();
  });

  it('2. Feminine counterpart (e.g. immigrée) with structured grammar generates cloze match cleanly', () => {
    const femNoun: any = {
      id: 'rec-immigre-fem',
      card_id: 'card-immigre',
      word: 'immigrée',
      surface_form: 'immigrée',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Feminine,
      level: 1,
      format_a: {
        entry: 'immigrée',
        example: {
          french: "C'est une immigrée qui travaille dur.",
          vietnamese: 'Đó là một người phụ nữ nhập cư làm việc chăm chỉ.',
        },
        grammar: {
          pos: PartOfSpeech.Noun,
          gender_choice: 'both',
          lemma: 'immigrée',
          underlying_article: 'la',
          masculine_form: {
            lemma: 'immigré',
            gender: Gender.Masculine,
            underlying_article: 'le',
          },
          feminine_form: {
            lemma: 'immigrée',
            gender: Gender.Feminine,
            underlying_article: 'la',
          },
          plural: {
            masculine: 'immigrés',
            feminine: 'immigrées',
          },
        },
      },
    };

    const match = findClozeTargetMatch(femNoun);
    expect(match).not.toBeNull();
    expect(match?.blankAnswer).toBe('immigrée');

    const app = gameApplicabilityService.checkApplicability(femNoun);
    expect(app.cloze.isApplicable).toBe(true);
  });

  it('3. Shared-spelling noun (e.g. célibataire) does not throw and identifies cloze sentence', () => {
    const celibataireMasc: any = {
      id: 'rec-celibataire-masc',
      card_id: 'card-celibataire',
      word: 'célibataire',
      surface_form: 'célibataire',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Masculine,
      level: 2,
      format_a: {
        entry: 'célibataire',
        example: {
          french: 'Il préfère rester célibataire pour le moment.',
          vietnamese: 'Anh ấy thích ở độc thân vào thời điểm này.',
        },
        grammar: {
          pos: PartOfSpeech.Noun,
          gender_choice: 'both',
          is_shared_form: true,
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
          plural: {
            shared: 'célibataires',
          },
        },
      },
    };

    const match = findClozeTargetMatch(celibataireMasc);
    expect(match).not.toBeNull();
    expect(match?.blankAnswer).toBe('célibataire');
  });

  it('4. startSession starts successfully with dual-gender items in review queue', () => {
    const item1: any = {
      id: 'rec-immigre-masc',
      card_id: 'card-immigre',
      word: 'immigré',
      surface_form: 'immigré',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Masculine,
      level: 1,
      next_review_at: new Date(Date.now() - 3600000).toISOString(),
      review_count: 1,
      successful_retrievals: 1,
      failed_retrievals: 0,
      current_streak: 1,
      average_response_time: 2000,
      format_a: {
        entry: 'immigré',
        example: {
          french: "C'est un immigré venu en France.",
          vietnamese: 'Đó là một người nhập cư đến Pháp.',
        },
        grammar: {
          pos: PartOfSpeech.Noun,
          masculine_form: { lemma: 'immigré', gender: Gender.Masculine },
          feminine_form: { lemma: 'immigrée', gender: Gender.Feminine },
          plural: { masculine: 'immigrés', feminine: 'immigrées' },
        },
      },
    };

    masterVocabularyService.addAtomicItem(item1);

    const session = reviewSessionEngine.startSession(1, { allowNonDue: true });
    expect(session).not.toBeNull();
    expect(session?.serializedQuestions.length).toBeGreaterThanOrEqual(1);
    expect(session?.serializedQuestions[0].targetItem.surface_form).toBe('immigré');
  });

  it('5. 43 atomic records in localStorage: count is preserved upon reload and 16 due items are accurately calculated', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const futureDate = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    // Create 43 records:
    // 16 due (pastDate or level 0) and 27 not due (futureDate and level > 0)
    // Includes separate masculine/feminine records
    const simulatedItems: AtomicVocabularyRecord[] = [];
    const simulatedCards: any[] = [];

    // Pair 1: immigré (masc) and immigrée (fem) - 2 atomic records, 1 card
    simulatedCards.push({
      id: 'card-immigre',
      display_title: 'immigré / immigrée',
      surface_form: 'immigré / immigrée',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Both,
      atomic_record_ids: ['rec-immigre-masc', 'rec-immigre-fem'],
      level: 1,
      next_review_at: pastDate,
      created_at: now,
      updated_at: now,
    });
    simulatedItems.push({
      id: 'rec-immigre-masc',
      card_id: 'card-immigre',
      word: 'immigré',
      surface_form: 'immigré',
      normalized_form: 'immigre',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Masculine,
      level: 1,
      next_review_at: pastDate, // DUE 1
      review_count: 1,
      successful_retrievals: 1,
      failed_retrievals: 0,
      current_streak: 1,
      average_response_time: 2000,
      format_a: {
        entry: 'immigré',
        example: { french: "C'est un immigré.", english: 'He is an immigrant.' },
        grammar: {
          pos: PartOfSpeech.Noun,
          masculine_form: { lemma: 'immigré', gender: Gender.Masculine, underlying_article: 'le' },
          feminine_form: { lemma: 'immigrée', gender: Gender.Feminine, underlying_article: 'la' },
        },
      } as any,
      created_at: now,
      updated_at: now,
    });
    simulatedItems.push({
      id: 'rec-immigre-fem',
      card_id: 'card-immigre',
      word: 'immigrée',
      surface_form: 'immigrée',
      normalized_form: 'immigree',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Feminine,
      level: 1,
      next_review_at: pastDate, // DUE 2
      review_count: 1,
      successful_retrievals: 1,
      failed_retrievals: 0,
      current_streak: 1,
      average_response_time: 2000,
      format_a: {
        entry: 'immigrée',
        example: { french: "C'est một immigrée.", english: 'She is an immigrant.' },
        grammar: {
          pos: PartOfSpeech.Noun,
          masculine_form: { lemma: 'immigré', gender: Gender.Masculine, underlying_article: 'le' },
          feminine_form: { lemma: 'immigrée', gender: Gender.Feminine, underlying_article: 'la' },
        },
      } as any,
      created_at: now,
      updated_at: now,
    });

    // Pair 2: célibataire (masc) and célibataire (fem) - 2 atomic records, 1 card
    simulatedCards.push({
      id: 'card-celibataire',
      display_title: 'célibataire',
      surface_form: 'célibataire',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Both,
      atomic_record_ids: ['rec-celibataire-masc', 'rec-celibataire-fem'],
      level: 2,
      next_review_at: pastDate,
      created_at: now,
      updated_at: now,
    });
    simulatedItems.push({
      id: 'rec-celibataire-masc',
      card_id: 'card-celibataire',
      word: 'célibataire',
      surface_form: 'célibataire',
      normalized_form: 'celibataire',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Masculine,
      level: 2,
      next_review_at: pastDate, // DUE 3
      review_count: 2,
      successful_retrievals: 2,
      failed_retrievals: 0,
      current_streak: 2,
      average_response_time: 1800,
      format_a: {
        entry: 'célibataire',
        example: { french: 'Un homme célibataire.', english: 'A single man.' },
        grammar: {
          pos: PartOfSpeech.Noun,
          is_shared_form: true,
          masculine_form: { lemma: 'célibataire', gender: Gender.Masculine, underlying_article: 'le' },
          feminine_form: { lemma: 'célibataire', gender: Gender.Feminine, underlying_article: 'la' },
        },
      } as any,
      created_at: now,
      updated_at: now,
    });
    simulatedItems.push({
      id: 'rec-celibataire-fem',
      card_id: 'card-celibataire',
      word: 'célibataire',
      surface_form: 'célibataire',
      normalized_form: 'celibataire',
      part_of_speech: PartOfSpeech.Noun,
      gender: Gender.Feminine,
      level: 2,
      next_review_at: pastDate, // DUE 4
      review_count: 2,
      successful_retrievals: 2,
      failed_retrievals: 0,
      current_streak: 2,
      average_response_time: 1900,
      format_a: {
        entry: 'célibataire',
        example: { french: 'Une femme célibataire.', english: 'A single woman.' },
        grammar: {
          pos: PartOfSpeech.Noun,
          is_shared_form: true,
          masculine_form: { lemma: 'célibataire', gender: Gender.Masculine, underlying_article: 'le' },
          feminine_form: { lemma: 'célibataire', gender: Gender.Feminine, underlying_article: 'la' },
        },
      } as any,
      created_at: now,
      updated_at: now,
    });

    // Add 12 more due items to reach 16 total due items
    for (let i = 5; i <= 16; i++) {
      const id = `rec-word-${i}`;
      const cardId = `card-word-${i}`;
      simulatedCards.push({
        id: cardId,
        display_title: `mot-${i}`,
        surface_form: `mot-${i}`,
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        atomic_record_ids: [id],
        level: 1,
        next_review_at: pastDate,
        created_at: now,
        updated_at: now,
      });
      simulatedItems.push({
        id,
        card_id: cardId,
        word: `mot-${i}`,
        surface_form: `mot-${i}`,
        normalized_form: `mot-${i}`,
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 1,
        next_review_at: pastDate, // DUE
        review_count: 1,
        successful_retrievals: 1,
        failed_retrievals: 0,
        current_streak: 1,
        average_response_time: 1500,
        format_a: {
          entry: `mot-${i}`,
          example: { french: `Voici le mot-${i}.`, english: `Here is word ${i}.` },
          grammar: { pos: PartOfSpeech.Noun, underlying_article: 'le' },
        } as any,
        created_at: now,
        updated_at: now,
      });
    }

    // Add 27 non-due items to reach 43 total atomic records (16 + 27 = 43)
    for (let i = 17; i <= 43; i++) {
      const id = `rec-word-${i}`;
      const cardId = `card-word-${i}`;
      simulatedCards.push({
        id: cardId,
        display_title: `mot-${i}`,
        surface_form: `mot-${i}`,
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        atomic_record_ids: [id],
        level: 2,
        next_review_at: futureDate, // NOT DUE
        review_count: 3,
        successful_retrievals: 3,
        failed_retrievals: 0,
        current_streak: 3,
        average_response_time: 1400,
        created_at: now,
        updated_at: now,
      });
      simulatedItems.push({
        id,
        card_id: cardId,
        word: `mot-${i}`,
        surface_form: `mot-${i}`,
        normalized_form: `mot-${i}`,
        part_of_speech: PartOfSpeech.Noun,
        gender: Gender.Masculine,
        level: 2,
        next_review_at: futureDate, // NOT DUE
        review_count: 3,
        successful_retrievals: 3,
        failed_retrievals: 0,
        current_streak: 3,
        average_response_time: 1400,
        format_a: {
          entry: `mot-${i}`,
          example: { french: `Voici le mot-${i}.`, english: `Here is word ${i}.` },
          grammar: { pos: PartOfSpeech.Noun, underlying_article: 'le' },
        } as any,
        created_at: now,
        updated_at: now,
      });
    }

    expect(simulatedItems.length).toBe(43);

    // Save directly to localStorage as sapience_vocab_items_v1 and sapience_vocab_cards_v1
    localStorage.setItem('sapience_vocab_items_v1', JSON.stringify(simulatedItems));
    localStorage.setItem('sapience_vocab_cards_v1', JSON.stringify(simulatedCards));

    // Reload MasterVocabularyService
    (masterVocabularyService as any).loadFromStorage();

    const loadedItems = masterVocabularyService.getAllItems();
    expect(loadedItems.length).toBe(43);

    // Verify separate masculine and feminine records are strictly preserved and NOT merged
    const immigreMasc = loadedItems.find((it) => it.id === 'rec-immigre-masc');
    const immigreFem = loadedItems.find((it) => it.id === 'rec-immigre-fem');
    expect(immigreMasc).toBeDefined();
    expect(immigreFem).toBeDefined();
    expect(immigreMasc?.surface_form).toBe('immigré');
    expect(immigreFem?.surface_form).toBe('immigrée');

    const celibMasc = loadedItems.find((it) => it.id === 'rec-celibataire-masc');
    const celibFem = loadedItems.find((it) => it.id === 'rec-celibataire-fem');
    expect(celibMasc).toBeDefined();
    expect(celibFem).toBeDefined();
    expect(celibMasc?.gender).toBe(Gender.Masculine);
    expect(celibFem?.gender).toBe(Gender.Feminine);

    // Verify 16 due items are accurately calculated
    const { totalDueCount } = reviewDashboardService.categorizeReviewItems(loadedItems, now);
    expect(totalDueCount).toBe(16);

    // Verify review session starts without any crash
    const session = reviewSessionEngine.startSession(10);
    expect(session).not.toBeNull();
    expect(session?.totalWords).toBeGreaterThanOrEqual(1);
    expect(session?.serializedQuestions.length).toBeGreaterThanOrEqual(1);

    // Verify reloading again does NOT change the count from 43
    (masterVocabularyService as any).loadFromStorage();
    expect(masterVocabularyService.getAllItems().length).toBe(43);
  });
});
