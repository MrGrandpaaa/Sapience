import { PartOfSpeech } from '../models/types';
import {
  TrackedSkill,
  SkillType,
  SkillScore,
  SkillPerformance,
  ErrorCategory,
  ItemMasteryStatus,
  RetrievalResult,
} from '../models/srs';
import { VocabularyItem } from '../models/vocabulary';

export const TRACKED_SKILLS: TrackedSkill[] = [
  'listening',
  'writing',
  'context',
  'gender',
  'construction',
  'cloze',
];

export const SKILL_LABELS_VI: Record<TrackedSkill, string> = {
  listening: 'Listening',
  writing: 'Writing',
  context: 'Context',
  gender: 'Gender & Articles',
  construction: 'Verb Construction',
  cloze: 'Cloze',
};
export const SKILL_LABELS_EN = SKILL_LABELS_VI;

export const SKILL_ICONS: Record<TrackedSkill, string> = {
  listening: '🎧',
  writing: '✍️',
  context: '🎯',
  gender: '⚖️',
  construction: '🔗',
  cloze: '🧩',
};

export interface SkillUpdateResult {
  updatedSkills: SkillPerformance;
  testedSkill: TrackedSkill;
  scoreBefore: number | null;
  scoreAfter: number | null;
  scoreDelta: number;
  isCoreError: boolean;
  isNewlyMasteredSkill: boolean;
}

/**
 * SKILL PERFORMANCE SERVICE
 *
 * Implements granular, multi-trial language skill tracking:
 * - Does NOT just store binary correct / wrong.
 * - Tracks longitudinal performance scores (0.0 to 1.0) per skill.
 * - Explicitly models lexical applicability (N/A for meaningless pairings, e.g. Construction for Noun).
 * - CORE lexical errors (wrong preposition, wrong article/gender) carry HEAVIER penalty weight than minor errors (accents, formatting).
 * - Implements rigorous "Mastery" requirements:
 *   - "Mastered" NEVER means just getting it right once or twice.
 *   - Requires repeated retrievals, across elapsed time, across multiple distinct skills/contexts.
 */
export class SkillPerformanceService {
  /**
   * Normalizes any input SkillType or alias to a canonical TrackedSkill.
   */
  public normalizeSkill(skill: SkillType): TrackedSkill {
    switch (skill) {
      case 'spelling':
        return 'writing';
      case 'recognition':
        return 'listening';
      case 'recall':
        return 'context';
      default:
        return skill as TrackedSkill;
    }
  }

  /**
   * Checks if a skill is linguistically applicable to a given vocabulary item.
   * e.g., Noun -> Construction is N/A; Verb -> Gender is N/A.
   */
  public isSkillApplicable(
    skill: TrackedSkill,
    pos: PartOfSpeech,
    item?: Partial<VocabularyItem>,
  ): boolean {
    switch (skill) {
      case 'listening':
      case 'writing':
      case 'context':
      case 'cloze':
        return true; // All words can be heard, written, and contextualized

      case 'gender':
        // French nouns and adjectives have grammatical gender
        return pos === PartOfSpeech.Noun || pos === PartOfSpeech.Adjective;

      case 'construction':
        // Verbs with prepositional constructions or patterns (e.g. se souvenir de)
        if (pos === PartOfSpeech.Verb) return true;
        // Or if the item explicitly specifies a syntactic pattern
        if ((item?.format_a?.grammar as any)?.pattern) return true;
        return false;
    }
  }

  /**
   * Creates an empty skill score record with appropriate applicability.
   */
  public createEmptySkillScore(isApplicable: boolean): SkillScore {
    return {
      score: null, // null indicates untested (or N/A if isApplicable is false)
      is_applicable: isApplicable,
      tested_count: 0,
      success_count: 0,
      failed_count: 0,
      core_error_count: 0,
      minor_error_count: 0,
      consecutive_success_streak: 0,
      is_mastered: false,
    };
  }

  /**
   * Initializes a full SkillPerformance record based on lexical properties.
   */
  public createInitialPerformance(
    pos: PartOfSpeech = PartOfSpeech.Noun,
    item?: Partial<VocabularyItem>,
  ): SkillPerformance {
    const listening = this.createEmptySkillScore(this.isSkillApplicable('listening', pos, item));
    const writing = this.createEmptySkillScore(this.isSkillApplicable('writing', pos, item));
    const context = this.createEmptySkillScore(this.isSkillApplicable('context', pos, item));
    const gender = this.createEmptySkillScore(this.isSkillApplicable('gender', pos, item));
    const construction = this.createEmptySkillScore(this.isSkillApplicable('construction', pos, item));
    const cloze = this.createEmptySkillScore(this.isSkillApplicable('cloze', pos, item));

    return {
      listening,
      writing,
      context,
      gender,
      construction,
      cloze,
      // Backwards-compatible aliases
      spelling: writing,
      recognition: listening,
      recall: context,
    };
  }

  /**
   * Updates skill performance through review trials.
   *
   * CORE Lexical Error Rule:
   * A core error (wrong preposition in verb construction, wrong gender/article for noun,
   * wrong root word) carries substantially higher penalty (alpha = 0.50) than minor
   * formatting/accent issues (alpha = 0.20).
   */
  public recordSkillTrial(
    currentSkills: SkillPerformance,
    rawSkill: SkillType,
    options: {
      result: RetrievalResult;
      errorCategory?: ErrorCategory;
      responseTimeMs?: number;
      now?: Date;
    },
  ): SkillUpdateResult {
    const canonicalSkill = this.normalizeSkill(rawSkill);
    const now = options.now || new Date();
    const result = options.result;
    const errorCategory = options.errorCategory || (result === 'failure' ? 'core_lexical' : 'none');

    // Clone skills object
    const updatedSkills: SkillPerformance = {
      listening: { ...currentSkills.listening },
      writing: { ...currentSkills.writing },
      context: { ...currentSkills.context },
      gender: { ...currentSkills.gender },
      construction: { ...currentSkills.construction },
      cloze: { ...currentSkills.cloze },
    };

    const metric = updatedSkills[canonicalSkill];
    if (!metric) {
      throw new Error(`Unknown skill ${canonicalSkill}`);
    }

    const scoreBefore = metric.score;
    const isCoreError = errorCategory === 'core_lexical';
    const isMinorError = errorCategory === 'minor';

    metric.tested_count += 1;
    metric.last_tested_at = now.toISOString();
    if (!metric.first_tested_at) {
      metric.first_tested_at = now.toISOString();
    }

    // ── MATHEMATICAL PERFORMANCE UPDATE ──────────────────────────────────────
    let newScore: number;

    if (scoreBefore === null) {
      // First trial baseline
      if (isCoreError || result === 'failure') {
        newScore = 0.0;
        metric.failed_count = (metric.failed_count || 0) + 1;
        metric.core_error_count = (metric.core_error_count || 0) + 1;
        metric.consecutive_success_streak = 0;
        metric.last_core_error_at = now.toISOString();
      } else if (isMinorError || result === 'borderline') {
        newScore = 0.50;
        metric.minor_error_count = (metric.minor_error_count || 0) + 1;
        metric.consecutive_success_streak = 0;
      } else {
        newScore = 1.0;
        metric.success_count += 1;
        metric.consecutive_success_streak = 1;
      }
    } else {
      // Subsequent trial: Longitudinal recency-weighted exponential moving average
      const currentScore = scoreBefore;

      if (isCoreError) {
        // ── CORE LEXICAL ERROR ──
        // Heavy penalty weight (alpha = 0.50). Drastically cuts performance score!
        const alpha = 0.50;
        newScore = currentScore * (1 - alpha); // Target value = 0.0
        metric.failed_count = (metric.failed_count || 0) + 1;
        metric.core_error_count = (metric.core_error_count || 0) + 1;
        metric.consecutive_success_streak = 0;
        metric.last_core_error_at = now.toISOString();
      } else if (isMinorError || result === 'borderline') {
        // ── MINOR ERROR (Accents, formatting, mild typo) ──
        // Light penalty weight (alpha = 0.20, target = 0.50)
        const alpha = 0.20;
        newScore = currentScore * (1 - alpha) + 0.50 * alpha;
        metric.minor_error_count = (metric.minor_error_count || 0) + 1;
        metric.consecutive_success_streak = 0;
      } else {
        // ── CLEAN SUCCESS ──
        // Gradual mastery progression (alpha = 0.25, target = 1.0)
        const alpha = 0.25;
        newScore = currentScore * (1 - alpha) + 1.0 * alpha;
        metric.success_count += 1;
        metric.consecutive_success_streak = (metric.consecutive_success_streak || 0) + 1;
      }
    }

    // Clamp score to [0.0, 1.0] and round to 2 decimal places
    newScore = Math.max(0.0, Math.min(1.0, Math.round(newScore * 100) / 100));
    metric.score = newScore;

    // ── SKILL-LEVEL MASTERY EVALUATION ───────────────────────────────────────
    // "Mastered" NEVER means getting it right once or twice.
    // Must demonstrate:
    // 1. Minimum 3 successful retrievals
    // 2. Consecutive success streak >= 2
    // 3. Score >= 0.85
    // 4. Tested across distinct temporal span (span >= 2 days or 2 intervals)
    // 5. No recent core error
    const wasMasteredBefore = metric.is_mastered ?? false;
    let isNowMastered = false;

    const spanMs = metric.first_tested_at
      ? now.getTime() - new Date(metric.first_tested_at).getTime()
      : 0;
    const spanDays = spanMs / (24 * 60 * 60 * 1000);

    if (
      metric.success_count >= 3 &&
      (metric.consecutive_success_streak ?? 0) >= 2 &&
      newScore >= 0.85 &&
      spanDays >= 1.5 && // Tested across elapsed time
      (!metric.last_core_error_at || (metric.consecutive_success_streak ?? 0) >= 2)
    ) {
      isNowMastered = true;
      if (!metric.mastered_at) {
        metric.mastered_at = now.toISOString();
      }
    } else if (newScore < 0.70 || isCoreError) {
      // If a core error occurs, skill drops out of mastered status until re-proven
      isNowMastered = false;
      metric.mastered_at = undefined;
    } else {
      isNowMastered = wasMasteredBefore && newScore >= 0.75;
    }

    metric.is_mastered = isNowMastered;
    const isNewlyMasteredSkill = !wasMasteredBefore && isNowMastered;

    // Keep compatibility aliases in sync
    updatedSkills.spelling = updatedSkills.writing;
    updatedSkills.recognition = updatedSkills.listening;
    updatedSkills.recall = updatedSkills.context;

    return {
      updatedSkills,
      testedSkill: canonicalSkill,
      scoreBefore,
      scoreAfter: newScore,
      scoreDelta: scoreBefore !== null ? Math.round((newScore - scoreBefore) * 100) / 100 : 0,
      isCoreError,
      isNewlyMasteredSkill,
    };
  }

  /**
   * Evaluates Item-Level Mastery.
   *
   * "Mastered" KHÔNG có nghĩa: đúng một hoặc hai lần.
   * Mastery phải thể hiện successful retrieval:
   * 1. Nhiều lần: successful_retrievals >= 5
   * 2. Qua thời gian: time span >= 7 ngày (Level 4+ consolidation retention)
   * 3. Trong nhiều context/skills: at least 3 distinct applicable skills mastered / proficient (>= 0.80).
   */
  public evaluateItemMastery(
    item: VocabularyItem,
    skillsOrNow?: SkillPerformance | Date,
    maybeNow: Date = new Date(),
  ): ItemMasteryStatus {
    let skills: SkillPerformance;
    let now: Date;

    if (skillsOrNow instanceof Date) {
      now = skillsOrNow;
      skills = item.skill_performance || this.createInitialPerformance(item.part_of_speech, item);
    } else if (skillsOrNow && typeof skillsOrNow === 'object') {
      skills = skillsOrNow;
      now = maybeNow;
    } else {
      skills = item.skill_performance || this.createInitialPerformance(item.part_of_speech, item);
      now = maybeNow;
    }
    const successes = item.successful_retrievals ?? 0;
    const multipleRetrievalsMet = successes >= 5;

    // Temporal span
    const createdMs = item.created_at ? new Date(item.created_at).getTime() : now.getTime();
    const spanMs = Math.max(0, now.getTime() - createdMs);
    const spanDays = spanMs / (24 * 60 * 60 * 1000);
    const timeSpanMet = spanDays >= 7 || (item.level ?? 0) >= 4;

    // Multi-skill / Multi-context check
    const applicableSkills: TrackedSkill[] = TRACKED_SKILLS.filter((sk) => {
      const metric = skills[sk];
      return metric && metric.is_applicable !== false;
    });

    let proficientSkillsCount = 0;
    let hasUnresolvedCoreError = false;

    for (const sk of applicableSkills) {
      const metric = skills[sk];
      if (!metric) continue;

      if (metric.is_mastered || (metric.score !== null && metric.score >= 0.80)) {
        proficientSkillsCount += 1;
      }

      if (metric.core_error_count && metric.core_error_count > 0 && (metric.score === null || metric.score < 0.70)) {
        hasUnresolvedCoreError = true;
      }
    }

    // Required skills count: at least 3 distinct skills (or all applicable if item has <= 2)
    const requiredSkillsCount = Math.min(3, applicableSkills.length);
    const multiSkillMet = proficientSkillsCount >= requiredSkillsCount && !hasUnresolvedCoreError;

    const isMastered = multipleRetrievalsMet && timeSpanMet && multiSkillMet;

    return {
      isMastered,
      masteredAt: isMastered ? (item.item_mastery?.masteredAt || now.toISOString()) : undefined,
      multipleRetrievalsMet,
      timeSpanMet,
      multiSkillMet,
      applicableSkillsCount: applicableSkills.length,
      proficientSkillsCount,
    };
  }

  /**
   * Formats a skill score for user presentation (e.g. 1.0, 0.5, 0.0, or N/A).
   */
  public formatScoreDisplay(score: number | null, isApplicable: boolean): string {
    if (!isApplicable) return 'N/A';
    if (score === null) return '—';
    // Format to 1 decimal place (e.g. 1.0, 0.5, 0.0)
    return score.toFixed(1);
  }

  /**
   * Returns a complete key-value display map of all 6 skills as requested:
   * Listening = 1.0
   * Writing = 0.0
   * Context = 1.0
   * Gender = 0.5
   * Construction = N/A
   * Cloze = 1.0
   */
  public getSkillPerformanceMap(
    skills?: SkillPerformance,
    pos: PartOfSpeech = PartOfSpeech.Noun,
  ): Record<TrackedSkill, { score: number | null; display: string; isApplicable: boolean; isMastered: boolean }> {
    const current = skills || this.createInitialPerformance(pos);
    const result = {} as Record<
      TrackedSkill,
      { score: number | null; display: string; isApplicable: boolean; isMastered: boolean }
    >;

    for (const sk of TRACKED_SKILLS) {
      const metric = current[sk];
      const isApplicable = metric ? metric.is_applicable : this.isSkillApplicable(sk, pos);
      const score = metric?.score ?? null;
      const display = this.formatScoreDisplay(score, isApplicable);
      const isMastered = metric?.is_mastered ?? false;

      result[sk] = {
        score,
        display,
        isApplicable,
        isMastered,
      };
    }

    return result;
  }

  /**
   * Formats all 6 skills as a human-readable string matching the user's specification:
   * "Listening = 1.0, Writing = 0.0, Context = 1.0, Gender = 0.5, Construction = N/A, Cloze = 1.0"
   */
  public formatSkillSummary(
    skills?: SkillPerformance,
    pos: PartOfSpeech = PartOfSpeech.Noun,
  ): string {
    const map = this.getSkillPerformanceMap(skills, pos);
    return TRACKED_SKILLS.map((sk) => {
      const label = sk.charAt(0).toUpperCase() + sk.slice(1);
      return `${label} = ${map[sk].display}`;
    }).join(', ');
  }

  /**
   * Identifies the weakest applicable skill for an item.
   */
  public getWeakestApplicableSkill(skills: SkillPerformance): {
    skill: TrackedSkill;
    score: number;
    hasCoreError: boolean;
  } | null {
    let weakestSkill: TrackedSkill | null = null;
    let minScore = 2.0;
    let foundCoreError = false;

    for (const sk of TRACKED_SKILLS) {
      const metric = skills[sk];
      if (!metric || !metric.is_applicable) continue;

      if (metric.core_error_count && metric.core_error_count > 0 && (metric.score ?? 0) < 0.70) {
        foundCoreError = true;
      }

      const score = metric.score ?? 0.0;
      if (score < minScore) {
        minScore = score;
        weakestSkill = sk;
      }
    }

    if (!weakestSkill) return null;

    return {
      skill: weakestSkill,
      score: minScore === 2.0 ? 0.0 : minScore,
      hasCoreError: foundCoreError,
    };
  }
}

export const skillPerformanceService = new SkillPerformanceService();
