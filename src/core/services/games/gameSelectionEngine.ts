import { VocabularyItem } from '../../models/vocabulary';
import { PartOfSpeech } from '../../models/types';
import { GameType } from '../../models/games';
import { SkillType } from '../../models/srs';
import { gameApplicabilityService } from './gameApplicabilityService';

export interface CandidateGameScore {
  gameType: GameType;
  score: number;
  isApplicable: boolean;
  reasons: string[];
}

export interface GameSelectionDecision {
  selectedGame: GameType;
  selectionReason: string;
  supportLevel: 'high_support' | 'medium_support' | 'low_support';
  candidateScores: CandidateGameScore[];
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GAME SELECTION ENGINE
 *
 * The learner DOES NOT manually select games per review item.
 * The algorithm adaptively determines the optimal game based on:
 *
 * 1. Weak skills / previous errors (Highest priority)
 * 2. Untested / stale skills (Skills not tested recently)
 * 3. Current memory level (Low: basic + more support; High: contextual + less support)
 * 4. Lexical properties of the item (Skip meaningless games, e.g. gender for verbs)
 *
 * Never requires all games to be played. Skips irrelevant games. Fully deterministic & adaptive.
 */
export class GameSelectionEngine {
  /**
   * Evaluates all games for an item and selects the optimal game.
   */
  public selectGameForItem(
    item: VocabularyItem,
    recentGameType?: GameType,
    now: Date = new Date(),
    allItems?: VocabularyItem[],
  ): GameSelectionDecision {
    const isNoun = item.part_of_speech === PartOfSpeech.Noun;
    const isVerb = item.part_of_speech === PartOfSpeech.Verb;
    const level = item.level ?? 0;
    const skills = item.skill_performance;

    const applicability = gameApplicabilityService.checkApplicability(item, allItems);

    const candidateScores: CandidateGameScore[] = [];

    const allGames: GameType[] = [
      'listening_writing',
      'listening_mcq',
      'matching',
      'gender',
      'verb_conjugation',
      'cloze',
    ];

    for (const game of allGames) {
      const app = applicability[game];

      // ── TIER 4: LEXICAL PROPERTIES FILTER ──────────────────────────────────
      // If the game has no linguistic sense for this item, strictly disqualify it (-Infinity)
      if (!app.isApplicable) {
        candidateScores.push({
          gameType: game,
          score: -Infinity,
          isApplicable: false,
          reasons: [app.reason],
        });
        continue;
      }

      let totalScore = 0;
      const reasons: string[] = [];

      // Determine primary and secondary skills tested by this game
      const { primarySkill, secondarySkill } = this.getSkillsForGame(game, item);

      // ── TIER 1: WEAK SKILLS & PREVIOUS ERRORS ──────────────────────────────
      const primaryPerf = skills ? (skills as any)[primarySkill] : null;

      if (primaryPerf && primaryPerf.tested_count > 0) {
        const perfScore = primaryPerf.score !== null ? primaryPerf.score : (primaryPerf.success_count / primaryPerf.tested_count);
        const hasCoreError = (primaryPerf.core_error_count ?? 0) > 0 && perfScore < 0.75;

        if (hasCoreError) {
          // Urgent priority to fix core lexical error (e.g. wrong preposition on verb construction / conjugation)
          const coreBonus = 6500;
          totalScore += coreBonus;
          reasons.push(
            `Remediate core error: ${this.getSkillNameVi(primarySkill)} (Score: ${perfScore.toFixed(1)}, +${coreBonus}pts)`,
          );
        } else if (perfScore <= 0.60) {
          const weakScore = Math.round((1.0 - perfScore) * 5500);
          totalScore += weakScore;
          reasons.push(
            `Weak skill: ${this.getSkillNameVi(primarySkill)} (Score: ${perfScore.toFixed(1)}, +${weakScore}pts)`,
          );
        }
      }

      // Secondary skill error bonus (e.g. Cloze testing construction)
      if (secondarySkill && skills) {
        const secPerf = (skills as any)[secondarySkill];
        if (secPerf && secPerf.tested_count > 0) {
          const secScore = secPerf.score !== null ? secPerf.score : (secPerf.success_count / secPerf.tested_count);
          if (secScore <= 0.60 || (secPerf.core_error_count ?? 0) > 0) {
            const secWeakScore = 3000;
            totalScore += secWeakScore;
            reasons.push(
              `Reinforce secondary skill: ${this.getSkillNameVi(secondarySkill)} (+${secWeakScore}pts)`,
            );
          }
        }
      }

      // ── TIER 2: SKILLS NOT TESTED RECENTLY (STALENESS & MASTERY COVERAGE) ──
      if (!primaryPerf || primaryPerf.tested_count === 0 || primaryPerf.score === null) {
        // Untested skill needs initial diagnostic test
        const untestedScore = 2500;
        totalScore += untestedScore;
        reasons.push(`Untested skill: ${this.getSkillNameVi(primarySkill)} (+${untestedScore}pts)`);
      } else if (!primaryPerf.is_mastered && level >= 3) {
        // At higher levels, prioritize unmastered skills to satisfy multi-skill mastery
        const masteryTargetScore = 2000;
        totalScore += masteryTargetScore;
        reasons.push(`Target multi-skill mastery: ${this.getSkillNameVi(primarySkill)} (+${masteryTargetScore}pts)`);
      } else if (primaryPerf.last_tested_at) {
        const elapsedDays = (now.getTime() - new Date(primaryPerf.last_tested_at).getTime()) / ONE_DAY_MS;
        if (elapsedDays >= 1) {
          const staleScore = Math.min(2000, Math.round(elapsedDays * 200));
          totalScore += staleScore;
          reasons.push(`Untested for ${Math.floor(elapsedDays)} days (+${staleScore}pts)`);
        }
      }

      // ── TIER 3: CURRENT MEMORY LEVEL ALIGNMENT ─────────────────────────────
      // Level 0, 1, 2 -> Basic retrieval + more support
      // Level 3, 4, 5 -> Contextual retrieval + less support
      if (level <= 2) {
        // Low level priorities
        if (game === 'listening_mcq') {
          const bonus = level === 0 ? 3000 : level === 1 ? 2200 : 1200;
          totalScore += bonus;
          reasons.push(`Level ${level}: Basic audio recognition (+${bonus}pts)`);
        } else if (game === 'gender' && isNoun) {
          const bonus = 2400;
          totalScore += bonus;
          reasons.push(`Level ${level}: Gender & article encoding (+${bonus}pts)`);
        } else if (game === 'verb_conjugation' && isVerb) {
          const bonus = 2500;
          totalScore += bonus;
          reasons.push(`Level ${level}: Verb conjugation encoding (+${bonus}pts)`);
        } else if (game === 'listening_writing') {
          totalScore += 1000;
          reasons.push(`Level ${level}: Guided transcription (+1000pts)`);
        } else {
          totalScore += 200;
        }
      } else {
        // High level priorities (Level 3, 4, 5)
        if (game === 'matching') {
          const bonus = 2800;
          totalScore += bonus;
          reasons.push(`Level ${level}: Vocabulary matching (+${bonus}pts)`);
        } else if (game === 'cloze') {
          const bonus = 2600;
          totalScore += bonus;
          reasons.push(`Level ${level}: Natural passage fill-in (+${bonus}pts)`);
        } else if (game === 'listening_writing') {
          const bonus = 2000;
          totalScore += bonus;
          reasons.push(`Level ${level}: Independent writing retrieval (+${bonus}pts)`);
        } else if (game === 'verb_conjugation' && isVerb) {
          const constrPerf = skills?.construction;
          const hasConstrError = constrPerf && constrPerf.tested_count > 0 && (constrPerf.success_count / constrPerf.tested_count) < 0.7;
          const bonus = hasConstrError ? 3000 : 1500;
          totalScore += bonus;
          reasons.push(`Level ${level}: Active verb conjugation retrieval (+${bonus}pts)`);
        } else {
          totalScore += 300;
        }
      }

      // ── SPECIAL SEQUENCING / RECENCY ADAPTATION ────────────────────────────
      // If user recently tested with Verb Conjugation, boost Cloze to test forms in context!
      if (recentGameType === 'verb_conjugation' && game === 'cloze' && isVerb) {
        totalScore += 3500;
        reasons.push('Follow-up to verb conjugation: Test forms in context (+3500pts)');
      }

      // Penalty for playing the EXACT same game repeatedly in consecutive turns
      if (recentGameType === game) {
        totalScore -= 2500;
        reasons.push('Deprioritized due to immediate repetition (-2500pts)');
      }

      candidateScores.push({
        gameType: game,
        score: totalScore,
        isApplicable: true,
        reasons,
      });
    }

    // Sort candidate games by total score descending
    candidateScores.sort((a, b) => b.score - a.score);

    // Pick top scoring applicable game
    const bestCandidate = candidateScores.find((c) => c.isApplicable && c.score > -Infinity);
    const selectedGame: GameType = bestCandidate ? bestCandidate.gameType : 'listening_mcq';

    // Support level: Level 0-1 (High support), Level 2 (Medium), Level 3-5 (Low support)
    const supportLevel: 'high_support' | 'medium_support' | 'low_support' =
      level <= 1 ? 'high_support' : level === 2 ? 'medium_support' : 'low_support';

    const selectionReason = bestCandidate && bestCandidate.reasons.length > 0
      ? bestCandidate.reasons[0]
      : 'Algorithm selected optimal review exercise for current memory level.';

    return {
      selectedGame,
      selectionReason,
      supportLevel,
      candidateScores,
    };
  }

  private getSkillsForGame(
    game: GameType,
    item: VocabularyItem,
  ): { primarySkill: SkillType; secondarySkill?: SkillType } {
    switch (game) {
      case 'listening_writing':
        return { primarySkill: 'writing', secondarySkill: 'listening' };
      case 'listening_mcq':
        return { primarySkill: 'listening', secondarySkill: 'context' };
      case 'matching':
        return { primarySkill: 'context', secondarySkill: 'writing' };
      case 'gender':
        return { primarySkill: 'gender', secondarySkill: 'writing' };
      case 'verb_conjugation':
        return { primarySkill: 'construction', secondarySkill: 'writing' };
      case 'cloze':
        // If verb, tests context primarily, with construction as secondary
        if (item.part_of_speech === PartOfSpeech.Verb) {
          return { primarySkill: 'cloze', secondarySkill: 'construction' };
        }
        return { primarySkill: 'cloze', secondarySkill: 'writing' };
    }
  }

  private getSkillNameVi(skill: SkillType): string {
    const names: Record<string, string> = {
      writing: 'Writing',
      spelling: 'Spelling & Accents',
      listening: 'Listening',
      context: 'Context & Meaning',
      gender: 'Gender & Articles',
      construction: 'Verb Construction',
      cloze: 'Cloze',
      recognition: 'Recognition',
      recall: 'Memory Retrieval',
    };
    return names[skill] || skill;
  }
}

export const gameSelectionEngine = new GameSelectionEngine();
