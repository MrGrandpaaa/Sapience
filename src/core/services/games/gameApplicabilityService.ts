import { VocabularyItem } from '../../models/vocabulary';
import { PartOfSpeech } from '../../models/types';
import { GameApplicability, GameType } from '../../models/games';
import { findClozeTargetMatch } from './engines/clozeEngine';
import { getConjugationUnitsList } from '../verbConjugationService';

/**
 * Service to evaluate which games apply to a given VocabularyItem.
 *
 * Rules:
 * - Listening -> Writing: ALL items
 * - Listening -> MCQ: ALL items
 * - Context Selection: ALL items (especially with contextual examples/ambiguity)
 * - Gender: NOUNS only (requires gender / article retrieval)
 * - Verb Conjugation: VERBS only (requires verb conjugation retrieval)
 * - Cloze: ALL items with user-entered example sentences containing the target word
 */
export class GameApplicabilityService {
  /**
   * Evaluates whether Cloze game is unlocked across the vocabulary list.
   * Specification:
   * CLOZE is unlocked ONLY when:
   * - There are at least 5 saved vocabulary items
   * - AND all 5 items must reach Level 1 or higher (item.level >= 1)
   * - Level 0 does NOT count.
   */
  public getClozeUnlockStatus(items: VocabularyItem[] = []): {
    isUnlocked: boolean;
    countLevel1Plus: number;
    requiredCount: number;
    progressText: string;
    lockMessage: string;
  } {
    const countLevel1Plus = items.filter((it) => (it.level ?? 0) >= 1).length;
    const requiredCount = 5;
    const isUnlocked = countLevel1Plus >= requiredCount;

    return {
      isUnlocked,
      countLevel1Plus,
      requiredCount,
      progressText: `${Math.min(countLevel1Plus, requiredCount)} / ${requiredCount}`,
      lockMessage: 'Learn at least 5 words and reach Level 1 to unlock this game.',
    };
  }

  public checkApplicability(
    item: VocabularyItem,
    allItems?: VocabularyItem[],
  ): Record<GameType, GameApplicability> {
    const isNoun = item.part_of_speech === PartOfSpeech.Noun;
    const isVerb = item.part_of_speech === PartOfSpeech.Verb;

    const hasConjugationData =
      isVerb &&
      getConjugationUnitsList(item).some((u) => Boolean(u.conjugated_form?.trim()));

    const clozeMatch = findClozeTargetMatch(item);
    const hasValidClozeExample = clozeMatch !== null;

    const clozeUnlock = allItems ? this.getClozeUnlockStatus(allItems) : null;
    const isClozeUnlocked = clozeUnlock ? clozeUnlock.isUnlocked : true;

    return {
      listening_writing: {
        gameType: 'listening_writing',
        isApplicable: true,
        reason: 'Áp dụng cho mọi từ vựng: Nghe phát âm và viết lại chính tả, dấu phụ và mạo từ.',
      },
      listening_mcq: {
        gameType: 'listening_mcq',
        isApplicable: true,
        reason: 'Áp dụng cho mọi từ vựng: Nghe phát âm và nhận diện giữa 4 lựa chọn.',
      },
      matching: {
        gameType: 'matching',
        isApplicable: true,
        reason:
          'Áp dụng cho mọi từ vựng: Nối từ tiếng Pháp với nghĩa tiếng Anh hoặc ngược lại.',
      },
      gender: {
        gameType: 'gender',
        isApplicable: isNoun,
        reason: isNoun
          ? 'Áp dụng cho danh từ: Kiểm tra giống đực/cái (masculin/féminin) và mạo từ tương ứng.'
          : 'N/A — Chỉ áp dụng cho danh từ (Noun).',
      },
      verb_conjugation: {
        gameType: 'verb_conjugation',
        isApplicable: hasConjugationData,
        reason: !isVerb
          ? 'N/A — Chỉ áp dụng cho động từ (Verb).'
          : hasConjugationData
          ? 'Áp dụng cho động từ: Luyện tập chia động từ theo 3 chế độ (Infinitive → Conjugated, Conjugated → Infinitive, Audio → Verb + Person).'
          : 'N/A — Động từ chưa có dữ liệu chia động từ.',
      },
      cloze: {
        gameType: 'cloze',
        isApplicable: hasValidClozeExample && isClozeUnlocked,
        reason: !isClozeUnlocked
          ? (clozeUnlock?.lockMessage || 'Learn at least 5 words and reach Level 1 to unlock this game.')
          : hasValidClozeExample
          ? 'Áp dụng cho từ vựng có ngữ cảnh: Điền từ vào chỗ trống trong đoạn văn ví dụ.'
          : 'N/A — Cần ít nhất 1 câu ví dụ đã lưu chứa từ vựng để tạo bài tập điền khuyết.',
      },
      ...({
        verb_construction: {
          gameType: 'verb_construction' as any,
          isApplicable: false,
          reason: 'N/A — Đã thay thế bởi Verb Conjugation.',
        },
      } as any),
    };
  }

  /**
   * Returns list of GameTypes that can be played for the given item.
   */
  public getApplicableGames(item: VocabularyItem, allItems?: VocabularyItem[]): GameType[] {
    const report = this.checkApplicability(item, allItems);
    return (Object.keys(report) as GameType[]).filter(
      (type) => report[type].isApplicable,
    );
  }

  /**
   * Checks whether a specific game type is valid for an item.
   */
  public isGameApplicable(item: VocabularyItem, gameType: GameType, allItems?: VocabularyItem[]): boolean {
    return this.checkApplicability(item, allItems)[gameType].isApplicable;
  }
}

export const gameApplicabilityService = new GameApplicabilityService();
