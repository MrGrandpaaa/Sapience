/**
 * Spaced Repetition / Memory State Models.
 *
 * Models the learner's cognitive memory state (NOT word difficulty).
 *
 * 6 Memory States:
 * Level 0 — New (Immediately at input)
 * Level 1 — Initial Encoding (10 minutes)
 * Level 2 — Early Retention (1 day)
 * Level 3 — Intermediate Retention (3 days)
 * Level 4 — Consolidated Retention (7 days)
 * Level 5 — Long-Term Retention (21 days -> Maintenance: 45 -> 90 -> 180 -> adaptive)
 */

export type MemoryLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type RetrievalResult = 'success' | 'borderline' | 'failure';

/**
 * 6 Core tracked language skills as specified by the curriculum:
 * - listening: Auditory perception and word recognition
 * - writing: Spelling, accents, apostrophes, and accurate production (Game 1)
 * - context: Pragmatic context, nuance distinction, and usage (Game 3)
 * - gender: Grammatical gender and article association (Game 4)
 * - construction: Prepositions and verb syntactic patterns (Game 5)
 * - cloze: Contextual cloze passage integration and collocation (Game 6)
 */
export type TrackedSkill =
  | 'listening'
  | 'writing'
  | 'context'
  | 'gender'
  | 'construction'
  | 'cloze';

export type SkillType =
  | TrackedSkill
  | 'spelling'      // alias for writing
  | 'recognition'   // alias for listening
  | 'recall';       // alias for context/recall

export type ErrorCategory = 'none' | 'minor' | 'core_lexical';

export interface SkillScore {
  score: number | null; // 0.0 to 1.0 (null if N/A or not yet tested)
  is_applicable: boolean; // false if not applicable for this item (e.g. Construction for Noun, Gender for Verb)
  tested_count: number;
  success_count: number;
  failed_count?: number;
  core_error_count?: number; // Core lexical error (wrong preposition, wrong article/gender, wrong root)
  minor_error_count?: number; // Minor mistake (accent, spacing, typo)
  consecutive_success_streak?: number;
  first_tested_at?: string;
  last_tested_at?: string;
  last_core_error_at?: string;
  is_mastered?: boolean;
  mastered_at?: string;
}

export interface SkillPerformance {
  listening: SkillScore;
  writing: SkillScore;
  context: SkillScore;
  gender: SkillScore;
  construction: SkillScore;
  cloze: SkillScore;
  // Aliases for compatibility
  spelling?: SkillScore;
  recognition?: SkillScore;
  recall?: SkillScore;
}

export interface ItemMasteryStatus {
  isMastered: boolean;
  masteredAt?: string;
  multipleRetrievalsMet: boolean; // >= 5 successful retrievals
  timeSpanMet: boolean; // >= 7 days span
  multiSkillMet: boolean; // >= 3 distinct applicable skills mastered/proficient
  applicableSkillsCount: number;
  proficientSkillsCount: number;
}

export interface SrsMemoryData {
  level: MemoryLevel;
  last_review_at?: string | null;
  next_review_at: string;
  review_count: number;
  successful_retrievals: number;
  failed_retrievals: number;
  current_streak: number;
  average_response_time: number; // in milliseconds
  skill_performance: SkillPerformance;
  maintenance_stage?: number; // 0: 21d, 1: 45d, 2: 90d, 3: 180d, 4+: adaptive
  item_mastery?: ItemMasteryStatus;
}

export interface RetrievalEvaluationInput {
  result: RetrievalResult;
  responseTimeMs?: number;
  testedSkill?: SkillType;
  failureSeverity?: 'mild' | 'severe';
  errorCategory?: ErrorCategory; // 'none' | 'minor' | 'core_lexical'
  errorDescription?: string;
}

export interface MemoryStateMeta {
  level: MemoryLevel;
  code: string;
  name: string;
  vietnameseName: string;
  description: string;
  baselineIntervalMs: number;
  baselineIntervalLabel: string;
  badgeColor: string;
}

export const MEMORY_LEVELS_META: Record<MemoryLevel, MemoryStateMeta> = {
  0: {
    level: 0,
    code: 'new',
    name: 'New',
    vietnameseName: 'Mục từ mới (New)',
    description: 'Vừa nhập vào hệ thống, cần thực hiện initial retrieval ngay lập tức',
    baselineIntervalMs: 0,
    baselineIntervalLabel: 'Ngay lập tức',
    badgeColor: '#6b7280',
  },
  1: {
    level: 1,
    code: 'encoding',
    name: 'Initial Encoding',
    vietnameseName: 'Ghi nhận ban đầu (Initial Encoding)',
    description: 'Đã hoàn thành mã hóa ban đầu, cần ôn tập ngắn hạn',
    baselineIntervalMs: 10 * 60 * 1000, // 10 minutes
    baselineIntervalLabel: '10 phút',
    badgeColor: '#ef4444',
  },
  2: {
    level: 2,
    code: 'early',
    name: 'Early Retention',
    vietnameseName: 'Ghi nhớ sơ khởi (Early Retention)',
    description: 'Dấu vết trí nhớ ngắn hạn sau bài test 10 phút',
    baselineIntervalMs: 24 * 60 * 60 * 1000, // 1 day
    baselineIntervalLabel: '1 ngày',
    badgeColor: '#f97316',
  },
  3: {
    level: 3,
    code: 'intermediate',
    name: 'Intermediate Retention',
    vietnameseName: 'Ghi nhớ trung gian (Intermediate Retention)',
    description: 'Dấu vết trí nhớ ổn định sau 1 ngày',
    baselineIntervalMs: 3 * 24 * 60 * 60 * 1000, // 3 days
    baselineIntervalLabel: '3 ngày',
    badgeColor: '#d97706',
  },
  4: {
    level: 4,
    code: 'consolidated',
    name: 'Consolidated Retention',
    vietnameseName: 'Ghi nhớ củng cố (Consolidated Retention)',
    description: 'Trí nhớ củng cố vững vàng',
    baselineIntervalMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    baselineIntervalLabel: '7 ngày',
    badgeColor: '#2563eb',
  },
  5: {
    level: 5,
    code: 'long_term',
    name: 'Long-Term Retention',
    vietnameseName: 'Ghi nhớ dài hạn (Long-Term Retention)',
    description: 'Đạt trí nhớ dài hạn, bước vào chu kỳ duy trì',
    baselineIntervalMs: 21 * 24 * 60 * 60 * 1000, // 21 days
    baselineIntervalLabel: '21 ngày',
    badgeColor: '#059669',
  },
};

/**
 * Maintenance intervals (in days) after achieving Level 5
 */
export const MAINTENANCE_INTERVALS_DAYS = [45, 90, 180];
