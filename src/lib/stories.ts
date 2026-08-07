/* Stories dos Gym Bros — lógica pura (client-safe). */

export const STORY_STICKERS = [
  { id: "workout", icon: "🏋️", label: "Treino concluído" },
  { id: "pr", icon: "🔥", label: "Novo PR" },
  { id: "upper", icon: "💪", label: "Upper Day" },
  { id: "legs", icon: "🦵", label: "Leg Day" },
  { id: "pump", icon: "⚡", label: "Pump Insano" },
  { id: "goal", icon: "🎯", label: "Meta Batida" },
  { id: "level", icon: "⭐", label: "Level Up" },
] as const;

export const STORY_KINDS: Record<string, { icon: string; label: string }> = {
  text: { icon: "💬", label: "Texto" },
  photo: { icon: "📸", label: "Foto" },
  video: { icon: "🎬", label: "Vídeo" },
  workout: { icon: "🏋️", label: "Treino do dia" },
  pr: { icon: "📈", label: "PR conquistado" },
  favorite: { icon: "❤️", label: "Exercício favorito" },
  evolution: { icon: "📊", label: "Evolução física" },
  quote: { icon: "✨", label: "Frase motivacional" },
  achievement: { icon: "🏅", label: "Conquista" },
};

export const STORY_BACKGROUNDS = [
  { id: "ember", label: "Ember", css: "linear-gradient(150deg,#DC2626 0%,#7f1010 55%,#151515 100%)" },
  { id: "noir", label: "Noir", css: "linear-gradient(160deg,#242424 0%,#0b0b0b 100%)" },
  { id: "steel", label: "Steel", css: "linear-gradient(150deg,#3f3f46 0%,#18181b 100%)" },
  { id: "blood", label: "Blood", css: "linear-gradient(200deg,#E53935 0%,#450a0a 100%)" },
  { id: "gold", label: "Gold", css: "linear-gradient(150deg,#E9C46A 0%,#7c5a12 60%,#151515 100%)" },
];

export function backgroundCss(id: string | null | undefined) {
  return (STORY_BACKGROUNDS.find((b) => b.id === id) ?? STORY_BACKGROUNDS[0]!).css;
}

export function stickerOf(id: string | null | undefined) {
  return STORY_STICKERS.find((s) => s.id === id) ?? null;
}

export const STORY_REACTIONS = ["🔥", "💪", "👏", "😤", "🤯", "❤️"];

/** Quantas horas faltam para o story sumir. */
export function hoursLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 3600000));
}

export const STORY_DURATION_MS = 6000;

/** Durações que o usuário pode escolher ao publicar (segundos). */
export const STORY_DURATIONS = [10, 15, 20, 30] as const;
export const DEFAULT_STORY_DURATION = 15;

/** Duração (ms) de um story, lida do meta com fallback seguro. */
export function storyDurationMs(meta: unknown): number {
  const raw = (meta as { duration?: unknown } | null | undefined)?.duration;
  const secs = typeof raw === "number" && Number.isFinite(raw) ? raw : DEFAULT_STORY_DURATION;
  return Math.min(30, Math.max(5, secs)) * 1000;
}

/** Sugestão de "trecho em destaque" (refrão) dentro da prévia. */
export function hookStart(previewDuration: number, clip: number) {
  if (!Number.isFinite(previewDuration) || previewDuration <= clip) return 0;
  return Math.round((previewDuration - clip) / 2);
}

/** Barras determinísticas para desenhar a waveform de uma faixa. */
export function waveformBars(seed: string, count = 56): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h ^= h >>> 13;
    const n = (h >>> 0) / 4294967295;
    const wave = 0.55 + 0.45 * Math.sin((i / count) * Math.PI * 3);
    out.push(Math.max(0.18, Math.min(1, n * 0.7 + wave * 0.5)));
  }
  return out;
}

export function fmtTime(s: number) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}


export const MOTIVATION_QUOTES = [
  "Disciplina vence motivação. Todo santo dia.",
  "Você não precisa estar pronto, precisa começar.",
  "A série difícil é a que constrói o shape.",
  "Sem desculpa. Só progresso.",
  "Ninguém treina por você. Levanta e vai.",
];
