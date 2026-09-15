import React from 'react';
import { VocabularyItem } from '../core/models/vocabulary';
import { TrackedSkill } from '../core/models/srs';
import {
  skillPerformanceService,
  TRACKED_SKILLS,
  SKILL_ICONS,
} from '../core/services/skillPerformanceService';
import './SkillPerformanceBadge.css';

interface SkillPerformanceBadgeProps {
  item: VocabularyItem;
  compact?: boolean; // compact row on card vs expanded breakdown
  showMasteryBadge?: boolean;
}

export function SkillPerformanceBadge({
  item,
  compact = true,
  showMasteryBadge = true,
}: SkillPerformanceBadgeProps) {
  const skillMap = skillPerformanceService.getSkillPerformanceMap(
    item.skill_performance,
    item.part_of_speech,
  );

  const isItemMastered = item.item_mastery?.isMastered ?? false;

  const getScoreColorClass = (score: number | null, isApplicable: boolean) => {
    if (!isApplicable) return 'skill-na';
    if (score === null) return 'skill-untested';
    if (score >= 0.85) return 'skill-mastered';
    if (score >= 0.5) return 'skill-learning';
    return 'skill-weak';
  };

  const getSkillEnglishLabel = (sk: TrackedSkill): string => {
    switch (sk) {
      case 'listening':
        return 'Listening';
      case 'writing':
        return 'Writing';
      case 'context':
        return 'Context';
      case 'gender':
        return 'Gender';
      case 'construction':
        return 'Construction';
      case 'cloze':
        return 'Cloze';
      default:
        return sk;
    }
  };

  if (compact) {
    return (
      <div className="skill-matrix-container">
        <div className="skill-matrix-header">
          <span className="skill-matrix-title">Skill Performance:</span>
          {showMasteryBadge && isItemMastered && (
            <span className="item-mastered-pill" title="Vocabulary reached Mastered standard across multiple sessions, time, and diverse skills">
              ★ Mastered
            </span>
          )}
        </div>

        <div className="skill-pills-row">
          {TRACKED_SKILLS.map((sk) => {
            const data = skillMap[sk];
            const icon = SKILL_ICONS[sk];
            const label = getSkillEnglishLabel(sk);
            const colorClass = getScoreColorClass(data.score, data.isApplicable);

            return (
              <div
                key={sk}
                className={`skill-pill ${colorClass}`}
                title={`${label}: ${data.display} ${
                  !data.isApplicable
                    ? '(Not applicable for this part of speech)'
                    : data.isMastered
                    ? '(Skill mastered)'
                    : ''
                }`}
              >
                <span className="skill-icon">{icon}</span>
                <span className="skill-name">{label}</span>
                <span className="skill-sep">=</span>
                <span className="skill-val">{data.display}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Expanded Detailed View
  return (
    <div className="skill-matrix-detailed">
      <div className="detailed-header">
        <h4 className="detailed-title">Skill Performance Tracking</h4>
        {isItemMastered && (
          <span className="item-mastered-badge-large">
            ★ Item Mastered
          </span>
        )}
      </div>

      <div className="detailed-skills-grid">
        {TRACKED_SKILLS.map((sk) => {
          const data = skillMap[sk];
          const icon = SKILL_ICONS[sk];
          const label = getSkillEnglishLabel(sk);
          const colorClass = getScoreColorClass(data.score, data.isApplicable);

          return (
            <div key={sk} className={`detailed-skill-card ${colorClass}`}>
              <div className="card-top">
                <span className="card-icon">{icon}</span>
                <span className="card-label">{label}</span>
                {data.isMastered && <span className="mastery-star">★</span>}
              </div>
              <div className="card-bottom">
                <span className="card-score">
                  {label} = {data.display}
                </span>
                <span className="card-status-sub">
                  {!data.isApplicable
                    ? 'N/A'
                    : data.score === null
                    ? 'Untested'
                    : data.score >= 0.85
                    ? 'Mastered'
                    : data.score >= 0.5
                    ? 'In Progress'
                    : 'Needs Practice'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
