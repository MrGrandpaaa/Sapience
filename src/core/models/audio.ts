import { VocabularyItem } from './vocabulary';
import { PartOfSpeech, Gender } from './types';

export type AudioPlaybackStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface AudioPlaybackState {
  status: AudioPlaybackStatus;
  currentText: string | null;
  currentItemId?: string;
  error?: string;
}

export interface AudioOptions {
  /** Speech rate, 0.5 - 2.0. Default 0.9 for clear French learning */
  rate?: number;
  /** Speech pitch, 0 - 2. Default 1.0 */
  pitch?: number;
  /** Volume, 0 - 1. Default 1.0 */
  volume?: number;
  /** BCP 47 language tag. Default 'fr-FR' */
  lang?: string;
  /** Target gender for adjectives or nouns ('masculine' | 'feminine') */
  targetGender?: 'masculine' | 'feminine' | Gender;
}

/**
 * Audio Provider Interface.
 *
 * Decouples the audio playback mechanism from the application logic.
 * Implementations can be:
 * - BrowserSpeechProvider (Web Speech Synthesis API)
 * - StoredAudioProvider (Pre-recorded mp3/wav files)
 * - RemoteTTSProvider (Third-party TTS service)
 */
export interface IAudioProvider {
  readonly id: string;
  readonly name: string;
  isSupported(): boolean;
  speak(text: string, options?: AudioOptions): Promise<void>;
  stop(): void;
  hasAudioFor?(text: string): boolean;
}

export interface PronunciationRequest {
  text: string;
  part_of_speech?: PartOfSpeech;
  gender?: Gender;
  item?: VocabularyItem;
}
