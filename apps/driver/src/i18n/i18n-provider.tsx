import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import i18next from 'i18next';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import ar from './messages/ar.json';
import en from './messages/en.json';
import fr from './messages/fr.json';
import { DEFAULT_LOCALE, getDirection, toLocale, type Locale } from './locales';

const STORAGE_KEY = 'mtr.locale';

void i18next.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en }, ar: { translation: ar } },
  lng: toLocale(getLocales()[0]?.languageCode),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
});

interface LocaleContextValue {
  locale: Locale;
  direction: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Language follows the device, can be changed in the app and is remembered. Right-to-left is
 * applied through the root view `direction` style, so switching to Arabic needs no restart.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(toLocale(i18next.language));

  useEffect(() => {
    void SecureStore.getItemAsync(STORAGE_KEY).then((saved) => {
      if (saved) {
        const next = toLocale(saved);
        void i18next.changeLanguage(next);
        setLocaleState(next);
      }
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    void i18next.changeLanguage(next);
    void SecureStore.setItemAsync(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, direction: getDirection(locale), setLocale }}>
      <I18nextProvider i18n={i18next}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside I18nProvider');
  return value;
}
