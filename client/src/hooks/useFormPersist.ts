import { useEffect, useState } from 'react';

export function useFormPersist<T>(formKey: string, initialValues: T) {
  const [values, setValues] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`mahalink_draft_${formKey}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return initialValues;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`mahalink_draft_${formKey}`, JSON.stringify(values));
    } catch {
      // ignore
    }
  }, [formKey, values]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(`mahalink_draft_${formKey}`);
    } catch {
      // ignore
    }
  };

  return [values, setValues, clearDraft] as const;
}
