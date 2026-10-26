import { useEffect, useState } from 'react';

// Draft persistence for reloads and network errors. sessionStorage, not localStorage: drafts contain
// personal data and must not outlive the browser tab (cleared explicitly on submit and logout too).
export function useFormPersist<T>(formKey: string, initialValues: T) {
  const storageKey = `mahalink_draft_${formKey}`;
  const [values, setValues] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // storage unavailable (private mode) -> start empty
    }
    return initialValues;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      // ignore
    }
  }, [storageKey, values]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return [values, setValues, clearDraft] as const;
}
