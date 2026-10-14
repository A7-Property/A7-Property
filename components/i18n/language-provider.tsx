"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

import { readStoredString, STORAGE_KEYS, writeStoredString } from "@/lib/local-storage";

type Language = "en" | "my";

interface LanguageContextValue {
  language: Language;
  isMyanmar: boolean;
  setLanguage: (language: Language) => void;
  tx: (english: string, myanmar: string) => string;
}

const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.language;
const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "my";
}

function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useLayoutEffect(() => {
    const stored = readStoredString(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) queueMicrotask(() => setLanguageState(stored));
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    writeStoredString(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "my" ? "my" : "en";
  }, [language]);

  useEffect(() => {
    function syncLanguage(event: StorageEvent) {
      if (event.key === LANGUAGE_STORAGE_KEY && isLanguage(event.newValue)) {
        setLanguageState(event.newValue);
      }
    }

    window.addEventListener("storage", syncLanguage);
    return () => window.removeEventListener("storage", syncLanguage);
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    isMyanmar: language === "my",
    setLanguage,
    tx: (english, myanmar) => language === "my" ? myanmar : english,
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

export { LanguageProvider, useLanguage };
export type { Language };
