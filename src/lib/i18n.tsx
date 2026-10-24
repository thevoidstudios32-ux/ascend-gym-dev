/* ASCEND — i18n leve baseado em chaves em português.
   t("Texto em português") devolve a tradução em inglês quando o idioma é "en".
   Sem tradução cadastrada, o próprio texto em português é usado (fallback seguro). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { EN } from "./i18n/en";
import { PT_FIXES } from "./i18n/pt-fixes";
import { startAutoTranslate, stopAutoTranslate } from "./i18n/auto-translate";
import { supabase } from "@/integrations/supabase/client";

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
  const [userId, setUserId] = useState<string | null>(null);

  // Lê a preferência salva só no cliente (evita divergência de hidratação).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "pt") setLangState(saved);
    } catch {
      /* storage indisponível */
    }
  }, []);

  // O perfil autenticado é a fonte de verdade; o armazenamento local cobre
  // apenas o período anterior ao carregamento da sessão.
  useEffect(() => {
    let active = true;

    async function syncFromProfile(id: string) {
      const { data } = await supabase.from("profiles").select("language").eq("id", id).maybeSingle();
      if (!active || (data?.language !== "pt" && data?.language !== "en")) return;
      setLangState(data.language);
      try {
        localStorage.setItem(STORAGE_KEY, data.language);
      } catch {
        /* storage indisponível */
      }
    }

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) void syncFromProfile(id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const id = session?.user.id ?? null;
      setUserId(id);
      if (id) void syncFromProfile(id);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
    }
  }, [lang]);

  // Textos escritos direto nas telas (sem t()) também mudam de idioma: no inglês tudo
  // que tem tradução é trocado; no português só os rótulos que estão em inglês no código.
  useEffect(() => {
    if (lang === "en") startAutoTranslate(EN, { months: true });
    else startAutoTranslate(PT_FIXES);
    return () => stopAutoTranslate();
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage indisponível */
    }
    if (userId) {
      void supabase
        .from("profiles")
        .update({ language: l, updated_at: new Date().toISOString() })
        .eq("id", userId);
    }
  }, [userId]);

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
