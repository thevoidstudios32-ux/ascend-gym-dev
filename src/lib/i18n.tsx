/* ASCEND — i18n leve baseado em chaves em português.
   t("Texto em português") devolve a tradução em inglês quando o idioma é "en".
   Sem tradução cadastrada, o próprio texto em português é usado (fallback seguro). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { EN } from "./i18n/en";

export type Lang = "pt" | "en";

const STORAGE_KEY = "ascend.lang";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (pt: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

function interpolate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");

  // Lê a preferência salva só no cliente (evita divergência de hidratação).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "pt") setLangState(saved);
    } catch {
      /* storage indisponível */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage indisponível */
    }
  }, []);

  const t = useCallback(
    (pt: string, vars?: Record<string, string | number>) => {
      if (lang === "pt") return interpolate(pt, vars);
      return interpolate(EN[pt] ?? pt, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fora do provider (ex.: SSR de rotas públicas): mantém português.
    return {
      lang: "pt" as Lang,
      setLang: () => {},
      t: (pt: string, vars?: Record<string, string | number>) => interpolate(pt, vars),
    };
  }
  return ctx;
}

/** Atalho: const t = useT(); t("Iniciar treino") */
export function useT() {
  return useI18n().t;
}
