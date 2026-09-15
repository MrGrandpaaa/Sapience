import { useState, useCallback } from 'react';

const STORAGE_KEY = 'sapience_user_name';
const LEGACY_STORAGE_KEY = 'french-vocab-user-name';

/**
 * Persistent user name stored in localStorage.
 *
 * - First visit: name is null → show NamePrompt
 * - After entering name: saved to localStorage, persists across sessions
 * - Subsequent visits: name is loaded from storage immediately
 */
export function useUserName() {
  const [name, setNameState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  });

  const setName = useCallback((newName: string) => {
    const trimmed = newName.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      setNameState(trimmed);
    }
  }, []);

  const hasName = name !== null && name.length > 0;

  return { name, setName, hasName } as const;
}
