import { useState, useEffect, useCallback } from 'react';
import { audioService } from '../core/services/audioService';
import { AudioOptions, AudioPlaybackState } from '../core/models/audio';
import { VocabularyItem } from '../core/models/vocabulary';

export function useAudio() {
  const [state, setState] = useState<AudioPlaybackState>(() => audioService.getState());

  useEffect(() => {
    const unsubscribe = audioService.subscribe((updatedState) => {
      setState(updatedState);
    });
    return unsubscribe;
  }, []);

  const play = useCallback((text: string, options?: AudioOptions) => {
    return audioService.play(text, options);
  }, []);

  const playVocabularyItem = useCallback((item: VocabularyItem, options?: AudioOptions) => {
    return audioService.playVocabularyItem(item, options);
  }, []);

  const playExample = useCallback((frenchSentence: string, options?: AudioOptions) => {
    return audioService.playExample(frenchSentence, options);
  }, []);

  const playPronunciation = useCallback((request: { text: string; language?: string; rate?: number; pitch?: number; volume?: number }) => {
    return audioService.playPronunciation(request);
  }, []);

  const stop = useCallback(() => {
    audioService.stop();
  }, []);

  const isItemPlaying = useCallback(
    (identifier: string) => {
      if (state.status !== 'playing') return false;
      return state.currentItemId === identifier || state.currentText === identifier;
    },
    [state.status, state.currentItemId, state.currentText],
  );

  return {
    state,
    play,
    playVocabularyItem,
    playExample,
    playPronunciation,
    stop,
    isItemPlaying,
    isPlaying: state.status === 'playing',
    isLoading: state.status === 'loading',
    isSupported: audioService.isSupported(),
  };
}
