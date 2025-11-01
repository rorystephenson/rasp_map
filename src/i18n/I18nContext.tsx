import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { translations, TranslationKey, Language } from './translations';

interface I18nContextType {
  language: Language;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Detect browser language
const detectLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();

  // Check for exact match first (e.g., 'it-IT' or 'it')
  if (browserLang.startsWith('it')) {
    return 'it';
  }

  if (browserLang.startsWith('en')) {
    return 'en';
  }

  // Default to Italian since it's the main language
  return 'it';
};

// Save/load language preference
const LANGUAGE_STORAGE_KEY = 'rasp-map-language';

const loadLanguagePreference = (): Language => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'it' || saved === 'en') {
      return saved;
    }
  } catch (error) {
    console.error('Failed to load language preference:', error);
  }

  // If no saved preference, detect from browser
  return detectLanguage();
};

const saveLanguagePreference = (lang: Language) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
};

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(loadLanguagePreference);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    saveLanguagePreference(lang);
  }, []);

  // Translation function with parameter substitution
  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    let text: string = translations[language][key] || translations.it[key] || key;

    // Replace parameters like {count}, {query}, {lat}, {lng}
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value)) as string;
      });

      // Handle Italian pluralization for {plural}
      if (language === 'it' && params.count !== undefined) {
        const count = Number(params.count);
        // For Italian: 'o' for singular (1), 'i' for plural (0, 2+)
        text = text.replace(/\{plural\}/g, count === 1 ? 'o' : 'i') as string;
      }

      // Handle English pluralization for {plural}
      if (language === 'en' && params.count !== undefined) {
        const count = Number(params.count);
        // For English: '' for singular (1), 's' for plural (0, 2+)
        text = text.replace(/\{plural\}/g, count === 1 ? '' : 's') as string;
      }
    }

    return text;
  }, [language]);

  const value: I18nContextType = {
    language,
    t,
    setLanguage
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
