import {
  AudioOptions,
  AudioPlaybackState,
  AudioPlaybackStatus,
  IAudioProvider,
} from '../models/audio';
import { VocabularyItem } from '../models/vocabulary';
import { formatPronunciationText, cleanLexicalText } from './audioPronunciationFormatter';

type AudioStateListener = (state: AudioPlaybackState) => void;

/**
 * Browser Speech Synthesis Audio Provider.
 *
 * Implements IAudioProvider using the standard Web Speech API.
 * Handles French voice selection, speech rate, pitch, and browser quirks.
 */
export class BrowserSpeechProvider implements IAudioProvider {
  readonly id = 'browser-speech-synthesis';
  readonly name = 'Trình duyệt Text-to-Speech (Web Speech API)';

  private frenchVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;

  constructor() {
    this.initVoices();
  }

  private initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        // Priority 1: fr-FR native voices (Google, Thomas, Amélie, Audrey, Céline)
        // Priority 2: Any fr-* voice
        const frVoices = voices.filter((v) => v.lang.startsWith('fr'));
        const frFrVoices = frVoices.filter((v) => v.lang.toLowerCase() === 'fr-fr');

        const preferredVoice =
          frFrVoices.find((v) => /google|thomas|amélie|audrey|nicolas/i.test(v.name)) ||
          frFrVoices[0] ||
          frVoices[0];

        this.frenchVoice = preferredVoice || null;
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  speak(text: string, options?: AudioOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Trình duyệt không hỗ trợ phát âm (Web Speech Synthesis).'));
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const cleanText = text.trim();
      if (!cleanText) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = options?.lang || 'fr-FR';
      // Rate 0.8 matching Google Translate calm, deliberate French cadence
      utterance.rate = options?.rate ?? 0.8;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;

      if (this.frenchVoice) {
        utterance.voice = this.frenchVoice;
      }

      // Safety timeout: Chrome sometimes stalls on end event for certain audio devices
      let safetyTimer: any = null;
      const clearSafety = () => {
        if (safetyTimer) {
          clearTimeout(safetyTimer);
          safetyTimer = null;
        }
      };

      utterance.onstart = () => {
        // Set maximum expected playback duration (approx 200 words/min = 3.3 words/sec)
        const wordCount = cleanText.split(/\s+/).length;
        const maxMs = Math.max(4000, wordCount * 1200);
        safetyTimer = setTimeout(() => {
          clearSafety();
          resolve();
        }, maxMs);
      };

      utterance.onend = () => {
        clearSafety();
        resolve();
      };

      utterance.onerror = (event) => {
        clearSafety();
        // Ignore 'canceled' or 'interrupted' errors as they occur when user clicks another word
        if (event.error === 'canceled' || event.error === 'interrupted') {
          resolve();
        } else {
          reject(new Error(`Lỗi phát âm: ${event.error || 'không rõ nguyên nhân'}`));
        }
      };

      // Resume speech synthesis in case the browser suspended it
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}

/**
 * Audio Service.
 *
 * Coordinates audio playback across the application.
 * Decoupled from the UI layer and game logic:
 * - Can swap audio providers (Browser TTS, stored MP3 files, remote TTS API) via setProvider().
 * - Manages playback status ('idle', 'loading', 'playing', 'error').
 * - Enforces linguistic rules:
 *   * NOUN: ALWAYS pronounced with article (e.g. 'une voiture', 'un livre').
 *   * VERB: Lexical form (e.g. 'se souvenir').
 *   * ADJECTIVE: Adjective form (e.g. 'grand').
 * - Graceful fallback handling for errors or unsupported environments.
 */
class AudioService {
  private provider: IAudioProvider;
  private state: AudioPlaybackState = {
    status: 'idle',
    currentText: null,
  };
  private listeners: Set<AudioStateListener> = new Set();
  private errorResetTimer: any = null;

  constructor(initialProvider?: IAudioProvider) {
    this.provider = initialProvider || new BrowserSpeechProvider();
  }

  /**
   * Replaces the current audio provider (e.g., switch to stored audio files or cloud TTS).
   */
  public setProvider(newProvider: IAudioProvider): void {
    this.stop();
    this.provider = newProvider;
  }

  /**
   * Gets the active audio provider.
   */
  public getProvider(): IAudioProvider {
    return this.provider;
  }

  /**
   * Subscribes to playback state updates.
   */
  public subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(partial: Partial<AudioPlaybackState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Error in AudioService listener:', err);
      }
    }
  }

  public getState(): AudioPlaybackState {
    return this.state;
  }

  public isSupported(): boolean {
    return this.provider.isSupported();
  }

  public isPlaying(): boolean {
    return this.state.status === 'playing';
  }

  /**
   * Plays a VocabularyItem following strict grammatical pronunciation rules:
   * - Noun: Pronounces article + noun ('une voiture', 'un livre')
   * - Verb: Lexical form ('se souvenir')
   * - Adjective: Single target form ('grand' or 'grande')
   */
  public async playVocabularyItem(
    item: VocabularyItem,
    options?: AudioOptions,
  ): Promise<void> {
    const textToSpeak = formatPronunciationText(item, options?.targetGender);
    return this.executePlay(textToSpeak, item.id, options);
  }

  /**
   * Plays a specific target pronunciation string as requested by §10:
   * playPronunciation({ text: "grand", language: "fr" })
   */
  public async playPronunciation(request: {
    text: string;
    language?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }): Promise<void> {
    const textToSpeak = cleanLexicalText(request.text);
    return this.executePlay(textToSpeak, undefined, {
      lang: request.language || 'fr-FR',
      rate: request.rate,
      pitch: request.pitch,
      volume: request.volume,
    });
  }

  /**
   * Plays a conversational example sentence at a slower cadence (rate 0.72).
   */
  public async playExample(
    frenchSentence: string,
    options?: AudioOptions,
  ): Promise<void> {
    const textToSpeak = cleanLexicalText(frenchSentence);
    const exampleOptions: AudioOptions = {
      rate: options?.rate ?? 0.72,
      ...options,
    };
    return this.executePlay(textToSpeak, undefined, exampleOptions);
  }

  /**
   * Plays arbitrary French text with standard formatting.
   */
  public async play(text: string, options?: AudioOptions): Promise<void> {
    const textToSpeak = cleanLexicalText(text);
    return this.executePlay(textToSpeak, undefined, options);
  }

  private async executePlay(
    textToSpeak: string,
    itemId?: string,
    options?: AudioOptions,
  ): Promise<void> {
    // Strict safeguard: if text contains " / ", take only single target form (§3, §10)
    if (textToSpeak.includes(' / ')) {
      textToSpeak = textToSpeak.split(/\s*\/\s*/)[0].trim();
    }
    if (!textToSpeak.trim()) return;

    if (this.errorResetTimer) {
      clearTimeout(this.errorResetTimer);
      this.errorResetTimer = null;
    }

    if (!this.provider.isSupported()) {
      this.setState({
        status: 'error',
        currentText: textToSpeak,
        currentItemId: itemId,
        error: 'Trình duyệt không hỗ trợ phát âm (Speech Synthesis).',
      });
      this.scheduleErrorReset();
      return;
    }

    try {
      this.setState({
        status: 'loading',
        currentText: textToSpeak,
        currentItemId: itemId,
        error: undefined,
      });

      this.setState({
        status: 'playing',
        currentText: textToSpeak,
        currentItemId: itemId,
      });

      await this.provider.speak(textToSpeak, options);

      // Successfully finished
      this.setState({
        status: 'idle',
        currentText: null,
        currentItemId: undefined,
      });
    } catch (err: any) {
      console.warn('Audio playback failed:', err);
      this.setState({
        status: 'error',
        currentText: textToSpeak,
        currentItemId: itemId,
        error: err?.message || 'Không thể phát âm thanh',
      });
      this.scheduleErrorReset();
    }
  }

  private scheduleErrorReset(): void {
    this.errorResetTimer = setTimeout(() => {
      if (this.state.status === 'error') {
        this.setState({
          status: 'idle',
          currentText: null,
          currentItemId: undefined,
          error: undefined,
        });
      }
    }, 3000);
  }

  /**
   * Stops current audio playback.
   */
  public stop(): void {
    this.provider.stop();
    this.setState({
      status: 'idle',
      currentText: null,
      currentItemId: undefined,
      error: undefined,
    });
  }
}

export const audioService = new AudioService();
