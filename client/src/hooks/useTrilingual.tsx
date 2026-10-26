import React, { createContext, useContext, useEffect, useState } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';

export type SupportedLocale = 'mr' | 'en' | 'hi';

const dictionaries: Record<SupportedLocale, Record<string, string>> = { mr, en, hi };

interface TrilingualValue {
  locale: SupportedLocale;
  changeLocale: (locale: SupportedLocale) => void;
  t: (key: string) => string;
}

const TrilingualContext = createContext<TrilingualValue | null>(null);

// One locale for the whole app, so switching language re-renders every page.
export const TrilingualProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    const saved = localStorage.getItem('mahalink_locale') as SupportedLocale;
    return saved && dictionaries[saved] ? saved : 'mr';
  });

  useEffect(() => {
    localStorage.setItem('mahalink_locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string): string => dictionaries[locale]?.[key] || dictionaries.en[key] || key;

  return <TrilingualContext.Provider value={{ locale, changeLocale: setLocale, t }}>{children}</TrilingualContext.Provider>;
};

export function useTrilingual(): TrilingualValue {
  const value = useContext(TrilingualContext);
  if (!value) throw new Error('useTrilingual must be used inside <TrilingualProvider>');
  return value;
}
