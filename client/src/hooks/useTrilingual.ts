import { useEffect, useState } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';

export type SupportedLocale = 'mr' | 'en' | 'hi';

const dictionaries: Record<SupportedLocale, Record<string, string>> = {
  mr,
  en,
  hi,
};

export function useTrilingual() {
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    const saved = localStorage.getItem('mahalink_locale') as SupportedLocale;
    return saved && dictionaries[saved] ? saved : 'mr';
  });

  useEffect(() => {
    localStorage.setItem('mahalink_locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const changeLocale = (newLocale: SupportedLocale) => {
    setLocale(newLocale);
  };

  const t = (key: string): string => {
    return dictionaries[locale]?.[key] || dictionaries['en']?.[key] || key;
  };

  return { locale, changeLocale, t };
}
