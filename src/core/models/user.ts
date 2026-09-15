/**
 * User profile model.
 *
 * Stores learner identity and global preferences.
 * One user → many SRS states, many skill records, many sessions.
 */

import { UUID, Timestamp, CEFRLevel } from './types.js';

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: UUID;
  display_name: string;
  email: string;

  /** Self-assessed or placement-test CEFR level */
  current_level: CEFRLevel;

  /** Preferred number of new items per day */
  daily_new_limit: number;
  /** Preferred number of review items per day */
  daily_review_limit: number;

  /** Preferences for which skills to prioritise */
  skill_preferences: UserSkillPreferences;

  /** UI / app preferences */
  settings: UserSettings;

  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserSkillPreferences {
  /** Weight 0–1 for each skill; higher = more games of this type */
  listening_weight: number;
  writing_weight: number;
  context_weight: number;
  gender_weight: number;
  construction_weight: number;
  cloze_weight: number;
}

export interface UserSettings {
  /** Primary translation language shown first */
  primary_language: 'en' | 'vi';
  /** Whether to show Vietnamese meanings alongside English */
  show_vietnamese: boolean;
  /** Whether to auto-play audio when available */
  auto_play_audio: boolean;
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';
  /** Timezone for scheduling reviews */
  timezone: string;
}

// ---------------------------------------------------------------------------
// Factory / defaults
// ---------------------------------------------------------------------------

export function createDefaultUserProfile(
  id: UUID,
  displayName: string,
  email: string,
): UserProfile {
  const now = new Date();
  return {
    id,
    display_name: displayName,
    email,
    current_level: CEFRLevel.A1,
    daily_new_limit: 10,
    daily_review_limit: 50,
    skill_preferences: {
      listening_weight: 1.0,
      writing_weight: 1.0,
      context_weight: 1.0,
      gender_weight: 1.0,
      construction_weight: 1.0,
      cloze_weight: 1.0,
    },
    settings: {
      primary_language: 'vi',
      show_vietnamese: true,
      auto_play_audio: true,
      theme: 'system',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    created_at: now,
    updated_at: now,
  };
}
