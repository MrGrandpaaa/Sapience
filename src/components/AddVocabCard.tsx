import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { VocabularyItem, VocabLevel, AdjectivePositionalUnit } from '../core/models/vocabulary';
import {
  PartOfSpeech,
  Gender,
  VerbGroup,
  AdjectivePosition,
} from '../core/models/types';
import {
  FormatAData,
  FormatAGrammar,
  FormatANounGrammar,
  FormatAVerbGrammar,
  FormatAVerbConjugation,
  FormatAAdjectiveGrammar,
  AdjectivePositionalEntry,
  FormatANounGender,
  FormatAConstruction,
  ORDERED_PARTS_OF_SPEECH,
  NounGenderChoice,
  NounGenderFormDetails,
} from '../core/models/lexical';
import {
  cleanNounLemma,
  isElisionNoun,
  detectArticleAndGender,
  buildNounGenderDetails,
  defaultFrenchPlural,
} from '../core/services/nounPresentationService';
import {
  createConjugationUnits,
  cleanConjugatedForm,
} from '../core/services/verbConjugationService';
import { checkDistinctAdjectiveMeanings } from '../core/services/adjectivePresentationService';
import { FrenchAccentToolbar } from './games/FrenchAccentToolbar';
import './AddVocabCard.css';

interface AddVocabCardProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: VocabularyItem) => void;
}

export function AddVocabCard({ isOpen, onClose, onAdd }: AddVocabCardProps) {
  // Step 1: Vocabulary Entry Word
  const [entryWord, setEntryWord] = useState('');

  // Step 2 & 3: Selected Part of Speech (User must manually choose from 9 buttons, NO AI auto-select)
  const [selectedPos, setSelectedPos] = useState<PartOfSpeech | null>(null);

  // Step 4: Format A Form Fields
  // Meanings
  const [meaningEn, setMeaningEn] = useState('');
  const [meaningVi, setMeaningVi] = useState('');

  // Noun-specific states (§2, §3, §8, §9, §13)
  const [nounGenderChoice, setNounGenderChoice] = useState<NounGenderChoice | null>(null);
  const [nounMascForm, setNounMascForm] = useState('');
  const [nounFemForm, setNounFemForm] = useState('');
  const [nounCollocations, setNounCollocations] = useState<string[]>([]);
  const [nounSynonyms, setNounSynonyms] = useState<string[]>([]);
  const [nounAntonyms, setNounAntonyms] = useState<string[]>([]);
  const [nounExamples, setNounExamples] = useState<{ french: string; translation: string }[]>([]);

  // Verb-specific (§1, §2, §3, §4)
  const [verbGroup, setVerbGroup] = useState<VerbGroup | undefined>(undefined);
  const [conjJe, setConjJe] = useState('');
  const [conjTu, setConjTu] = useState('');
  const [conjIl, setConjIl] = useState('');
  const [conjNous, setConjNous] = useState('');
  const [conjVous, setConjVous] = useState('');
  const [conjIls, setConjIls] = useState('');
  const [verbCollocations, setVerbCollocations] = useState<string[]>([]);
  const [verbSynonyms, setVerbSynonyms] = useState<string[]>([]);
  const [verbAntonyms, setVerbAntonyms] = useState<string[]>([]);
  const [verbExamples, setVerbExamples] = useState<{ french: string; translation: string }[]>([]);

  // Verb constructions (up to 3)
  const [constructions, setConstructions] = useState<FormatAConstruction[]>([
    { pattern: '', meaning_en: '', meaning_vi: '', example_fr: '', example_en: '' },
  ]);

  // Adjective-specific states (§1–§6)
  const [adjPositionChoice, setAdjPositionChoice] = useState<'before' | 'after' | 'both' | null>(null);

  // Before position (or Left side of 'both')
  const [adjBeforeMasc, setAdjBeforeMasc] = useState('');
  const [adjBeforeFem, setAdjBeforeFem] = useState('');
  const [adjBeforeMeaningEn, setAdjBeforeMeaningEn] = useState('');
  const [adjBeforeMeaningVi, setAdjBeforeMeaningVi] = useState('');
  const [adjBeforeExamples, setAdjBeforeExamples] = useState<{ french: string; translation: string }[]>([]);
  const [adjBeforeSynonyms, setAdjBeforeSynonyms] = useState<string[]>([]);
  const [adjBeforeAntonyms, setAdjBeforeAntonyms] = useState<string[]>([]);
  const [adjBeforeCollocations, setAdjBeforeCollocations] = useState<string[]>([]);

  // After position (or Right side of 'both')
  const [adjAfterMasc, setAdjAfterMasc] = useState('');
  const [adjAfterFem, setAdjAfterFem] = useState('');
  const [adjAfterMeaningEn, setAdjAfterMeaningEn] = useState('');
  const [adjAfterMeaningVi, setAdjAfterMeaningVi] = useState('');
  const [adjAfterExamples, setAdjAfterExamples] = useState<{ french: string; translation: string }[]>([]);
  const [adjAfterSynonyms, setAdjAfterSynonyms] = useState<string[]>([]);
  const [adjAfterAntonyms, setAdjAfterAntonyms] = useState<string[]>([]);
  const [adjAfterCollocations, setAdjAfterCollocations] = useState<string[]>([]);

  // Dynamic lists for the other 6 POS (Adverb, Conjunction, Determiner, Interjection, Preposition, Pronoun)
  const [posExamples, setPosExamples] = useState<{ french: string; translation: string }[]>([]);
  const [posSynonyms, setPosSynonyms] = useState<string[]>([]);
  const [posAntonyms, setPosAntonyms] = useState<string[]>([]);
  const [posCollocations, setPosCollocations] = useState<string[]>([]);

  // Other 6 POS dynamic list handlers
  const handleAddPosExample = () =>
    setPosExamples((prev) => [...prev, { french: '', translation: '' }]);
  const handleUpdatePosExample = (idx: number, field: 'french' | 'translation', val: string) =>
    setPosExamples((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  const handleRemovePosExample = (idx: number) =>
    setPosExamples((prev) => prev.filter((_, i) => i !== idx));

  const handleAddPosSynonym = () => setPosSynonyms((prev) => [...prev, '']);
  const handleUpdatePosSynonym = (idx: number, val: string) =>
    setPosSynonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemovePosSynonym = (idx: number) =>
    setPosSynonyms((prev) => prev.filter((_, i) => i !== idx));

  const handleAddPosAntonym = () => setPosAntonyms((prev) => [...prev, '']);
  const handleUpdatePosAntonym = (idx: number, val: string) =>
    setPosAntonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemovePosAntonym = (idx: number) =>
    setPosAntonyms((prev) => prev.filter((_, i) => i !== idx));

  const handleAddPosCollocation = () => setPosCollocations((prev) => [...prev, '']);
  const handleUpdatePosCollocation = (idx: number, val: string) =>
    setPosCollocations((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemovePosCollocation = (idx: number) =>
    setPosCollocations((prev) => prev.filter((_, i) => i !== idx));

  // SRS Memory Level (Default 0: New)
  const [level, setLevel] = useState<VocabLevel>(0);

  // Toast notice for empty data validation ("Chưa có gì để lưu")
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus vocabulary input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  }, [isOpen]);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastNotice(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastNotice(null);
    }, 2800);
  };

  if (!isOpen) return null;

  // Insert French Accent Character at cursor of active focused input or entryWord fallback
  const handleInsertChar = (char: string) => {
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
      activeEl.closest('.add-vocab-modal-card')
    ) {
      const start = activeEl.selectionStart ?? activeEl.value.length;
      const end = activeEl.selectionEnd ?? activeEl.value.length;
      const oldVal = activeEl.value;
      const newVal = oldVal.slice(0, start) + char + oldVal.slice(end);

      const proto =
        activeEl.tagName === 'INPUT'
          ? window.HTMLInputElement.prototype
          : window.HTMLTextAreaElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(activeEl, newVal);
      } else {
        activeEl.value = newVal;
      }

      activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
        activeEl.focus();
        activeEl.setSelectionRange(start + char.length, start + char.length);
      }, 0);
      return;
    }

    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? entryWord.length;
      const end = input.selectionEnd ?? entryWord.length;
      const nextVal = entryWord.slice(0, start) + char + entryWord.slice(end);
      setEntryWord(nextVal);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + char.length, start + char.length);
      }, 0);
    } else {
      setEntryWord((prev) => prev + char);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEntryWord(val);
    if (selectedPos === PartOfSpeech.Noun && !nounGenderChoice) {
      const detection = detectArticleAndGender(val);
      if (detection.detectedGender === Gender.Masculine) {
        setNounGenderChoice('masculine');
        if (detection.lemma && !nounMascForm) setNounMascForm(detection.lemma);
      } else if (detection.detectedGender === Gender.Feminine) {
        setNounGenderChoice('feminine');
        if (detection.lemma && !nounFemForm) setNounFemForm(detection.lemma);
      } else if (detection.isKnownShared) {
        setNounGenderChoice('both');
        if (!nounMascForm) setNounMascForm(detection.lemma);
        if (!nounFemForm) setNounFemForm(detection.lemma);
      }
    }
  };

  const handleSelectPos = (posId: PartOfSpeech) => {
    setSelectedPos(posId);
    if (posId === PartOfSpeech.Noun && !nounGenderChoice && entryWord.trim()) {
      const detection = detectArticleAndGender(entryWord);
      if (detection.detectedGender === Gender.Masculine) {
        setNounGenderChoice('masculine');
        if (detection.lemma && !nounMascForm) setNounMascForm(detection.lemma);
      } else if (detection.detectedGender === Gender.Feminine) {
        setNounGenderChoice('feminine');
        if (detection.lemma && !nounFemForm) setNounFemForm(detection.lemma);
      } else if (detection.isKnownShared) {
        setNounGenderChoice('both');
        if (!nounMascForm) setNounMascForm(detection.lemma);
        if (!nounFemForm) setNounFemForm(detection.lemma);
      }
    }
  };

  // Construction helpers
  const handleAddConstruction = () => {
    if (constructions.length < 3) {
      setConstructions((prev) => [
        ...prev,
        { pattern: '', meaning_en: '', meaning_vi: '', example_fr: '', example_en: '' },
      ]);
    }
  };

  const handleUpdateConstruction = (index: number, field: keyof FormatAConstruction, value: string) => {
    setConstructions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveConstruction = (index: number) => {
    setConstructions((prev) => prev.filter((_, i) => i !== index));
  };

  // Noun Dynamic List Handlers (§9)
  const handleAddNounCollocation = () => setNounCollocations((prev) => [...prev, '']);
  const handleUpdateNounCollocation = (idx: number, val: string) =>
    setNounCollocations((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveNounCollocation = (idx: number) =>
    setNounCollocations((prev) => prev.filter((_, i) => i !== idx));

  const handleAddNounSynonym = () => setNounSynonyms((prev) => [...prev, '']);
  const handleUpdateNounSynonym = (idx: number, val: string) =>
    setNounSynonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveNounSynonym = (idx: number) =>
    setNounSynonyms((prev) => prev.filter((_, i) => i !== idx));

  const handleAddNounAntonym = () => setNounAntonyms((prev) => [...prev, '']);
  const handleUpdateNounAntonym = (idx: number, val: string) =>
    setNounAntonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveNounAntonym = (idx: number) =>
    setNounAntonyms((prev) => prev.filter((_, i) => i !== idx));

  // Noun Examples Handlers (§13)
  const handleAddNounExample = () =>
    setNounExamples((prev) => [...prev, { french: '', translation: '' }]);
  const handleUpdateNounExample = (idx: number, field: 'french' | 'translation', val: string) =>
    setNounExamples((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  const handleRemoveNounExample = (idx: number) =>
    setNounExamples((prev) => prev.filter((_, i) => i !== idx));

  // Verb Dynamic List Handlers (§1, §4)
  const handleAddVerbCollocation = () => setVerbCollocations((prev) => [...prev, '']);
  const handleUpdateVerbCollocation = (idx: number, val: string) =>
    setVerbCollocations((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveVerbCollocation = (idx: number) =>
    setVerbCollocations((prev) => prev.filter((_, i) => i !== idx));

  const handleAddVerbSynonym = () => setVerbSynonyms((prev) => [...prev, '']);
  const handleUpdateVerbSynonym = (idx: number, val: string) =>
    setVerbSynonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveVerbSynonym = (idx: number) =>
    setVerbSynonyms((prev) => prev.filter((_, i) => i !== idx));

  const handleAddVerbAntonym = () => setVerbAntonyms((prev) => [...prev, '']);
  const handleUpdateVerbAntonym = (idx: number, val: string) =>
    setVerbAntonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveVerbAntonym = (idx: number) =>
    setVerbAntonyms((prev) => prev.filter((_, i) => i !== idx));

  const handleAddVerbExample = () =>
    setVerbExamples((prev) => [...prev, { french: '', translation: '' }]);
  const handleUpdateVerbExample = (idx: number, field: 'french' | 'translation', val: string) =>
    setVerbExamples((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  const handleRemoveVerbExample = (idx: number) =>
    setVerbExamples((prev) => prev.filter((_, i) => i !== idx));

  // Adjective Dynamic List Handlers (Before / Left) (§3, §5)
  const handleAddAdjBeforeExample = () =>
    setAdjBeforeExamples((prev) => [...prev, { french: '', translation: '' }]);
  const handleUpdateAdjBeforeExample = (idx: number, field: 'french' | 'translation', val: string) =>
    setAdjBeforeExamples((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  const handleRemoveAdjBeforeExample = (idx: number) =>
    setAdjBeforeExamples((prev) => prev.filter((_, i) => i !== idx));

  const handleAddAdjBeforeCollocation = () => setAdjBeforeCollocations((prev) => [...prev, '']);
  const handleUpdateAdjBeforeCollocation = (idx: number, val: string) =>
    setAdjBeforeCollocations((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveAdjBeforeCollocation = (idx: number) =>
    setAdjBeforeCollocations((prev) => prev.filter((_, i) => i !== idx));

  const handleAddAdjBeforeSynonym = () => setAdjBeforeSynonyms((prev) => [...prev, '']);
  const handleUpdateAdjBeforeSynonym = (idx: number, val: string) =>
    setAdjBeforeSynonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveAdjBeforeSynonym = (idx: number) =>
    setAdjBeforeSynonyms((prev) => prev.filter((_, i) => i !== idx));

  const handleAddAdjBeforeAntonym = () => setAdjBeforeAntonyms((prev) => [...prev, '']);
  const handleUpdateAdjBeforeAntonym = (idx: number, val: string) =>
    setAdjBeforeAntonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveAdjBeforeAntonym = (idx: number) =>
    setAdjBeforeAntonyms((prev) => prev.filter((_, i) => i !== idx));

  // Adjective Dynamic List Handlers (After / Right) (§4, §5)
  const handleAddAdjAfterExample = () =>
    setAdjAfterExamples((prev) => [...prev, { french: '', translation: '' }]);
  const handleUpdateAdjAfterExample = (idx: number, field: 'french' | 'translation', val: string) =>
    setAdjAfterExamples((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  const handleRemoveAdjAfterExample = (idx: number) =>
    setAdjAfterExamples((prev) => prev.filter((_, i) => i !== idx));

  const handleAddAdjAfterCollocation = () => setAdjAfterCollocations((prev) => [...prev, '']);
  const handleUpdateAdjAfterCollocation = (idx: number, val: string) =>
    setAdjAfterCollocations((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveAdjAfterCollocation = (idx: number) =>
    setAdjAfterCollocations((prev) => prev.filter((_, i) => i !== idx));

  const handleAddAdjAfterSynonym = () => setAdjAfterSynonyms((prev) => [...prev, '']);
  const handleUpdateAdjAfterSynonym = (idx: number, val: string) =>
    setAdjAfterSynonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveAdjAfterSynonym = (idx: number) =>
    setAdjAfterSynonyms((prev) => prev.filter((_, i) => i !== idx));

  const handleAddAdjAfterAntonym = () => setAdjAfterAntonyms((prev) => [...prev, '']);
  const handleUpdateAdjAfterAntonym = (idx: number, val: string) =>
    setAdjAfterAntonyms((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  const handleRemoveAdjAfterAntonym = (idx: number) =>
    setAdjAfterAntonyms((prev) => prev.filter((_, i) => i !== idx));

  // Check if entire vocabulary data is empty
  const isEntireDataEmpty = (): boolean => {
    if (selectedPos === PartOfSpeech.Noun) {
      const hasWord = Boolean(entryWord.trim());
      const hasMasc = Boolean(nounMascForm.trim());
      const hasFem = Boolean(nounFemForm.trim());
      const hasMeanEn = Boolean(meaningEn.trim());
      const hasMeanVi = Boolean(meaningVi.trim());
      const hasGender = Boolean(nounGenderChoice);
      const hasCol = nounCollocations.some((c) => Boolean(c.trim()));
      const hasSyn = nounSynonyms.some((s) => Boolean(s.trim()));
      const hasAnt = nounAntonyms.some((a) => Boolean(a.trim()));
      const hasEx = nounExamples.some((e) => Boolean(e.french.trim() || e.translation.trim()));

      return !(
        hasWord ||
        hasMasc ||
        hasFem ||
        hasMeanEn ||
        hasMeanVi ||
        hasGender ||
        hasCol ||
        hasSyn ||
        hasAnt ||
        hasEx
      );
    }

    if (selectedPos === PartOfSpeech.Verb) {
      const hasWord = Boolean(entryWord.trim());
      const hasMeanEn = Boolean(meaningEn.trim());
      const hasMeanVi = Boolean(meaningVi.trim());
      const hasGroup = Boolean(verbGroup);
      const hasConj = Boolean(
        conjJe.trim() || conjTu.trim() || conjIl.trim() ||
        conjNous.trim() || conjVous.trim() || conjIls.trim()
      );
      const hasCol = verbCollocations.some((c) => Boolean(c.trim()));
      const hasSyn = verbSynonyms.some((s) => Boolean(s.trim()));
      const hasAnt = verbAntonyms.some((a) => Boolean(a.trim()));
      const hasEx = verbExamples.some((e) => Boolean(e.french.trim() || e.translation.trim()));
      const hasCons = constructions.some(
        (c) => c.pattern.trim() || c.meaning_en.trim() || c.meaning_vi.trim() || c.example_fr.trim()
      );

      return !(
        hasWord ||
        hasMeanEn ||
        hasMeanVi ||
        hasGroup ||
        hasConj ||
        hasCol ||
        hasSyn ||
        hasAnt ||
        hasEx ||
        hasCons
      );
    }

    if (selectedPos === PartOfSpeech.Adjective) {
      const hasWord = Boolean(entryWord.trim());
      const hasBeforeData = Boolean(
        adjBeforeMasc.trim() ||
        adjBeforeFem.trim() ||
        adjBeforeMeaningEn.trim() ||
        adjBeforeMeaningVi.trim() ||
        adjBeforeCollocations.some((c) => Boolean(c.trim())) ||
        adjBeforeSynonyms.some((s) => Boolean(s.trim())) ||
        adjBeforeAntonyms.some((a) => Boolean(a.trim())) ||
        adjBeforeExamples.some((e) => Boolean(e.french.trim() || e.translation.trim()))
      );
      const hasAfterData = Boolean(
        adjAfterMasc.trim() ||
        adjAfterFem.trim() ||
        adjAfterMeaningEn.trim() ||
        adjAfterMeaningVi.trim() ||
        adjAfterCollocations.some((c) => Boolean(c.trim())) ||
        adjAfterSynonyms.some((s) => Boolean(s.trim())) ||
        adjAfterAntonyms.some((a) => Boolean(a.trim())) ||
        adjAfterExamples.some((e) => Boolean(e.french.trim() || e.translation.trim()))
      );

      return !(hasWord || hasBeforeData || hasAfterData);
    }

    const hasWord = Boolean(entryWord.trim());
    const hasMeanEn = Boolean(meaningEn.trim());
    const hasMeanVi = Boolean(meaningVi.trim());
    const hasEx = posExamples.some((e) => Boolean(e.french.trim() || e.translation.trim()));
    const hasSyn = posSynonyms.some((s) => Boolean(s.trim()));
    const hasAnt = posAntonyms.some((a) => Boolean(a.trim()));
    const hasCol = posCollocations.some((c) => Boolean(c.trim()));

    return !(
      hasWord ||
      hasMeanEn ||
      hasMeanVi ||
      hasEx ||
      hasSyn ||
      hasAnt ||
      hasCol
    );
  };

  // Helper to build grammar object based on selected POS
  const buildGrammar = (pos: PartOfSpeech): FormatAGrammar => {
    switch (pos) {
      case PartOfSpeech.Noun: {
        let cleanMasc = '';
        let cleanFem = '';
        let lemma = '';
        let isSharedForm = false;

        const detection = detectArticleAndGender(entryWord);
        let effectiveChoice = nounGenderChoice;
        if (!effectiveChoice) {
          if (detection.detectedGender === Gender.Masculine) {
            effectiveChoice = 'masculine';
          } else if (detection.detectedGender === Gender.Feminine) {
            effectiveChoice = 'feminine';
          } else if (detection.isKnownShared) {
            effectiveChoice = 'both';
          }
        }

        if (effectiveChoice === 'both') {
          cleanMasc = cleanNounLemma(nounMascForm || detection.lemma || entryWord);
          cleanFem = cleanNounLemma(nounFemForm || detection.lemma || entryWord);
          if (cleanMasc && cleanFem && cleanMasc.toLowerCase() === cleanFem.toLowerCase()) {
            isSharedForm = true;
            lemma = cleanMasc;
          } else {
            lemma = cleanMasc && cleanFem ? `${cleanMasc} / ${cleanFem}` : (cleanMasc || cleanFem || cleanNounLemma(entryWord));
          }
        } else if (effectiveChoice === 'masculine') {
          lemma = cleanNounLemma(nounMascForm || detection.lemma || entryWord);
        } else if (effectiveChoice === 'feminine') {
          lemma = cleanNounLemma(nounFemForm || detection.lemma || entryWord);
        } else {
          lemma = cleanNounLemma(entryWord);
        }

        const gender = effectiveChoice === 'both'
          ? Gender.Both
          : effectiveChoice === 'masculine'
          ? Gender.Masculine
          : effectiveChoice === 'feminine'
          ? Gender.Feminine
          : undefined;

        const underlyingArticle = effectiveChoice === 'masculine'
          ? 'le'
          : effectiveChoice === 'feminine'
          ? 'la'
          : undefined;

        const genders: (Gender.Masculine | Gender.Feminine)[] =
          effectiveChoice === 'both'
            ? [Gender.Masculine, Gender.Feminine]
            : effectiveChoice === 'masculine'
            ? [Gender.Masculine]
            : effectiveChoice === 'feminine'
            ? [Gender.Feminine]
            : [];

        const forms: { masculine?: string; feminine?: string } | undefined =
          effectiveChoice === 'both'
            ? { masculine: cleanMasc, feminine: cleanFem }
            : effectiveChoice === 'masculine'
            ? { masculine: lemma }
            : effectiveChoice === 'feminine'
            ? { feminine: lemma }
            : undefined;

        const genderDetails: { masculine?: NounGenderFormDetails; feminine?: NounGenderFormDetails } = {};
        if (effectiveChoice === 'both') {
          if (cleanMasc) genderDetails.masculine = buildNounGenderDetails(cleanMasc, Gender.Masculine);
          if (cleanFem) genderDetails.feminine = buildNounGenderDetails(cleanFem, Gender.Feminine);
        } else if (effectiveChoice === 'masculine' && lemma) {
          genderDetails.masculine = buildNounGenderDetails(lemma, Gender.Masculine);
        } else if (effectiveChoice === 'feminine' && lemma) {
          genderDetails.feminine = buildNounGenderDetails(lemma, Gender.Feminine);
        }

        const structuredPlural = effectiveChoice === 'both'
          ? {
              masculine: defaultFrenchPlural(cleanMasc),
              feminine: defaultFrenchPlural(cleanFem),
              shared: defaultFrenchPlural(cleanMasc),
            }
          : lemma
          ? defaultFrenchPlural(lemma)
          : undefined;

        return {
          pos: PartOfSpeech.Noun,
          gender_choice: effectiveChoice || undefined,
          lemma: lemma || undefined,
          gender,
          genders: genders.length > 0 ? genders : undefined,
          forms,
          is_shared_form: isSharedForm,
          gender_details: Object.keys(genderDetails).length > 0 ? genderDetails : undefined,
          plural: structuredPlural,
          underlying_article: underlyingArticle,
          masculine_form: effectiveChoice === 'both' && cleanMasc
            ? {
                lemma: cleanMasc,
                gender: Gender.Masculine,
                underlying_article: 'le',
                definite_article: isElisionNoun(cleanMasc) ? "l'" : 'le',
                indefinite_article: 'un',
                singular: cleanMasc,
                plural: defaultFrenchPlural(cleanMasc),
              }
            : undefined,
          feminine_form: effectiveChoice === 'both' && cleanFem
            ? {
                lemma: cleanFem,
                gender: Gender.Feminine,
                underlying_article: 'la',
                definite_article: isElisionNoun(cleanFem) ? "l'" : 'la',
                indefinite_article: 'une',
                singular: cleanFem,
                plural: defaultFrenchPlural(cleanFem),
              }
            : undefined,
          article_display: isSharedForm
            ? (isElisionNoun(lemma) ? "l'" : 'un / une')
            : effectiveChoice === 'masculine'
            ? (isElisionNoun(lemma) ? "l'" : 'un / le')
            : effectiveChoice === 'feminine'
            ? (isElisionNoun(lemma) ? "l'" : 'une / la')
            : undefined,
        };
      }
      case PartOfSpeech.Verb: {
        const hasConj = Boolean(
          conjJe.trim() || conjTu.trim() || conjIl.trim() ||
          conjNous.trim() || conjVous.trim() || conjIls.trim()
        );
        return {
          pos: PartOfSpeech.Verb,
          group: verbGroup,
          conjugation: hasConj
            ? {
                je: conjJe.trim(),
                tu: conjTu.trim(),
                il_elle_on: conjIl.trim(),
                nous: conjNous.trim(),
                vous: conjVous.trim(),
                ils_elles: conjIls.trim(),
              }
            : undefined,
        };
      }
      case PartOfSpeech.Adjective: {
        const posEnum =
          adjPositionChoice === 'before'
            ? AdjectivePosition.BeforeNoun
            : adjPositionChoice === 'after'
            ? AdjectivePosition.AfterNoun
            : adjPositionChoice === 'both'
            ? AdjectivePosition.Variable
            : undefined;

        const masc = (adjPositionChoice === 'after' ? adjAfterMasc : adjBeforeMasc).trim() || entryWord.trim();
        const fem = (adjPositionChoice === 'after' ? adjAfterFem : adjBeforeFem).trim();

        return {
          pos: PartOfSpeech.Adjective,
          masculine: masc || undefined,
          feminine: fem || undefined,
          position: posEnum,
        };
      }
      case PartOfSpeech.Adverb:
        return { pos: PartOfSpeech.Adverb };
      case PartOfSpeech.Conjunction:
        return { pos: PartOfSpeech.Conjunction };
      case PartOfSpeech.Determiner:
        return { pos: PartOfSpeech.Determiner };
      case PartOfSpeech.Interjection:
        return { pos: PartOfSpeech.Interjection };
      case PartOfSpeech.Preposition:
        return { pos: PartOfSpeech.Preposition };
      case PartOfSpeech.Pronoun:
        return { pos: PartOfSpeech.Pronoun };
    }
  };

  // Save current word helper
  const saveCurrentWord = (): boolean => {
    // Rule 7: Entire vocabulary data empty check
    if (isEntireDataEmpty()) {
      showToast('Chưa có gì để lưu');
      return false;
    }

    // If user has not chosen POS yet, require choosing from the 9 POS
    if (!selectedPos) {
      showToast('Vui lòng chọn 1 trong 9 từ loại phía trên');
      return false;
    }

    if (selectedPos === PartOfSpeech.Noun) {
      let cleanMasc = '';
      let cleanFem = '';
      let lemma = '';
      let isSharedForm = false;

      const detection = detectArticleAndGender(entryWord);
      let effectiveChoice = nounGenderChoice;
      if (!effectiveChoice) {
        if (detection.detectedGender === Gender.Masculine) {
          effectiveChoice = 'masculine';
        } else if (detection.detectedGender === Gender.Feminine) {
          effectiveChoice = 'feminine';
        } else if (detection.isKnownShared) {
          effectiveChoice = 'both';
        }
      }

      if (effectiveChoice === 'both') {
        cleanMasc = cleanNounLemma(nounMascForm || detection.lemma || entryWord);
        cleanFem = cleanNounLemma(nounFemForm || detection.lemma || entryWord);
        if (cleanMasc && cleanFem && cleanMasc.toLowerCase() === cleanFem.toLowerCase()) {
          isSharedForm = true;
          lemma = cleanMasc;
        } else {
          lemma = cleanMasc && cleanFem ? `${cleanMasc} / ${cleanFem}` : (cleanMasc || cleanFem || cleanNounLemma(entryWord));
        }
      } else if (effectiveChoice === 'masculine') {
        lemma = cleanNounLemma(nounMascForm || detection.lemma || entryWord);
      } else if (effectiveChoice === 'feminine') {
        lemma = cleanNounLemma(nounFemForm || detection.lemma || entryWord);
      } else {
        lemma = cleanNounLemma(entryWord);
      }

      const surfaceForm = lemma || meaningEn.trim() || meaningVi.trim() || 'Vocabulaire';

      const gender = effectiveChoice === 'both'
        ? Gender.Both
        : effectiveChoice === 'masculine'
        ? Gender.Masculine
        : effectiveChoice === 'feminine'
        ? Gender.Feminine
        : undefined;

      const underlyingArticle = effectiveChoice === 'masculine'
        ? 'le'
        : effectiveChoice === 'feminine'
        ? 'la'
        : undefined;

      const genders: (Gender.Masculine | Gender.Feminine)[] =
        effectiveChoice === 'both'
          ? [Gender.Masculine, Gender.Feminine]
          : effectiveChoice === 'masculine'
          ? [Gender.Masculine]
          : effectiveChoice === 'feminine'
          ? [Gender.Feminine]
          : [];

      const forms: { masculine?: string; feminine?: string } | undefined =
        effectiveChoice === 'both'
          ? { masculine: cleanMasc, feminine: cleanFem }
          : effectiveChoice === 'masculine'
          ? { masculine: lemma }
          : effectiveChoice === 'feminine'
          ? { feminine: lemma }
          : undefined;

      const genderDetails: { masculine?: NounGenderFormDetails; feminine?: NounGenderFormDetails } = {};
      if (effectiveChoice === 'both') {
        if (cleanMasc) genderDetails.masculine = buildNounGenderDetails(cleanMasc, Gender.Masculine);
        if (cleanFem) genderDetails.feminine = buildNounGenderDetails(cleanFem, Gender.Feminine);
      } else if (effectiveChoice === 'masculine' && lemma) {
        genderDetails.masculine = buildNounGenderDetails(lemma, Gender.Masculine);
      } else if (effectiveChoice === 'feminine' && lemma) {
        genderDetails.feminine = buildNounGenderDetails(lemma, Gender.Feminine);
      }

      const structuredPlural = effectiveChoice === 'both'
        ? {
            masculine: defaultFrenchPlural(cleanMasc),
            feminine: defaultFrenchPlural(cleanFem),
            shared: defaultFrenchPlural(cleanMasc),
          }
        : lemma
        ? defaultFrenchPlural(lemma)
        : undefined;

      const collocations = nounCollocations.map((s) => s.trim()).filter(Boolean);
      const synonyms = nounSynonyms.map((s) => s.trim()).filter(Boolean);
      const antonyms = nounAntonyms.map((s) => s.trim()).filter(Boolean);
      const validExamples = nounExamples
        .map((e) => ({ french: e.french.trim(), translation: e.translation.trim() }))
        .filter((e) => Boolean(e.french || e.translation));

      const nounGrammar: FormatANounGrammar = {
        pos: PartOfSpeech.Noun,
        gender_choice: effectiveChoice || undefined,
        lemma: lemma || undefined,
        gender,
        genders: genders.length > 0 ? genders : undefined,
        forms,
        is_shared_form: isSharedForm,
        gender_details: Object.keys(genderDetails).length > 0 ? genderDetails : undefined,
        plural: structuredPlural,
        underlying_article: underlyingArticle,
        masculine_form: effectiveChoice === 'both' && cleanMasc
          ? {
              lemma: cleanMasc,
              gender: Gender.Masculine,
              underlying_article: 'le',
              definite_article: isElisionNoun(cleanMasc) ? "l'" : 'le',
              indefinite_article: 'un',
              singular: cleanMasc,
              plural: defaultFrenchPlural(cleanMasc),
            }
          : undefined,
        feminine_form: effectiveChoice === 'both' && cleanFem
          ? {
              lemma: cleanFem,
              gender: Gender.Feminine,
              underlying_article: 'la',
              definite_article: isElisionNoun(cleanFem) ? "l'" : 'la',
              indefinite_article: 'une',
              singular: cleanFem,
              plural: defaultFrenchPlural(cleanFem),
            }
          : undefined,
        article_display: isSharedForm
          ? (isElisionNoun(lemma) ? "l'" : 'un / une')
          : effectiveChoice === 'masculine'
          ? (isElisionNoun(lemma) ? "l'" : 'un / le')
          : effectiveChoice === 'feminine'
          ? (isElisionNoun(lemma) ? "l'" : 'une / la')
          : undefined,
      };

      const formatA: FormatAData = {
        entry: surfaceForm,
        grammar: nounGrammar,
        meaning_en: meaningEn.trim(),
        meaning_vi: meaningVi.trim(),
        collocations: collocations.length > 0 ? collocations : undefined,
        synonyms: synonyms.length > 0 ? synonyms : undefined,
        antonyms: antonyms.length > 0 ? antonyms : undefined,
        examples: validExamples.length > 0
          ? validExamples.map((ex) => ({
              french: ex.french,
              vietnamese: ex.translation,
              english: ex.translation,
            }))
          : undefined,
        example: validExamples.length > 0
          ? {
              french: validExamples[0].french,
              vietnamese: validExamples[0].translation,
              english: validExamples[0].translation,
            }
          : { french: '', english: '' },
      };

      const now = new Date();
      const newItem: VocabularyItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`,
        surface_form: surfaceForm,
        normalized_form: surfaceForm.toLowerCase(),
        part_of_speech: PartOfSpeech.Noun,
        gender,
        level,
        format_a: formatA,
        created_at: now,
        updated_at: now,
      };

      onAdd(newItem);
      return true;
    }

    if (selectedPos === PartOfSpeech.Verb) {
      const trimmedEntry = entryWord.trim();
      const surfaceForm = trimmedEntry || meaningEn.trim() || meaningVi.trim() || 'Verbe';
      const cleanJe = cleanConjugatedForm(conjJe, 'je');
      const cleanTu = cleanConjugatedForm(conjTu, 'tu');
      const cleanIl = cleanConjugatedForm(conjIl, 'il_elle_on');
      const cleanNous = cleanConjugatedForm(conjNous, 'nous');
      const cleanVous = cleanConjugatedForm(conjVous, 'vous');
      const cleanIls = cleanConjugatedForm(conjIls, 'ils_elles');

      const collocations = verbCollocations.map((c) => c.trim()).filter(Boolean);
      const synonyms = verbSynonyms.map((s) => s.trim()).filter(Boolean);
      const antonyms = verbAntonyms.map((a) => a.trim()).filter(Boolean);
      const validExamples = verbExamples
        .map((e) => ({ french: e.french.trim(), translation: e.translation.trim() }))
        .filter((e) => Boolean(e.french || e.translation));

      const conjugationData: FormatAVerbConjugation = {
        je: cleanJe,
        tu: cleanTu,
        il_elle_on: cleanIl,
        ilElleOn: cleanIl,
        nous: cleanNous,
        vous: cleanVous,
        ils_elles: cleanIls,
        ilsElles: cleanIls,
      };

      const now = new Date();
      const newItemId = crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`;

      // Create 6 independent conjugation learning units (§5, §7)
      const conjugationUnits = createConjugationUnits({
        id: newItemId,
        surface_form: surfaceForm,
        conjugation: conjugationData,
        level,
      });

      const validConstructions = constructions.filter(
        (c) => c.pattern.trim() || c.meaning_en.trim() || c.meaning_vi.trim() || c.example_fr.trim()
      );

      const verbGrammar: FormatAVerbGrammar = {
        pos: PartOfSpeech.Verb,
        lemma: surfaceForm,
        group: verbGroup,
        conjugation: conjugationData,
      };

      const formatA: FormatAData = {
        entry: surfaceForm,
        grammar: verbGrammar,
        meaning_en: meaningEn.trim(),
        meaning_vi: meaningVi.trim(),
        constructions: validConstructions.length > 0 ? validConstructions : undefined,
        collocations: collocations.length > 0 ? collocations : undefined,
        synonyms: synonyms.length > 0 ? synonyms : undefined,
        antonyms: antonyms.length > 0 ? antonyms : undefined,
        examples: validExamples.length > 0
          ? validExamples.map((ex) => ({
              french: ex.french,
              vietnamese: ex.translation,
              english: ex.translation,
            }))
          : undefined,
        example: validExamples.length > 0
          ? {
              french: validExamples[0].french,
              vietnamese: validExamples[0].translation,
              english: validExamples[0].translation,
            }
          : { french: '', english: '' },
      };

      const newItem: VocabularyItem = {
        id: newItemId,
        surface_form: surfaceForm,
        normalized_form: surfaceForm.toLowerCase(),
        part_of_speech: PartOfSpeech.Verb,
        level,
        conjugation_units: conjugationUnits,
        format_a: formatA,
        created_at: now,
        updated_at: now,
      };

      onAdd(newItem);
      return true;
    }

    if (selectedPos === PartOfSpeech.Adjective) {
      if (!adjPositionChoice) {
        showToast('Vui lòng chọn vị trí tính từ: Trước nom, Sau nom, hoặc Trước và sau nom');
        return false;
      }

      const now = new Date();
      const newItemId = crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`;

      if (adjPositionChoice === 'before') {
        const masc = adjBeforeMasc.trim() || entryWord.trim();
        const fem = adjBeforeFem.trim();
        const mEn = adjBeforeMeaningEn.trim();
        const mVi = adjBeforeMeaningVi.trim();
        const collocations = adjBeforeCollocations.map((c) => c.trim()).filter(Boolean);
        const synonyms = adjBeforeSynonyms.map((s) => s.trim()).filter(Boolean);
        const antonyms = adjBeforeAntonyms.map((a) => a.trim()).filter(Boolean);
        const validExamples = adjBeforeExamples
          .map((e) => ({ french: e.french.trim(), translation: e.translation.trim() }))
          .filter((e) => Boolean(e.french || e.translation));

        const surfaceForm =
          fem && masc && masc.toLowerCase() !== fem.toLowerCase()
            ? `${masc} / ${fem}`
            : masc || fem || entryWord.trim() || 'Adjectif';

        const adjGrammar: FormatAAdjectiveGrammar = {
          pos: PartOfSpeech.Adjective,
          position: AdjectivePosition.BeforeNoun,
          masculine: masc || undefined,
          feminine: fem || undefined,
          trc_meaning: mEn || mVi ? { meaning_en: mEn, meaning_vi: mVi } : undefined,
        };

        const formatA: FormatAData = {
          entry: surfaceForm,
          grammar: adjGrammar,
          meaning_en: mEn,
          meaning_vi: mVi,
          collocations: collocations.length > 0 ? collocations : undefined,
          synonyms: synonyms.length > 0 ? synonyms : undefined,
          antonyms: antonyms.length > 0 ? antonyms : undefined,
          examples: validExamples.length > 0
            ? validExamples.map((ex) => ({
                french: ex.french,
                vietnamese: ex.translation,
                english: ex.translation,
              }))
            : undefined,
          example: validExamples.length > 0
            ? {
                french: validExamples[0].french,
                vietnamese: validExamples[0].translation,
                english: validExamples[0].translation,
              }
            : { french: '', english: '' },
        };

        const newItem: VocabularyItem = {
          id: newItemId,
          surface_form: surfaceForm,
          normalized_form: surfaceForm.toLowerCase(),
          part_of_speech: PartOfSpeech.Adjective,
          level,
          format_a: formatA,
          created_at: now,
          updated_at: now,
        };

        onAdd(newItem);
        return true;
      }

      if (adjPositionChoice === 'after') {
        const masc = adjAfterMasc.trim() || entryWord.trim();
        const fem = adjAfterFem.trim();
        const mEn = adjAfterMeaningEn.trim();
        const mVi = adjAfterMeaningVi.trim();
        const collocations = adjAfterCollocations.map((c) => c.trim()).filter(Boolean);
        const synonyms = adjAfterSynonyms.map((s) => s.trim()).filter(Boolean);
        const antonyms = adjAfterAntonyms.map((a) => a.trim()).filter(Boolean);
        const validExamples = adjAfterExamples
          .map((e) => ({ french: e.french.trim(), translation: e.translation.trim() }))
          .filter((e) => Boolean(e.french || e.translation));

        const surfaceForm =
          fem && masc && masc.toLowerCase() !== fem.toLowerCase()
            ? `${masc} / ${fem}`
            : masc || fem || entryWord.trim() || 'Adjectif';

        const adjGrammar: FormatAAdjectiveGrammar = {
          pos: PartOfSpeech.Adjective,
          position: AdjectivePosition.AfterNoun,
          masculine: masc || undefined,
          feminine: fem || undefined,
          sau_meaning: mEn || mVi ? { meaning_en: mEn, meaning_vi: mVi } : undefined,
        };

        const formatA: FormatAData = {
          entry: surfaceForm,
          grammar: adjGrammar,
          meaning_en: mEn,
          meaning_vi: mVi,
          collocations: collocations.length > 0 ? collocations : undefined,
          synonyms: synonyms.length > 0 ? synonyms : undefined,
          antonyms: antonyms.length > 0 ? antonyms : undefined,
          examples: validExamples.length > 0
            ? validExamples.map((ex) => ({
                french: ex.french,
                vietnamese: ex.translation,
                english: ex.translation,
              }))
            : undefined,
          example: validExamples.length > 0
            ? {
                french: validExamples[0].french,
                vietnamese: validExamples[0].translation,
                english: validExamples[0].translation,
              }
            : { french: '', english: '' },
        };

        const newItem: VocabularyItem = {
          id: newItemId,
          surface_form: surfaceForm,
          normalized_form: surfaceForm.toLowerCase(),
          part_of_speech: PartOfSpeech.Adjective,
          level,
          format_a: formatA,
          created_at: now,
          updated_at: now,
        };

        onAdd(newItem);
        return true;
      }

      // Case: adjPositionChoice === 'both' (Trước và sau nom — §5, §7, §8)
      const beforeMasc = adjBeforeMasc.trim() || entryWord.trim();
      const beforeFem = adjBeforeFem.trim();
      const afterMasc = adjAfterMasc.trim() || beforeMasc;
      const afterFem = adjAfterFem.trim() || beforeFem;

      const masc = beforeMasc || afterMasc || entryWord.trim();
      const fem = beforeFem || afterFem;

      const surfaceForm =
        fem && masc && masc.toLowerCase() !== fem.toLowerCase()
          ? `${masc} / ${fem}`
          : masc || fem || entryWord.trim() || 'Adjectif';

      const beforeEn = adjBeforeMeaningEn.trim();
      const beforeVi = adjBeforeMeaningVi.trim();
      const afterEn = adjAfterMeaningEn.trim();
      const afterVi = adjAfterMeaningVi.trim();

      const hasDistinctMeanings = checkDistinctAdjectiveMeanings(
        beforeEn,
        beforeVi,
        afterEn,
        afterVi,
      );

      const beforeCollocations = adjBeforeCollocations.map((c) => c.trim()).filter(Boolean);
      const beforeSynonyms = adjBeforeSynonyms.map((s) => s.trim()).filter(Boolean);
      const beforeAntonyms = adjBeforeAntonyms.map((a) => a.trim()).filter(Boolean);
      const beforeValidExamples = adjBeforeExamples
        .map((e) => ({ french: e.french.trim(), translation: e.translation.trim() }))
        .filter((e) => Boolean(e.french || e.translation));

      const afterCollocations = adjAfterCollocations.map((c) => c.trim()).filter(Boolean);
      const afterSynonyms = adjAfterSynonyms.map((s) => s.trim()).filter(Boolean);
      const afterAntonyms = adjAfterAntonyms.map((a) => a.trim()).filter(Boolean);
      const afterValidExamples = adjAfterExamples
        .map((e) => ({ french: e.french.trim(), translation: e.translation.trim() }))
        .filter((e) => Boolean(e.french || e.translation));

      const beforeEntry: AdjectivePositionalEntry = {
        position: AdjectivePosition.BeforeNoun,
        masculine: beforeMasc || undefined,
        feminine: beforeFem || undefined,
        meaning_en: beforeEn || undefined,
        meaning_vi: beforeVi || undefined,
        collocations: beforeCollocations.length > 0 ? beforeCollocations : undefined,
        synonyms: beforeSynonyms.length > 0 ? beforeSynonyms : undefined,
        antonyms: beforeAntonyms.length > 0 ? beforeAntonyms : undefined,
        examples: beforeValidExamples.length > 0
          ? beforeValidExamples.map((ex) => ({
              french: ex.french,
              vietnamese: ex.translation,
              english: ex.translation,
            }))
          : undefined,
      };

      const afterEntry: AdjectivePositionalEntry = {
        position: AdjectivePosition.AfterNoun,
        masculine: afterMasc || undefined,
        feminine: afterFem || undefined,
        meaning_en: afterEn || undefined,
        meaning_vi: afterVi || undefined,
        collocations: afterCollocations.length > 0 ? afterCollocations : undefined,
        synonyms: afterSynonyms.length > 0 ? afterSynonyms : undefined,
        antonyms: afterAntonyms.length > 0 ? afterAntonyms : undefined,
        examples: afterValidExamples.length > 0
          ? afterValidExamples.map((ex) => ({
              french: ex.french,
              vietnamese: ex.translation,
              english: ex.translation,
            }))
          : undefined,
      };

      const adjGrammar: FormatAAdjectiveGrammar = {
        pos: PartOfSpeech.Adjective,
        position: AdjectivePosition.Variable,
        masculine: masc || undefined,
        feminine: fem || undefined,
        has_distinct_meanings: hasDistinctMeanings,
        before_entry: beforeEntry,
        after_entry: afterEntry,
        trc_meaning: beforeEn || beforeVi ? { meaning_en: beforeEn, meaning_vi: beforeVi } : undefined,
        sau_meaning: afterEn || afterVi ? { meaning_en: afterEn, meaning_vi: afterVi } : undefined,
      };

      const combinedCollocations = Array.from(new Set([...beforeCollocations, ...afterCollocations]));
      const combinedSynonyms = Array.from(new Set([...beforeSynonyms, ...afterSynonyms]));
      const combinedAntonyms = Array.from(new Set([...beforeAntonyms, ...afterAntonyms]));
      const combinedExamples = [
        ...beforeValidExamples.map((ex) => ({
          french: ex.french,
          vietnamese: ex.translation,
          english: ex.translation,
        })),
        ...afterValidExamples.map((ex) => ({
          french: ex.french,
          vietnamese: ex.translation,
          english: ex.translation,
        })),
      ];

      let topMeaningEn = '';
      let topMeaningVi = '';

      if (hasDistinctMeanings) {
        topMeaningEn = [beforeEn, afterEn].filter(Boolean).join(' / ');
        topMeaningVi = [beforeVi, afterVi].filter(Boolean).join(' / ');
      } else {
        topMeaningEn = beforeEn || afterEn;
        topMeaningVi = beforeVi || afterVi;
      }

      const positionalUnits = hasDistinctMeanings
        ? {
            before: {
              position: 'before' as const,
              meaning_en: beforeEn || undefined,
              meaning_vi: beforeVi || undefined,
              level,
            },
            after: {
              position: 'after' as const,
              meaning_en: afterEn || undefined,
              meaning_vi: afterVi || undefined,
              level,
            },
          }
        : undefined;

      const formatA: FormatAData = {
        entry: surfaceForm,
        grammar: adjGrammar,
        meaning_en: topMeaningEn,
        meaning_vi: topMeaningVi,
        collocations: combinedCollocations.length > 0 ? combinedCollocations : undefined,
        synonyms: combinedSynonyms.length > 0 ? combinedSynonyms : undefined,
        antonyms: combinedAntonyms.length > 0 ? combinedAntonyms : undefined,
        examples: combinedExamples.length > 0 ? combinedExamples : undefined,
        example: combinedExamples.length > 0 ? combinedExamples[0] : { french: '', english: '' },
      };

      const newItem: VocabularyItem = {
        id: newItemId,
        surface_form: surfaceForm,
        normalized_form: surfaceForm.toLowerCase(),
        part_of_speech: PartOfSpeech.Adjective,
        level,
        positional_units: positionalUnits,
        format_a: formatA,
        created_at: now,
        updated_at: now,
      };

      onAdd(newItem);
      return true;
    }

    const trimmedEntry = entryWord.trim();
    const surfaceForm = trimmedEntry || meaningEn.trim() || meaningVi.trim() || 'Vocabulaire';

    const collocations = posCollocations.map((s) => s.trim()).filter(Boolean);
    const synonyms = posSynonyms.map((s) => s.trim()).filter(Boolean);
    const antonyms = posAntonyms.map((s) => s.trim()).filter(Boolean);
    const validExamples = posExamples
      .map((e) => ({ french: e.french.trim(), translation: e.translation.trim() }))
      .filter((e) => Boolean(e.french || e.translation));

    const formatA: FormatAData = {
      entry: trimmedEntry || surfaceForm,
      grammar: buildGrammar(selectedPos),
      meaning_en: meaningEn.trim(),
      meaning_vi: meaningVi.trim(),
      collocations: collocations.length > 0 ? collocations : undefined,
      synonyms: synonyms.length > 0 ? synonyms : undefined,
      antonyms: antonyms.length > 0 ? antonyms : undefined,
      examples: validExamples.length > 0
        ? validExamples.map((ex) => ({
            french: ex.french,
            vietnamese: ex.translation,
            english: ex.translation,
          }))
        : undefined,
      example: validExamples.length > 0
        ? {
            french: validExamples[0].french,
            vietnamese: validExamples[0].translation,
            english: validExamples[0].translation,
          }
        : { french: '', english: '' },
    };

    const now = new Date();
    const newItem: VocabularyItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`,
      surface_form: surfaceForm,
      normalized_form: surfaceForm.toLowerCase(),
      part_of_speech: selectedPos,
      level,
      format_a: formatA,
      created_at: now,
      updated_at: now,
    };

    onAdd(newItem);
    return true;
  };

  // Reset form to clean blank state
  const handleReset = () => {
    setEntryWord('');
    setSelectedPos(null);
    setMeaningEn('');
    setMeaningVi('');
    setNounGenderChoice(null);
    setNounMascForm('');
    setNounFemForm('');
    setNounCollocations([]);
    setNounSynonyms([]);
    setNounAntonyms([]);
    setNounExamples([]);
    setVerbGroup(undefined);
    setConjJe('');
    setConjTu('');
    setConjIl('');
    setConjNous('');
    setConjVous('');
    setConjIls('');
    setVerbCollocations([]);
    setVerbSynonyms([]);
    setVerbAntonyms([]);
    setVerbExamples([]);
    setConstructions([{ pattern: '', meaning_en: '', meaning_vi: '', example_fr: '', example_en: '' }]);
    setAdjPositionChoice(null);
    setAdjBeforeMasc('');
    setAdjBeforeFem('');
    setAdjBeforeMeaningEn('');
    setAdjBeforeMeaningVi('');
    setAdjBeforeExamples([]);
    setAdjBeforeSynonyms([]);
    setAdjBeforeAntonyms([]);
    setAdjBeforeCollocations([]);
    setAdjAfterMasc('');
    setAdjAfterFem('');
    setAdjAfterMeaningEn('');
    setAdjAfterMeaningVi('');
    setAdjAfterExamples([]);
    setAdjAfterSynonyms([]);
    setAdjAfterAntonyms([]);
    setAdjAfterCollocations([]);
    setPosExamples([]);
    setPosSynonyms([]);
    setPosAntonyms([]);
    setPosCollocations([]);
    setLevel(0);
    setToastNotice(null);
  };

  // Button 1: [ Huỷ ]
  const handleCancel = () => {
    handleReset();
    onClose();
  };

  // Button 2: [ Lưu ]
  const handleSaveAndExit = () => {
    if (saveCurrentWord()) {
      handleReset();
      onClose();
    }
  };

  // Button 3: [ Nhập thêm từ ]
  const handleSaveAndAddMore = () => {
    if (saveCurrentWord()) {
      handleReset();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div
        className="add-vocab-modal-card expanded-card-style"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add Vocabulary"
      >
        {/* ── TOP HEADER ── */}
        <div className="add-vocab-modal-header">
          <div className="modal-header-title-group">
            <h2 className="add-vocab-modal-title">Add new vocabulary</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── TOAST NOTICE ("Chưa có gì để lưu") ── */}
        {toastNotice && (
          <div className="add-vocab-toast-notice" role="alert">
            <span className="toast-icon">ℹ️</span>
            <span className="toast-text">{toastNotice}</span>
          </div>
        )}

        {/* ── MODAL SCROLLABLE BODY ── */}
        <div className="add-vocab-modal-body">
          {/* ══════════════════════════════════════════════════════════════
              BƯỚC 1: INPUT VOCABULARY WORD / PHRASE (Có Accent Toolbar)
              ══════════════════════════════════════════════════════════════ */}
          <div className="add-vocab-top-frame">
            <div className="add-vocab-top-label-row">
              <label htmlFor="french-vocab-input" className="add-vocab-top-label">
                French Vocabulary Word or Phrase
              </label>
              {entryWord && (
                <button
                  type="button"
                  className="btn-clear-top-input"
                  onClick={() => {
                    setEntryWord('');
                    inputRef.current?.focus();
                  }}
                  title="Clear input"
                  aria-label="Clear input"
                >
                  × Clear
                </button>
              )}
            </div>

            <div className="add-vocab-input-box-wrapper">
              <input
                ref={inputRef}
                id="french-vocab-input"
                type="text"
                className="add-vocab-large-input"
                placeholder="e.g. maison, parler, grand, rapidement, toujours..."
                value={entryWord}
                onChange={handleInputChange}
                autoComplete="off"
                autoFocus
              />
            </div>

            {/* French Accent Characters Toolbar */}
            <div className="add-vocab-accents-row">
              <FrenchAccentToolbar onInsertChar={handleInsertChar} />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              BƯỚC 2 & 3: 9 PARTS OF SPEECH BUTTONS
              - 5 nút hàng trên
              - 4 nút hàng dưới
              - Không nút "Other"
              - Không AI auto-select
              ══════════════════════════════════════════════════════════════ */}
          <div className="pos-selection-section">
            <div className="pos-selection-header">
              <span className="pos-selection-title">Chọn từ loại (Part of Speech):</span>
            </div>

            <div className="pos-buttons-grid">
              {/* Hàng 1 (5 nút): Nom | Verbe | Adjectif | Adverbe | Conjonction */}
              <div className="pos-row pos-row--top">
                {ORDERED_PARTS_OF_SPEECH.slice(0, 5).map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    className={`btn-pos-pill ${selectedPos === pos.id ? 'is-selected' : ''}`}
                    onClick={() => handleSelectPos(pos.id)}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>

              {/* Hàng 2 (4 nút): Déterminant | Interjection | Préposition | Pronom */}
              <div className="pos-row pos-row--bottom">
                {ORDERED_PARTS_OF_SPEECH.slice(5).map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    className={`btn-pos-pill ${selectedPos === pos.id ? 'is-selected' : ''}`}
                    onClick={() => handleSelectPos(pos.id)}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              BƯỚC 4: INPUT PANEL LỚN THEO FORMAT A
              - Phong cách tương tự expanded vocabulary card
              - Chứa các field tương ứng với POS
              - Không hiển thị AI-generated knowledge
              - Cho phép partial data
              ══════════════════════════════════════════════════════════════ */}
          <div className="format-a-input-container">
            {selectedPos && (
              <div className="format-a-fields-card">
                <div className="fields-card-header">
                  <span className="fields-header-badge">
                    {ORDERED_PARTS_OF_SPEECH.find((p) => p.id === selectedPos)?.label}
                  </span>
                  <span className="fields-header-note">
                    (Có thể để trống các mục chưa có thông tin)
                  </span>
                </div>

                {/* ── SECTION 1: NGHĨA CHÍNH (MEANINGS) — Non-Adjectives ── */}
                {selectedPos !== PartOfSpeech.Adjective && (
                  <div className="form-section">
                    <h4 className="form-section-heading">1. Định nghĩa &amp; Ý nghĩa (Meanings)</h4>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="input-meaning-en">
                          Nghĩa tiếng Anh (English Meaning)
                        </label>
                        <input
                          id="input-meaning-en"
                          type="text"
                          className="form-input"
                          placeholder="e.g. house, to speak, fast, always..."
                          value={meaningEn}
                          onChange={(e) => setMeaningEn(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="input-meaning-vi">
                          Nghĩa tiếng Việt (Vietnamese Meaning)
                        </label>
                        <input
                          id="input-meaning-vi"
                          type="text"
                          className="form-input"
                          placeholder="e.g. ngôi nhà, nói chuyện, nhanh, luôn luôn..."
                          value={meaningVi}
                          onChange={(e) => setMeaningVi(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SECTION 2: GENDER & FORMS (FOR NOUN) ── */}
                {selectedPos === PartOfSpeech.Noun && (
                  <div className="form-section pos-specific-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <h4 className="form-section-heading" style={{ margin: 0 }}>2. Giống &amp; Dạng từ (Gender &amp; Forms)</h4>
                      <FrenchAccentToolbar onInsertChar={handleInsertChar} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Chọn giống (User chọn — Không tự đoán):</label>
                      <div className="gender-btn-group">
                        <button
                          type="button"
                          className={`btn-gender-select ${nounGenderChoice === 'masculine' ? 'is-active' : ''}`}
                          onClick={() => setNounGenderChoice(nounGenderChoice === 'masculine' ? null : 'masculine')}
                        >
                          Masculin
                        </button>
                        <button
                          type="button"
                          className={`btn-gender-select ${nounGenderChoice === 'feminine' ? 'is-active' : ''}`}
                          onClick={() => setNounGenderChoice(nounGenderChoice === 'feminine' ? null : 'feminine')}
                        >
                          Féminin
                        </button>
                        <button
                          type="button"
                          className={`btn-gender-select ${nounGenderChoice === 'both' ? 'is-active' : ''}`}
                          onClick={() => {
                            if (nounGenderChoice === 'both') {
                              setNounGenderChoice(null);
                            } else {
                              setNounGenderChoice('both');
                              const clean = cleanNounLemma(entryWord);
                              if (!nounMascForm && clean) {
                                setNounMascForm(clean);
                              }
                              if (!nounFemForm && clean) {
                                setNounFemForm(clean);
                              }
                            }
                          }}
                        >
                          Masculin + Féminin
                        </button>
                      </div>
                    </div>

                    {/* DUAL GENDER INPUTS: Masculin & Féminin fields (§8) */}
                    {nounGenderChoice === 'both' && (
                      <div className="dual-gender-inputs-box">
                        <span className="dual-gender-note">
                          Nhập riêng hai dạng giống đực và giống cái của từ vựng (ví dụ: acteur / actrice, hoặc élève / élève):
                        </span>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="input-noun-masc">
                              Masculin (giống đực):
                            </label>
                            <input
                              id="input-noun-masc"
                              type="text"
                              className="form-input"
                              placeholder="e.g. acteur, ami, élève..."
                              value={nounMascForm}
                              onChange={(e) => setNounMascForm(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="input-noun-fem">
                              Féminin (giống cái):
                            </label>
                            <input
                              id="input-noun-fem"
                              type="text"
                              className="form-input"
                              placeholder="e.g. actrice, amie, élève..."
                              value={nounFemForm}
                              onChange={(e) => setNounFemForm(e.target.value)}
                            />
                          </div>
                        </div>

                        {Boolean(
                          nounMascForm.trim() &&
                          nounFemForm.trim() &&
                          cleanNounLemma(nounMascForm).toLowerCase() === cleanNounLemma(nounFemForm).toLowerCase()
                        ) && (
                          <div
                            className="shared-form-detected-badge"
                            style={{
                              marginTop: '10px',
                              fontSize: '12px',
                              lineHeight: '1.4',
                              color: '#166534',
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontWeight: 500,
                            }}
                          >
                            ✓ Shared form: Dạng viết giống nhau ({cleanNounLemma(nounMascForm)}). Trên card sẽ hiển thị 1 form đại diện kèm (n, mas - fem), hệ thống lưu đầy đủ cả hai giống.
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── COLLOCATIONS LIST (§9) ── */}
                    <div className="form-group noun-dynamic-list-group" style={{ marginTop: '14px' }}>
                      <div className="dynamic-list-header">
                        <label className="form-label">Collocations (cụm từ đi kèm — tuỳ chọn):</label>
                        <button
                          type="button"
                          className="btn-add-dynamic-item"
                          onClick={handleAddNounCollocation}
                        >
                          + Thêm Collocation
                        </button>
                      </div>
                      {nounCollocations.length === 0 ? (
                        <span className="dynamic-list-empty-hint">
                          (Chưa có collocation nào — nhấn « + Thêm Collocation » nếu muốn thêm)
                        </span>
                      ) : (
                        <div className="dynamic-items-container">
                          {nounCollocations.map((col, idx) => (
                            <div key={idx} className="dynamic-item-row">
                              <input
                                type="text"
                                className="form-input dynamic-item-input"
                                placeholder={`e.g. ${idx === 0 ? 'grand homme' : 'faire attention'}`}
                                value={col}
                                onChange={(e) => handleUpdateNounCollocation(idx, e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn-remove-dynamic-item"
                                onClick={() => handleRemoveNounCollocation(idx)}
                                title="Xoá entry này"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── SYNONYMS & ANTONYMS LISTS (§9) ── */}
                    <div className="form-grid-2" style={{ marginTop: '14px' }}>
                      {/* Synonyms */}
                      <div className="form-group noun-dynamic-list-group">
                        <div className="dynamic-list-header">
                          <label className="form-label">Synonyms (đồng nghĩa):</label>
                          <button
                            type="button"
                            className="btn-add-dynamic-item"
                            onClick={handleAddNounSynonym}
                          >
                            + Thêm
                          </button>
                        </div>
                        {nounSynonyms.length === 0 ? (
                          <span className="dynamic-list-empty-hint">(Chưa có từ đồng nghĩa nào)</span>
                        ) : (
                          <div className="dynamic-items-container">
                            {nounSynonyms.map((syn, idx) => (
                              <div key={idx} className="dynamic-item-row">
                                <input
                                  type="text"
                                  className="form-input dynamic-item-input"
                                  placeholder="e.g. camarade"
                                  value={syn}
                                  onChange={(e) => handleUpdateNounSynonym(idx, e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn-remove-dynamic-item"
                                  onClick={() => handleRemoveNounSynonym(idx)}
                                  title="Xoá"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Antonyms */}
                      <div className="form-group noun-dynamic-list-group">
                        <div className="dynamic-list-header">
                          <label className="form-label">Antonyms (trái nghĩa):</label>
                          <button
                            type="button"
                            className="btn-add-dynamic-item"
                            onClick={handleAddNounAntonym}
                          >
                            + Thêm
                          </button>
                        </div>
                        {nounAntonyms.length === 0 ? (
                          <span className="dynamic-list-empty-hint">(Chưa có từ trái nghĩa nào)</span>
                        ) : (
                          <div className="dynamic-items-container">
                            {nounAntonyms.map((ant, idx) => (
                              <div key={idx} className="dynamic-item-row">
                                <input
                                  type="text"
                                  className="form-input dynamic-item-input"
                                  placeholder="e.g. ennemi"
                                  value={ant}
                                  onChange={(e) => handleUpdateNounAntonym(idx, e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn-remove-dynamic-item"
                                  onClick={() => handleRemoveNounAntonym(idx)}
                                  title="Xoá"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── EXAMPLES LIST (§13) ── */}
                    <div className="form-group noun-dynamic-list-group" style={{ marginTop: '14px' }}>
                      <div className="dynamic-list-header">
                        <label className="form-label">Examples (ví dụ câu — tuỳ chọn):</label>
                        <button
                          type="button"
                          className="btn-add-dynamic-item"
                          onClick={handleAddNounExample}
                        >
                          + Thêm Ví dụ
                        </button>
                      </div>
                      {nounExamples.length === 0 ? (
                        <span className="dynamic-list-empty-hint">
                          (Chưa có ví dụ nào — nhấn « + Thêm Ví dụ » nếu muốn thêm)
                        </span>
                      ) : (
                        <div className="dynamic-items-container">
                          {nounExamples.map((ex, idx) => (
                            <div key={idx} className="dynamic-item-row" style={{ alignItems: 'flex-start' }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Câu tiếng Pháp (e.g. C'est un beau livre.)"
                                  value={ex.french}
                                  onChange={(e) => handleUpdateNounExample(idx, 'french', e.target.value)}
                                />
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Dịch nghĩa tiếng Việt / Anh (e.g. Đây là một cuốn sách hay.)"
                                  value={ex.translation}
                                  onChange={(e) => handleUpdateNounExample(idx, 'translation', e.target.value)}
                                />
                              </div>
                              <button
                                type="button"
                                className="btn-remove-dynamic-item"
                                style={{ marginTop: '2px' }}
                                onClick={() => handleRemoveNounExample(idx)}
                                title="Xoá ví dụ này"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedPos === PartOfSpeech.Verb && (
                  <div className="form-section pos-specific-section">
                    <h4 className="form-section-heading">2. Nhóm &amp; Chia động từ (Verb Grammar)</h4>
                    
                    {/* Nhóm động từ */}
                    <div className="form-group">
                      <label className="form-label">Nhóm động từ (Verb Group):</label>
                      <div className="verb-group-options">
                        <button
                          type="button"
                          className={`btn-group-select ${verbGroup === VerbGroup.First ? 'is-active' : ''}`}
                          onClick={() => setVerbGroup(verbGroup === VerbGroup.First ? undefined : VerbGroup.First)}
                        >
                          Nhóm 1 (-er)
                        </button>
                        <button
                          type="button"
                          className={`btn-group-select ${verbGroup === VerbGroup.Second ? 'is-active' : ''}`}
                          onClick={() => setVerbGroup(verbGroup === VerbGroup.Second ? undefined : VerbGroup.Second)}
                        >
                          Nhóm 2 (-ir)
                        </button>
                        <button
                          type="button"
                          className={`btn-group-select ${verbGroup === VerbGroup.Third ? 'is-active' : ''}`}
                          onClick={() => setVerbGroup(verbGroup === VerbGroup.Third ? undefined : VerbGroup.Third)}
                        >
                          Nhóm 3 (Bất quy tắc)
                        </button>
                      </div>
                    </div>

                    {/* Chia thì hiện tại (6 ngôi) */}
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <label className="form-label" style={{ margin: 0 }}>Chia thì hiện tại (Present Conjugation):</label>
                        <FrenchAccentToolbar onInsertChar={handleInsertChar} />
                      </div>
                      <div className="conjugation-grid">
                        <div className="conj-field">
                          <span className="conj-subject">je / j'</span>
                          <input
                            type="text"
                            className="form-input conj-input"
                            placeholder="e.g. parle"
                            value={conjJe}
                            onChange={(e) => setConjJe(e.target.value)}
                          />
                        </div>
                        <div className="conj-field">
                          <span className="conj-subject">tu</span>
                          <input
                            type="text"
                            className="form-input conj-input"
                            placeholder="e.g. parles"
                            value={conjTu}
                            onChange={(e) => setConjTu(e.target.value)}
                          />
                        </div>
                        <div className="conj-field">
                          <span className="conj-subject">il / elle / on</span>
                          <input
                            type="text"
                            className="form-input conj-input"
                            placeholder="e.g. parle"
                            value={conjIl}
                            onChange={(e) => setConjIl(e.target.value)}
                          />
                        </div>
                        <div className="conj-field">
                          <span className="conj-subject">nous</span>
                          <input
                            type="text"
                            className="form-input conj-input"
                            placeholder="e.g. parlons"
                            value={conjNous}
                            onChange={(e) => setConjNous(e.target.value)}
                          />
                        </div>
                        <div className="conj-field">
                          <span className="conj-subject">vous</span>
                          <input
                            type="text"
                            className="form-input conj-input"
                            placeholder="e.g. parlez"
                            value={conjVous}
                            onChange={(e) => setConjVous(e.target.value)}
                          />
                        </div>
                        <div className="conj-field">
                          <span className="conj-subject">ils / elles</span>
                          <input
                            type="text"
                            className="form-input conj-input"
                            placeholder="e.g. parlent"
                            value={conjIls}
                            onChange={(e) => setConjIls(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cấu trúc đi kèm (Constructions) */}
                    <div className="form-group">
                      <div className="construction-header-row">
                        <label className="form-label">Cấu trúc đi kèm (Constructions — tối đa 3):</label>
                        {constructions.length < 3 && (
                          <button
                            type="button"
                            className="btn-add-construction-row"
                            onClick={handleAddConstruction}
                          >
                            + Thêm cấu trúc
                          </button>
                        )}
                      </div>

                      <div className="construction-inputs-list">
                        {constructions.map((c, idx) => (
                          <div key={idx} className="construction-item-box">
                            <div className="construction-box-header">
                              <span className="c-idx-tag">Cấu trúc {idx + 1}</span>
                              {constructions.length > 1 && (
                                <button
                                  type="button"
                                  className="btn-remove-c"
                                  onClick={() => handleRemoveConstruction(idx)}
                                >
                                  Xoá
                                </button>
                              )}
                            </div>
                            <div className="form-group">
                              <label className="form-sublabel">Mẫu cấu trúc (dùng Vo, sone, sth):</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. parler à sone, attendre sth..."
                                value={c.pattern}
                                onChange={(e) => handleUpdateConstruction(idx, 'pattern', e.target.value)}
                              />
                            </div>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label className="form-sublabel">Nghĩa tiếng Anh:</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="e.g. to talk to someone"
                                  value={c.meaning_en}
                                  onChange={(e) => handleUpdateConstruction(idx, 'meaning_en', e.target.value)}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-sublabel">Nghĩa tiếng Việt:</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="e.g. nói chuyện với ai đó"
                                  value={c.meaning_vi}
                                  onChange={(e) => handleUpdateConstruction(idx, 'meaning_vi', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── COLLOCATIONS LIST (§1, §4) ── */}
                    <div className="form-group noun-dynamic-list-group" style={{ marginTop: '14px' }}>
                      <div className="dynamic-list-header">
                        <label className="form-label">Collocations (cụm từ đi kèm — tuỳ chọn):</label>
                        <button
                          type="button"
                          className="btn-add-dynamic-item"
                          onClick={handleAddVerbCollocation}
                        >
                          + Thêm Collocation
                        </button>
                      </div>
                      {verbCollocations.length === 0 ? (
                        <span className="dynamic-list-empty-hint">
                          (Chưa có collocation nào — nhấn « + Thêm Collocation » nếu muốn thêm)
                        </span>
                      ) : (
                        <div className="dynamic-items-container">
                          {verbCollocations.map((col, idx) => (
                            <div key={idx} className="dynamic-item-row">
                              <input
                                type="text"
                                className="form-input dynamic-item-input"
                                placeholder={`e.g. ${idx === 0 ? 'parler français' : 'parler de tout'}`}
                                value={col}
                                onChange={(e) => handleUpdateVerbCollocation(idx, e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn-remove-dynamic-item"
                                onClick={() => handleRemoveVerbCollocation(idx)}
                                title="Xoá entry này"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── SYNONYMS & ANTONYMS LISTS (§1, §4) ── */}
                    <div className="form-grid-2" style={{ marginTop: '14px' }}>
                      {/* Synonyms */}
                      <div className="form-group noun-dynamic-list-group">
                        <div className="dynamic-list-header">
                          <label className="form-label">Synonyms (đồng nghĩa):</label>
                          <button
                            type="button"
                            className="btn-add-dynamic-item"
                            onClick={handleAddVerbSynonym}
                          >
                            + Thêm
                          </button>
                        </div>
                        {verbSynonyms.length === 0 ? (
                          <span className="dynamic-list-empty-hint">(Chưa có từ đồng nghĩa nào)</span>
                        ) : (
                          <div className="dynamic-items-container">
                            {verbSynonyms.map((syn, idx) => (
                              <div key={idx} className="dynamic-item-row">
                                <input
                                  type="text"
                                  className="form-input dynamic-item-input"
                                  placeholder="e.g. bavarder, discuter"
                                  value={syn}
                                  onChange={(e) => handleUpdateVerbSynonym(idx, e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn-remove-dynamic-item"
                                  onClick={() => handleRemoveVerbSynonym(idx)}
                                  title="Xoá"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Antonyms */}
                      <div className="form-group noun-dynamic-list-group">
                        <div className="dynamic-list-header">
                          <label className="form-label">Antonyms (trái nghĩa):</label>
                          <button
                            type="button"
                            className="btn-add-dynamic-item"
                            onClick={handleAddVerbAntonym}
                          >
                            + Thêm
                          </button>
                        </div>
                        {verbAntonyms.length === 0 ? (
                          <span className="dynamic-list-empty-hint">(Chưa có từ trái nghĩa nào)</span>
                        ) : (
                          <div className="dynamic-items-container">
                            {verbAntonyms.map((ant, idx) => (
                              <div key={idx} className="dynamic-item-row">
                                <input
                                  type="text"
                                  className="form-input dynamic-item-input"
                                  placeholder="e.g. se taire"
                                  value={ant}
                                  onChange={(e) => handleUpdateVerbAntonym(idx, e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn-remove-dynamic-item"
                                  onClick={() => handleRemoveVerbAntonym(idx)}
                                  title="Xoá"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── EXAMPLES LIST (§1, §4) ── */}
                    <div className="form-group noun-dynamic-list-group" style={{ marginTop: '14px' }}>
                      <div className="dynamic-list-header">
                        <label className="form-label">Examples (ví dụ câu — tuỳ chọn):</label>
                        <button
                          type="button"
                          className="btn-add-dynamic-item"
                          onClick={handleAddVerbExample}
                        >
                          + Thêm Ví dụ
                        </button>
                      </div>
                      {verbExamples.length === 0 ? (
                        <span className="dynamic-list-empty-hint">
                          (Chưa có ví dụ nào — nhấn « + Thêm Ví dụ » nếu muốn thêm)
                        </span>
                      ) : (
                        <div className="dynamic-items-container">
                          {verbExamples.map((ex, idx) => (
                            <div key={idx} className="dynamic-item-row" style={{ alignItems: 'flex-start' }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Câu tiếng Pháp (e.g. Nous parlons français tous les jours.)"
                                  value={ex.french}
                                  onChange={(e) => handleUpdateVerbExample(idx, 'french', e.target.value)}
                                />
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Dịch nghĩa tiếng Việt / Anh (e.g. Chúng tôi nói tiếng Pháp mỗi ngày.)"
                                  value={ex.translation}
                                  onChange={(e) => handleUpdateVerbExample(idx, 'translation', e.target.value)}
                                />
                              </div>
                              <button
                                type="button"
                                className="btn-remove-dynamic-item"
                                style={{ marginTop: '2px' }}
                                onClick={() => handleRemoveVerbExample(idx)}
                                title="Xoá ví dụ này"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedPos === PartOfSpeech.Adjective && (
                  <div className="form-section pos-specific-section adj-form-section">
                    <h4 className="form-section-heading">Vị trí &amp; Cấu trúc Tính từ (Adjective)</h4>

                    {/* Step 1: Position selection (3 buttons: [ Trước nom ], [ Sau nom ], [ Trước và sau nom ]) */}
                    <div className="form-group">
                      <label className="form-label">Chọn vị trí tính từ đối với danh từ:</label>
                      <div className="adj-position-options">
                        <button
                          type="button"
                          className={`btn-pos-attr ${adjPositionChoice === 'before' ? 'is-active' : ''}`}
                          onClick={() => {
                            setAdjPositionChoice('before');
                            if (!adjBeforeMasc && entryWord) {
                              setAdjBeforeMasc(entryWord);
                            }
                          }}
                        >
                          Trước nom
                        </button>
                        <button
                          type="button"
                          className={`btn-pos-attr ${adjPositionChoice === 'after' ? 'is-active' : ''}`}
                          onClick={() => {
                            setAdjPositionChoice('after');
                            if (!adjAfterMasc && entryWord) {
                              setAdjAfterMasc(entryWord);
                            }
                          }}
                        >
                          Sau nom
                        </button>
                        <button
                          type="button"
                          className={`btn-pos-attr ${adjPositionChoice === 'both' ? 'is-active' : ''}`}
                          onClick={() => {
                            setAdjPositionChoice('both');
                            if (!adjBeforeMasc && entryWord) {
                              setAdjBeforeMasc(entryWord);
                            }
                            if (!adjAfterMasc) {
                              setAdjAfterMasc(adjBeforeMasc || entryWord);
                            }
                            if (!adjAfterFem && adjBeforeFem) {
                              setAdjAfterFem(adjBeforeFem);
                            }
                          }}
                        >
                          Trước và sau nom
                        </button>
                      </div>
                    </div>

                    {adjPositionChoice && (
                      <div style={{ margin: '10px 0 14px' }}>
                        <FrenchAccentToolbar onInsertChar={handleInsertChar} />
                      </div>
                    )}

                    {!adjPositionChoice && (
                      <div className="adj-pos-unselected-hint">
                        <span className="hint-icon">👉</span>
                        <span>Vui lòng chọn 1 trong 3 vị trí trên để hiển thị khung nhập liệu chi tiết.</span>
                      </div>
                    )}

                    {/* Case 1: Trước nom (§3) */}
                    {adjPositionChoice === 'before' && (
                      <div className="adj-single-panel-container">
                        <div className="adj-subpanel-header">
                          <span className="adj-subpanel-title">Khung nhập liệu: Trước nom (+ N)</span>
                        </div>
                        {/* Gender & Forms */}
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="adj-before-masc">
                              Masculin (giống đực) — (adj, mas):
                            </label>
                            <input
                              id="adj-before-masc"
                              type="text"
                              className="form-input"
                              placeholder="e.g. grand, beau, bon"
                              value={adjBeforeMasc}
                              onChange={(e) => setAdjBeforeMasc(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="adj-before-fem">
                              Féminin (giống cái) — (adj, fem):
                            </label>
                            <input
                              id="adj-before-fem"
                              type="text"
                              className="form-input"
                              placeholder="e.g. grande, belle, bonne"
                              value={adjBeforeFem}
                              onChange={(e) => setAdjBeforeFem(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Meanings */}
                        <div className="form-grid-2" style={{ marginTop: '12px' }}>
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="adj-before-meaning-en">
                              English meaning:
                            </label>
                            <input
                              id="adj-before-meaning-en"
                              type="text"
                              className="form-input"
                              placeholder="e.g. big, great"
                              value={adjBeforeMeaningEn}
                              onChange={(e) => setAdjBeforeMeaningEn(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="adj-before-meaning-vi">
                              Vietnamese meaning:
                            </label>
                            <input
                              id="adj-before-meaning-vi"
                              type="text"
                              className="form-input"
                              placeholder="e.g. to lớn, vĩ đại"
                              value={adjBeforeMeaningVi}
                              onChange={(e) => setAdjBeforeMeaningVi(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Collocations */}
                        <div className="form-group noun-dynamic-list-group" style={{ marginTop: '12px' }}>
                          <div className="dynamic-list-header">
                            <label className="form-sublabel">Collocations (cụm từ đi kèm):</label>
                            <button
                              type="button"
                              className="btn-add-dynamic-item"
                              onClick={handleAddAdjBeforeCollocation}
                            >
                              + Thêm Collocation
                            </button>
                          </div>
                          {adjBeforeCollocations.length > 0 && (
                            <div className="dynamic-items-container">
                              {adjBeforeCollocations.map((col, idx) => (
                                <div key={idx} className="dynamic-item-row">
                                  <input
                                    type="text"
                                    className="form-input dynamic-item-input"
                                    placeholder="e.g. grand homme"
                                    value={col}
                                    onChange={(e) => handleUpdateAdjBeforeCollocation(idx, e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="btn-remove-dynamic-item"
                                    onClick={() => handleRemoveAdjBeforeCollocation(idx)}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Synonyms & Antonyms */}
                        <div className="form-grid-2" style={{ marginTop: '12px' }}>
                          <div className="form-group noun-dynamic-list-group">
                            <div className="dynamic-list-header">
                              <label className="form-sublabel">Synonyms (đồng nghĩa):</label>
                              <button
                                type="button"
                                className="btn-add-dynamic-item"
                                onClick={handleAddAdjBeforeSynonym}
                              >
                                + Thêm
                              </button>
                            </div>
                            {adjBeforeSynonyms.length > 0 && (
                              <div className="dynamic-items-container">
                                {adjBeforeSynonyms.map((syn, idx) => (
                                  <div key={idx} className="dynamic-item-row">
                                    <input
                                      type="text"
                                      className="form-input dynamic-item-input"
                                      placeholder="e.g. immense"
                                      value={syn}
                                      onChange={(e) => handleUpdateAdjBeforeSynonym(idx, e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn-remove-dynamic-item"
                                      onClick={() => handleRemoveAdjBeforeSynonym(idx)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="form-group noun-dynamic-list-group">
                            <div className="dynamic-list-header">
                              <label className="form-sublabel">Antonyms (trái nghĩa):</label>
                              <button
                                type="button"
                                className="btn-add-dynamic-item"
                                onClick={handleAddAdjBeforeAntonym}
                              >
                                + Thêm
                              </button>
                            </div>
                            {adjBeforeAntonyms.length > 0 && (
                              <div className="dynamic-items-container">
                                {adjBeforeAntonyms.map((ant, idx) => (
                                  <div key={idx} className="dynamic-item-row">
                                    <input
                                      type="text"
                                      className="form-input dynamic-item-input"
                                      placeholder="e.g. petit"
                                      value={ant}
                                      onChange={(e) => handleUpdateAdjBeforeAntonym(idx, e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn-remove-dynamic-item"
                                      onClick={() => handleRemoveAdjBeforeAntonym(idx)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Examples */}
                        <div className="form-group noun-dynamic-list-group" style={{ marginTop: '12px' }}>
                          <div className="dynamic-list-header">
                            <label className="form-sublabel">Examples (ví dụ câu):</label>
                            <button
                              type="button"
                              className="btn-add-dynamic-item"
                              onClick={handleAddAdjBeforeExample}
                            >
                              + Thêm Ví dụ
                            </button>
                          </div>
                          {adjBeforeExamples.length > 0 && (
                            <div className="dynamic-items-container">
                              {adjBeforeExamples.map((ex, idx) => (
                                <div key={idx} className="dynamic-item-row" style={{ alignItems: 'flex-start' }}>
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Câu tiếng Pháp (e.g. C'est un grand homme.)"
                                      value={ex.french}
                                      onChange={(e) => handleUpdateAdjBeforeExample(idx, 'french', e.target.value)}
                                    />
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Dịch nghĩa (e.g. Đó là một con người vĩ đại.)"
                                      value={ex.translation}
                                      onChange={(e) => handleUpdateAdjBeforeExample(idx, 'translation', e.target.value)}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-remove-dynamic-item"
                                    onClick={() => handleRemoveAdjBeforeExample(idx)}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Case 2: Sau nom (§4) */}
                    {adjPositionChoice === 'after' && (
                      <div className="adj-single-panel-container">
                        <div className="adj-subpanel-header">
                          <span className="adj-subpanel-title">Khung nhập liệu: Sau nom (N +)</span>
                        </div>
                        {/* Gender & Forms */}
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="adj-after-masc">
                              Masculin (giống đực) — (adj, mas):
                            </label>
                            <input
                              id="adj-after-masc"
                              type="text"
                              className="form-input"
                              placeholder="e.g. grand, rouge, facile"
                              value={adjAfterMasc}
                              onChange={(e) => setAdjAfterMasc(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="adj-after-fem">
                              Féminin (giống cái) — (adj, fem):
                            </label>
                            <input
                              id="adj-after-fem"
                              type="text"
                              className="form-input"
                              placeholder="e.g. grande, rouge, facile"
                              value={adjAfterFem}
                              onChange={(e) => setAdjAfterFem(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Meanings */}
                        <div className="form-grid-2" style={{ marginTop: '12px' }}>
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="adj-after-meaning-en">
                              English meaning:
                            </label>
                            <input
                              id="adj-after-meaning-en"
                              type="text"
                              className="form-input"
                              placeholder="e.g. tall, large"
                              value={adjAfterMeaningEn}
                              onChange={(e) => setAdjAfterMeaningEn(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-sublabel" htmlFor="adj-after-meaning-vi">
                              Vietnamese meaning:
                            </label>
                            <input
                              id="adj-after-meaning-vi"
                              type="text"
                              className="form-input"
                              placeholder="e.g. cao lớn, to"
                              value={adjAfterMeaningVi}
                              onChange={(e) => setAdjAfterMeaningVi(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Collocations */}
                        <div className="form-group noun-dynamic-list-group" style={{ marginTop: '12px' }}>
                          <div className="dynamic-list-header">
                            <label className="form-sublabel">Collocations (cụm từ đi kèm):</label>
                            <button
                              type="button"
                              className="btn-add-dynamic-item"
                              onClick={handleAddAdjAfterCollocation}
                            >
                              + Thêm Collocation
                            </button>
                          </div>
                          {adjAfterCollocations.length > 0 && (
                            <div className="dynamic-items-container">
                              {adjAfterCollocations.map((col, idx) => (
                                <div key={idx} className="dynamic-item-row">
                                  <input
                                    type="text"
                                    className="form-input dynamic-item-input"
                                    placeholder="e.g. homme grand"
                                    value={col}
                                    onChange={(e) => handleUpdateAdjAfterCollocation(idx, e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="btn-remove-dynamic-item"
                                    onClick={() => handleRemoveAdjAfterCollocation(idx)}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Synonyms & Antonyms */}
                        <div className="form-grid-2" style={{ marginTop: '12px' }}>
                          <div className="form-group noun-dynamic-list-group">
                            <div className="dynamic-list-header">
                              <label className="form-sublabel">Synonyms (đồng nghĩa):</label>
                              <button
                                type="button"
                                className="btn-add-dynamic-item"
                                onClick={handleAddAdjAfterSynonym}
                              >
                                + Thêm
                              </button>
                            </div>
                            {adjAfterSynonyms.length > 0 && (
                              <div className="dynamic-items-container">
                                {adjAfterSynonyms.map((syn, idx) => (
                                  <div key={idx} className="dynamic-item-row">
                                    <input
                                      type="text"
                                      className="form-input dynamic-item-input"
                                      placeholder="e.g. gigantesque"
                                      value={syn}
                                      onChange={(e) => handleUpdateAdjAfterSynonym(idx, e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn-remove-dynamic-item"
                                      onClick={() => handleRemoveAdjAfterSynonym(idx)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="form-group noun-dynamic-list-group">
                            <div className="dynamic-list-header">
                              <label className="form-sublabel">Antonyms (trái nghĩa):</label>
                              <button
                                type="button"
                                className="btn-add-dynamic-item"
                                onClick={handleAddAdjAfterAntonym}
                              >
                                + Thêm
                              </button>
                            </div>
                            {adjAfterAntonyms.length > 0 && (
                              <div className="dynamic-items-container">
                                {adjAfterAntonyms.map((ant, idx) => (
                                  <div key={idx} className="dynamic-item-row">
                                    <input
                                      type="text"
                                      className="form-input dynamic-item-input"
                                      placeholder="e.g. court, petit"
                                      value={ant}
                                      onChange={(e) => handleUpdateAdjAfterAntonym(idx, e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn-remove-dynamic-item"
                                      onClick={() => handleRemoveAdjAfterAntonym(idx)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Examples */}
                        <div className="form-group noun-dynamic-list-group" style={{ marginTop: '12px' }}>
                          <div className="dynamic-list-header">
                            <label className="form-sublabel">Examples (ví dụ câu):</label>
                            <button
                              type="button"
                              className="btn-add-dynamic-item"
                              onClick={handleAddAdjAfterExample}
                            >
                              + Thêm Ví dụ
                            </button>
                          </div>
                          {adjAfterExamples.length > 0 && (
                            <div className="dynamic-items-container">
                              {adjAfterExamples.map((ex, idx) => (
                                <div key={idx} className="dynamic-item-row" style={{ alignItems: 'flex-start' }}>
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Câu tiếng Pháp (e.g. Un homme grand est entré.)"
                                      value={ex.french}
                                      onChange={(e) => handleUpdateAdjAfterExample(idx, 'french', e.target.value)}
                                    />
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Dịch nghĩa (e.g. Một người đàn ông cao lớn bước vào.)"
                                      value={ex.translation}
                                      onChange={(e) => handleUpdateAdjAfterExample(idx, 'translation', e.target.value)}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-remove-dynamic-item"
                                    onClick={() => handleRemoveAdjAfterExample(idx)}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Case 3: Trước và sau nom (§5 — 2 bảng song song đặt cạnh nhau) */}
                    {adjPositionChoice === 'both' && (
                      <div className="adj-parallel-panels-container">
                        {/* BẢNG BÊN TRÁI: Trước nom */}
                        <div className="adj-subpanel adj-subpanel--before">
                          <div className="adj-subpanel-header">
                            <h4 className="adj-subpanel-title">BÊN TRÁI: Trước nom (+ N)</h4>
                          </div>

                          <div className="form-grid-2">
                            <div className="form-group">
                              <label className="form-sublabel" htmlFor="adj-both-before-masc">
                                Masculin (adj, mas):
                              </label>
                              <input
                                id="adj-both-before-masc"
                                type="text"
                                className="form-input"
                                placeholder="e.g. grand, ancien"
                                value={adjBeforeMasc}
                                onChange={(e) => setAdjBeforeMasc(e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-sublabel" htmlFor="adj-both-before-fem">
                                Féminin (adj, fem):
                              </label>
                              <input
                                id="adj-both-before-fem"
                                type="text"
                                className="form-input"
                                placeholder="e.g. grande, ancienne"
                                value={adjBeforeFem}
                                onChange={(e) => setAdjBeforeFem(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ marginTop: '8px' }}>
                            <label className="form-sublabel" htmlFor="adj-both-before-en">
                              English meaning (trc):
                            </label>
                            <input
                              id="adj-both-before-en"
                              type="text"
                              className="form-input"
                              placeholder="e.g. former, great"
                              value={adjBeforeMeaningEn}
                              onChange={(e) => setAdjBeforeMeaningEn(e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ marginTop: '8px' }}>
                            <label className="form-sublabel" htmlFor="adj-both-before-vi">
                              Vietnamese meaning (trc):
                            </label>
                            <input
                              id="adj-both-before-vi"
                              type="text"
                              className="form-input"
                              placeholder="e.g. cựu, vĩ đại"
                              value={adjBeforeMeaningVi}
                              onChange={(e) => setAdjBeforeMeaningVi(e.target.value)}
                            />
                          </div>

                          {/* Collocations */}
                          <div className="form-group noun-dynamic-list-group" style={{ marginTop: '8px' }}>
                            <div className="dynamic-list-header">
                              <label className="form-sublabel">Collocations:</label>
                              <button
                                type="button"
                                className="btn-add-dynamic-item"
                                onClick={handleAddAdjBeforeCollocation}
                              >
                                + Thêm
                              </button>
                            </div>
                            {adjBeforeCollocations.length > 0 && (
                              <div className="dynamic-items-container">
                                {adjBeforeCollocations.map((col, idx) => (
                                  <div key={idx} className="dynamic-item-row">
                                    <input
                                      type="text"
                                      className="form-input dynamic-item-input"
                                      placeholder="e.g. grand homme"
                                      value={col}
                                      onChange={(e) => handleUpdateAdjBeforeCollocation(idx, e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn-remove-dynamic-item"
                                      onClick={() => handleRemoveAdjBeforeCollocation(idx)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Synonyms & Antonyms */}
                          <div className="form-grid-2" style={{ marginTop: '8px' }}>
                            <div className="form-group noun-dynamic-list-group">
                              <div className="dynamic-list-header">
                                <label className="form-sublabel">Synonyms:</label>
                                <button
                                  type="button"
                                  className="btn-add-dynamic-item"
                                  onClick={handleAddAdjBeforeSynonym}
                                >
                                  + Thêm
                                </button>
                              </div>
                              {adjBeforeSynonyms.length > 0 && (
                                <div className="dynamic-items-container">
                                  {adjBeforeSynonyms.map((syn, idx) => (
                                    <div key={idx} className="dynamic-item-row">
                                      <input
                                        type="text"
                                        className="form-input dynamic-item-input"
                                        placeholder="Synonym"
                                        value={syn}
                                        onChange={(e) => handleUpdateAdjBeforeSynonym(idx, e.target.value)}
                                      />
                                      <button
                                        type="button"
                                        className="btn-remove-dynamic-item"
                                        onClick={() => handleRemoveAdjBeforeSynonym(idx)}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="form-group noun-dynamic-list-group">
                              <div className="dynamic-list-header">
                                <label className="form-sublabel">Antonyms:</label>
                                <button
                                  type="button"
                                  className="btn-add-dynamic-item"
                                  onClick={handleAddAdjBeforeAntonym}
                                >
                                  + Thêm
                                </button>
                              </div>
                              {adjBeforeAntonyms.length > 0 && (
                                <div className="dynamic-items-container">
                                  {adjBeforeAntonyms.map((ant, idx) => (
                                    <div key={idx} className="dynamic-item-row">
                                      <input
                                        type="text"
                                        className="form-input dynamic-item-input"
                                        placeholder="Antonym"
                                        value={ant}
                                        onChange={(e) => handleUpdateAdjBeforeAntonym(idx, e.target.value)}
                                      />
                                      <button
                                        type="button"
                                        className="btn-remove-dynamic-item"
                                        onClick={() => handleRemoveAdjBeforeAntonym(idx)}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Examples */}
                          <div className="form-group noun-dynamic-list-group" style={{ marginTop: '8px' }}>
                            <div className="dynamic-list-header">
                              <label className="form-sublabel">Examples:</label>
                              <button
                                type="button"
                                className="btn-add-dynamic-item"
                                onClick={handleAddAdjBeforeExample}
                              >
                                + Thêm
                              </button>
                            </div>
                            {adjBeforeExamples.length > 0 && (
                              <div className="dynamic-items-container">
                                {adjBeforeExamples.map((ex, idx) => (
                                  <div key={idx} className="dynamic-item-row" style={{ alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Français"
                                        value={ex.french}
                                        onChange={(e) => handleUpdateAdjBeforeExample(idx, 'french', e.target.value)}
                                      />
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Dịch nghĩa"
                                        value={ex.translation}
                                        onChange={(e) => handleUpdateAdjBeforeExample(idx, 'translation', e.target.value)}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className="btn-remove-dynamic-item"
                                      onClick={() => handleRemoveAdjBeforeExample(idx)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* BẢNG BÊN PHẢI: Sau nom */}
                        <div className="adj-subpanel adj-subpanel--after">
                          <div className="adj-subpanel-header">
                            <h4 className="adj-subpanel-title">BÊN PHẢI: Sau nom (N +)</h4>
                          </div>

                          <div className="form-grid-2">
                            <div className="form-group">
                              <label className="form-sublabel" htmlFor="adj-both-after-masc">
                                Masculin (adj, mas):
                              </label>
                              <input
                                id="adj-both-after-masc"
                                type="text"
                                className="form-input"
                                placeholder="e.g. grand, ancien"
                                value={adjAfterMasc}
                                onChange={(e) => setAdjAfterMasc(e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-sublabel" htmlFor="adj-both-after-fem">
                                Féminin (adj, fem):
                              </label>
                              <input
                                id="adj-both-after-fem"
                                type="text"
                                className="form-input"
                                placeholder="e.g. grande, ancienne"
                                value={adjAfterFem}
                                onChange={(e) => setAdjAfterFem(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ marginTop: '8px' }}>
                            <label className="form-sublabel" htmlFor="adj-both-after-en">
                              English meaning (sau):
                            </label>
                            <input
                              id="adj-both-after-en"
                              type="text"
                              className="form-input"
                              placeholder="e.g. old, ancient, tall"
                              value={adjAfterMeaningEn}
                              onChange={(e) => setAdjAfterMeaningEn(e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ marginTop: '8px' }}>
                            <label className="form-sublabel" htmlFor="adj-both-after-vi">
                              Vietnamese meaning (sau):
                            </label>
                            <input
                              id="adj-both-after-vi"
                              type="text"
                              className="form-input"
                              placeholder="e.g. cổ kính, cao lớn"
                              value={adjAfterMeaningVi}
                              onChange={(e) => setAdjAfterMeaningVi(e.target.value)}
                            />
                          </div>

                          {/* Collocations */}
                          <div className="form-group noun-dynamic-list-group" style={{ marginTop: '8px' }}>
                            <div className="dynamic-list-header">
                              <label className="form-sublabel">Collocations:</label>
                              <button
                                type="button"
                                className="btn-add-dynamic-item"
                                onClick={handleAddAdjAfterCollocation}
                              >
                                + Thêm
                              </button>
                            </div>
                            {adjAfterCollocations.length > 0 && (
                              <div className="dynamic-items-container">
                                {adjAfterCollocations.map((col, idx) => (
                                  <div key={idx} className="dynamic-item-row">
                                    <input
                                      type="text"
                                      className="form-input dynamic-item-input"
                                      placeholder="e.g. homme grand"
                                      value={col}
                                      onChange={(e) => handleUpdateAdjAfterCollocation(idx, e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn-remove-dynamic-item"
                                      onClick={() => handleRemoveAdjAfterCollocation(idx)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Synonyms & Antonyms */}
                          <div className="form-grid-2" style={{ marginTop: '8px' }}>
                            <div className="form-group noun-dynamic-list-group">
                              <div className="dynamic-list-header">
                                <label className="form-sublabel">Synonyms:</label>
                                <button
                                  type="button"
                                  className="btn-add-dynamic-item"
                                  onClick={handleAddAdjAfterSynonym}
                                >
                                  + Thêm
                                </button>
                              </div>
                              {adjAfterSynonyms.length > 0 && (
                                <div className="dynamic-items-container">
                                  {adjAfterSynonyms.map((syn, idx) => (
                                    <div key={idx} className="dynamic-item-row">
                                      <input
                                        type="text"
                                        className="form-input dynamic-item-input"
                                        placeholder="Synonym"
                                        value={syn}
                                        onChange={(e) => handleUpdateAdjAfterSynonym(idx, e.target.value)}
                                      />
                                      <button
                                        type="button"
                                        className="btn-remove-dynamic-item"
                                        onClick={() => handleRemoveAdjAfterSynonym(idx)}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="form-group noun-dynamic-list-group">
                              <div className="dynamic-list-header">
                                <label className="form-sublabel">Antonyms:</label>
                                <button
                                  type="button"
                                  className="btn-add-dynamic-item"
                                  onClick={handleAddAdjAfterAntonym}
                                >
                                  + Thêm
                                </button>
                              </div>
                              {adjAfterAntonyms.length > 0 && (
                                <div className="dynamic-items-container">
                                  {adjAfterAntonyms.map((ant, idx) => (
                                    <div key={idx} className="dynamic-item-row">
                                      <input
                                        type="text"
                                        className="form-input dynamic-item-input"
                                        placeholder="Antonym"
                                        value={ant}
                                        onChange={(e) => handleUpdateAdjAfterAntonym(idx, e.target.value)}
                                      />
                                      <button
                                        type="button"
                                        className="btn-remove-dynamic-item"
                                        onClick={() => handleRemoveAdjAfterAntonym(idx)}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Examples */}
                          <div className="form-group noun-dynamic-list-group" style={{ marginTop: '8px' }}>
                            <div className="dynamic-list-header">
                              <label className="form-sublabel">Examples:</label>
                              <button
                                type="button"
                                className="btn-add-dynamic-item"
                                onClick={handleAddAdjAfterExample}
                              >
                                + Thêm
                              </button>
                            </div>
                            {adjAfterExamples.length > 0 && (
                              <div className="dynamic-items-container">
                                {adjAfterExamples.map((ex, idx) => (
                                  <div key={idx} className="dynamic-item-row" style={{ alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Français"
                                        value={ex.french}
                                        onChange={(e) => handleUpdateAdjAfterExample(idx, 'french', e.target.value)}
                                      />
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Dịch nghĩa"
                                        value={ex.translation}
                                        onChange={(e) => handleUpdateAdjAfterExample(idx, 'translation', e.target.value)}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className="btn-remove-dynamic-item"
                                      onClick={() => handleRemoveAdjAfterExample(idx)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── SECTION 3 & 4: FOR OTHER 6 POS (Adverbe, Conjonction, Déterminant, Interjection, Préposition, Pronom) ── */}
                {selectedPos !== PartOfSpeech.Noun && selectedPos !== PartOfSpeech.Verb && selectedPos !== PartOfSpeech.Adjective && (
                  <div className="form-section pos-specific-section">
                    <h4 className="form-section-heading">2. Thông tin bổ sung (Collocations, Synonyms, Antonyms &amp; Ví dụ)</h4>

                    {/* French Accent toolbar helper for typing French accents */}
                    <div style={{ marginBottom: '12px' }}>
                      <FrenchAccentToolbar onInsertChar={handleInsertChar} />
                    </div>

                    {/* Collocations */}
                    <div className="form-group noun-dynamic-list-group">
                      <div className="dynamic-list-header">
                        <label className="form-label">Collocations (cụm từ đi kèm — tuỳ chọn):</label>
                        <button
                          type="button"
                          className="btn-add-dynamic-item"
                          onClick={handleAddPosCollocation}
                        >
                          + Thêm Collocation
                        </button>
                      </div>
                      {posCollocations.length > 0 && (
                        <div className="dynamic-items-container">
                          {posCollocations.map((col, idx) => (
                            <div key={idx} className="dynamic-item-row">
                              <input
                                type="text"
                                className="form-input dynamic-item-input"
                                placeholder="e.g. collocation..."
                                value={col}
                                onChange={(e) => handleUpdatePosCollocation(idx, e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn-remove-dynamic-item"
                                onClick={() => handleRemovePosCollocation(idx)}
                                title="Xoá entry này"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Synonyms & Antonyms */}
                    <div className="form-grid-2" style={{ marginTop: '12px' }}>
                      <div className="form-group noun-dynamic-list-group">
                        <div className="dynamic-list-header">
                          <label className="form-label">Synonyms (đồng nghĩa):</label>
                          <button
                            type="button"
                            className="btn-add-dynamic-item"
                            onClick={handleAddPosSynonym}
                          >
                            + Thêm
                          </button>
                        </div>
                        {posSynonyms.length > 0 && (
                          <div className="dynamic-items-container">
                            {posSynonyms.map((syn, idx) => (
                              <div key={idx} className="dynamic-item-row">
                                <input
                                  type="text"
                                  className="form-input dynamic-item-input"
                                  placeholder="e.g. synonym..."
                                  value={syn}
                                  onChange={(e) => handleUpdatePosSynonym(idx, e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn-remove-dynamic-item"
                                  onClick={() => handleRemovePosSynonym(idx)}
                                  title="Xoá entry này"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="form-group noun-dynamic-list-group">
                        <div className="dynamic-list-header">
                          <label className="form-label">Antonyms (trái nghĩa):</label>
                          <button
                            type="button"
                            className="btn-add-dynamic-item"
                            onClick={handleAddPosAntonym}
                          >
                            + Thêm
                          </button>
                        </div>
                        {posAntonyms.length > 0 && (
                          <div className="dynamic-items-container">
                            {posAntonyms.map((ant, idx) => (
                              <div key={idx} className="dynamic-item-row">
                                <input
                                  type="text"
                                  className="form-input dynamic-item-input"
                                  placeholder="e.g. antonym..."
                                  value={ant}
                                  onChange={(e) => handleUpdatePosAntonym(idx, e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn-remove-dynamic-item"
                                  onClick={() => handleRemovePosAntonym(idx)}
                                  title="Xoá entry này"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Examples */}
                    <div className="form-group noun-dynamic-list-group" style={{ marginTop: '12px' }}>
                      <div className="dynamic-list-header">
                        <label className="form-label">Examples (ví dụ câu):</label>
                        <button
                          type="button"
                          className="btn-add-dynamic-item"
                          onClick={handleAddPosExample}
                        >
                          + Thêm Ví dụ
                        </button>
                      </div>
                      {posExamples.length > 0 && (
                        <div className="dynamic-items-container">
                          {posExamples.map((ex, idx) => (
                            <div key={idx} className="dynamic-item-row" style={{ alignItems: 'flex-start' }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Câu tiếng Pháp (e.g. sentence in French)"
                                  value={ex.french}
                                  onChange={(e) => handleUpdatePosExample(idx, 'french', e.target.value)}
                                />
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Dịch nghĩa (e.g. translation)"
                                  value={ex.translation}
                                  onChange={(e) => handleUpdatePosExample(idx, 'translation', e.target.value)}
                                />
                              </div>
                              <button
                                type="button"
                                className="btn-remove-dynamic-item"
                                onClick={() => handleRemovePosExample(idx)}
                                title="Xoá ví dụ này"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── SECTION 5: INITIAL SRS LEVEL SELECTOR ── */}
                <div className="add-vocab-level-selector">
                  <label htmlFor="init-vocab-level" className="level-select-label">
                    Cấp độ ghi nhớ ban đầu (Initial Memory Level):
                  </label>
                  <select
                    id="init-vocab-level"
                    className="modal-level-select"
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value) as VocabLevel)}
                  >
                    <option value={0}>Level 0 (Mới — Ôn tập ngay lập tức)</option>
                    <option value={1}>Level 1 (Mới bắt đầu — 10 phút)</option>
                    <option value={2}>Level 2 (Ghi nhớ ban đầu — 1 ngày)</option>
                    <option value={3}>Level 3 (Ghi nhớ trung gian — 3 ngày)</option>
                    <option value={4}>Level 4 (Củng cố kiến thức — 7 ngày)</option>
                    <option value={5}>Level 5 (Thành thạo lâu dài — 21 ngày)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            BOTTOM BUTTONS THEO ĐÚNG THỨ TỰ:
            [ Huỷ ]     [ Lưu ]     [ Nhập thêm từ ]
            ══════════════════════════════════════════════════════════════ */}
        <div className="add-vocab-bottom-bar">
          {/* Button 1: HUỶ — plain/basic button */}
          <button
            type="button"
            className="btn-action-cancel"
            onClick={handleCancel}
          >
            Huỷ
          </button>

          {/* Button 2: LƯU — exactly named "Lưu", primary highlight */}
          <button
            type="button"
            className="btn-action-save"
            onClick={handleSaveAndExit}
          >
            Lưu
          </button>

          {/* Button 3: NHẬP THÊM TỪ — highlight bằng màu khác */}
          <button
            type="button"
            className="btn-action-add-more"
            onClick={handleSaveAndAddMore}
          >
            Nhập thêm từ
          </button>
        </div>
      </div>
    </div>
  );
}
