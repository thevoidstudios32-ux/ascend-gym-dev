/**
 * ASCEND ICONOGRAPHY SYSTEM — "Titanium Tactical"
 *
 * Sistema único de ícones SVG do ASCEND. Substitui a camada visual de emojis
 * da interface. Os dados antigos (campos `emoji`/`icon`) continuam intactos no
 * banco/catálogos — apenas a REPRESENTAÇÃO passa por aqui, via `Glyph`.
 *
 * Regras visuais:
 *  - grafite/preto + branco, com acento vermelho ASCEND (text-primary)
 *  - silhuetas sólidas para categorias de treino
 *  - crestes/escudos angulares para ranks, níveis e conquistas
 *  - geometria compacta 24x24, mesma espessura e escala em todo o app
 */

export type AscendIconName =
  | "push"
  | "pull"
  | "legs"
  | "fullbody"
  | "upper"
  | "lower"
  | "calisthenics"
  | "cardio"
  | "run"
  | "mobility"
  | "workout"
  | "core"
  | "streak"
  | "xp"
  | "levelup"
  | "pr"
  | "trophy"
  | "medal"
  | "target"
  | "check"
  | "crown"
  | "shield"
  | "void"
  | "water"
  | "meal"
  | "chart"
  | "arena"
  | "spark"
  | "rank1"
  | "rank2"
  | "rank3"
  | "rank4"
  | "rank5";

const A = "text-primary"; // acento vermelho ASCEND

function Crest({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <>
      <path d="M12 1.6 3.2 5v7.1c0 4.6 3.6 8.3 8.8 10.3 5.2-2 8.8-5.7 8.8-10.3V5L12 1.6Zm0 2.2 6.8 2.6v6.7c0 3.5-2.7 6.5-6.8 8.2-4.1-1.7-6.8-4.7-6.8-8.2V6.4L12 3.8Z" />
      {level >= 1 ? <path className={A} d="M12 6.6 8.2 11h2.4v4.4h2.8V11h2.4L12 6.6Z" /> : null}
      {level >= 2 ? <path d="M6.4 15.4h11.2v1.5H6.4z" /> : null}
      {level >= 3 ? <path d="M6.4 17.6h11.2v1.2H6.4z" opacity=".7" /> : null}
      {level >= 4 ? <path className={A} d="M2.4 8.2 4 9.6l-1.6 1.5V8.2Zm19.2 0v2.9L20 9.6l1.6-1.4Z" /> : null}
      {level >= 5 ? <path className={A} d="M12 0 13.4 2.6 12 3.6 10.6 2.6 12 0Z" /> : null}
    </>
  );
}

const PATHS: Record<AscendIconName, React.ReactNode> = {
  push: (
    <>
      <path d="M2 10h3v4H2zM19 10h3v4h-3zM6 8.5h2.4v7H6zM15.6 8.5H18v7h-2.4z" />
      <path className={A} d="M9.2 10.8h5.6v2.4H9.2z" />
    </>
  ),
  pull: (
    <>
      <path d="M3 3h18v2H3z" />
      <path className={A} d="M11 5h2v6h-2z" />
      <path d="M12 11a4 4 0 0 0-4 4v6h2.2v-6a1.8 1.8 0 0 1 3.6 0v6H16v-6a4 4 0 0 0-4-4Z" />
    </>
  ),
  legs: (
    <>
      <path d="M7 2h4l-.6 8.4L12 21H9.4L8 12.4 6.2 21H3.6l1.7-10.8L7 2Z" />
      <path className={A} d="M14 2h4l1.7 8.2L21 21h-2.6l-1.8-8.6L15.2 21h-2.6l1.4-10.8L14 2Z" />
    </>
  ),
  fullbody: (
    <>
      <path d="M12 1.8 21 6v6c0 5-3.8 8.9-9 10.3C6.8 20.9 3 17 3 12V6l9-4.2Z" opacity=".25" />
      <path d="M12 1.6 3.2 5v7c0 4.7 3.6 8.4 8.8 10.4 5.2-2 8.8-5.7 8.8-10.4V5L12 1.6Zm0 2.2 6.8 2.6v6.6c0 3.5-2.7 6.6-6.8 8.3-4.1-1.7-6.8-4.8-6.8-8.3V6.4L12 3.8Z" />
      <path className={A} d="M12 6.2 8.6 12h2.2v5.2h2.4V12h2.2L12 6.2Z" />
    </>
  ),
  upper: (
    <>
      <path d="M4 6h16v3H4z" />
      <path className={A} d="M7 11h10v3H7z" />
      <path d="M9 16h6v2.4H9z" opacity=".7" />
    </>
  ),
  lower: (
    <>
      <path d="M9 5.6h6V8H9z" opacity=".7" />
      <path className={A} d="M7 10h10v3H7z" />
      <path d="M4 15h16v3H4z" />
    </>
  ),
  calisthenics: (
    <>
      <path d="M3 4h18v2H3z" />
      <circle cx="12" cy="9.4" r="2" />
      <path className={A} d="M12 11.6 7.4 7.8 6 9.4l4.6 3.8L7 21h2.5l2.5-5.4L14.5 21H17l-3.6-7.8L18 9.4l-1.4-1.6L12 11.6Z" />
    </>
  ),
  cardio: (
    <>
      <path d="M12 21S3 15.4 3 9.6A4.6 4.6 0 0 1 12 7.4 4.6 4.6 0 0 1 21 9.6C21 15.4 12 21 12 21Z" opacity=".3" />
      <path className={A} d="M2.6 12.6h4.2l1.6-3.4 2.6 6.6 2.2-4.6 1.2 1.4h5.6v2H13.6l-.6-.8-2.6 5.4-2.6-6.6-.8 1.8h-4.4v-1.8Z" />
    </>
  ),
  run: (
    <>
      <circle className={A} cx="15.4" cy="4.4" r="2.2" />
      <path d="M13.6 7.6 9.4 9.8 7.8 14H5.4l2-5.6 6-3.2 3.2 1.2 2 3.6 2.4.6-.5 2.2-3.6-.9-1-1.8-.9 3.6 3 3.2.9 5H16l-.7-4-3.6-3.6-1.4 4.2-3.5 3.4-1.7-1.7 3-3 2.4-7.2Z" />
    </>
  ),
  mobility: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9h-2.2A6.8 6.8 0 1 1 12 5.2V3Z" />
      <path className={A} d="M13.4 3.2 19 6.4l-5.6 3.2V3.2Z" />
      <circle cx="12" cy="12" r="2.2" opacity=".6" />
    </>
  ),
  workout: (
    <>
      <path d="M2 10h2.6v4H2zM19.4 10H22v4h-2.6zM5.4 8h2.4v8H5.4zM16.2 8h2.4v8h-2.4z" />
      <path className={A} d="M9 10.8h6v2.4H9z" />
    </>
  ),
  core: (
    <>
      <path d="M5 4h14v3.2H5zM5 9.2h14v3.2H5zM5 14.4h14v3.2H5z" opacity=".45" />
      <path className={A} d="M10.6 3h2.8v16h-2.8z" />
    </>
  ),
  streak: (
    <>
      <path d="M12 1.8c3.6 3.2 6.6 6.4 6.6 10.4A6.6 6.6 0 0 1 12 22.2a6.6 6.6 0 0 1-6.6-10c0 0 2 1.4 2.6 2.4C7.4 9.6 9.6 5.4 12 1.8Z" opacity=".35" />
      <path className={A} d="M12 9.4c1.8 1.8 3.2 3.4 3.2 5.4A3.2 3.2 0 1 1 8.8 15c0-2 1.4-3.8 3.2-5.6Z" />
    </>
  ),
  xp: (
    <>
      <path className={A} d="M13.4 1.6 4.6 13.4h5.2L9 22.4l9-12.2h-5.4l.8-8.6Z" />
    </>
  ),
  levelup: (
    <>
      <path className={A} d="M12 2.4 20.4 12h-4.8v3.4H8.4V12H3.6L12 2.4Z" />
      <path d="M8.4 17.4h7.2v2.2H8.4zM8.4 20.6h7.2V22H8.4z" opacity=".7" />
    </>
  ),
  pr: (
    <>
      <path d="M4 4h16v2.2H4z" />
      <path className={A} d="M6.4 8.2h11.2l-1.4 9.4H7.8L6.4 8.2Z" />
      <path d="M8 19.6h8V22H8z" />
    </>
  ),
  trophy: (
    <>
      <path className={A} d="M6.6 2.4h10.8v6.2a5.4 5.4 0 1 1-10.8 0V2.4Z" />
      <path d="M3 3.6h3v3.2A2.6 2.6 0 0 1 3 4.2V3.6Zm15 0h3v.6a2.6 2.6 0 0 1-3 2.6V3.6ZM9.4 15h5.2v3.4h3V21H6.4v-2.6h3V15Z" />
    </>
  ),
  medal: (
    <>
      <path d="M8 1.8 6 7.2h3.4L11 2.6 8 1.8Zm8 0-3 .8 1.6 4.6H18L16 1.8Z" />
      <circle cx="12" cy="15.4" r="6.4" opacity=".35" />
      <path className={A} d="M12 10.2 13.5 13.4l3.5.4-2.6 2.4.7 3.4-3.1-1.7-3.1 1.7.7-3.4-2.6-2.4 3.5-.4L12 10.2Z" />
    </>
  ),
  target: (
    <>
      <path d="M12 2.4A9.6 9.6 0 1 0 21.6 12h-2.2A7.4 7.4 0 1 1 12 4.6V2.4Z" />
      <path d="M12 7a5 5 0 1 0 5 5h-2.2a2.8 2.8 0 1 1-2.8-2.8V7Z" opacity=".7" />
      <path className={A} d="M12 10.6 20 2.6l.4 3.2 3.2.4-8 8h-3.6v-3.6Z" />
    </>
  ),
  check: (
    <>
      <path className={A} d="m9.8 17.6-5.4-5.4 1.8-1.8 3.6 3.6 8-8 1.8 1.8-9.8 9.8Z" />
    </>
  ),
  crown: (
    <>
      <path className={A} d="M2.4 5.6 6.8 10 12 3l5.2 7 4.4-4.4-1.8 12.2H4.2L2.4 5.6Z" />
      <path d="M4.6 19.4h14.8V22H4.6z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 1.6 3.2 5v7c0 4.7 3.6 8.4 8.8 10.4 5.2-2 8.8-5.7 8.8-10.4V5L12 1.6Z" opacity=".35" />
      <path className={A} d="M12 6.4 8.6 12h2.2v5H13v-5h2.2L12 6.4Z" />
    </>
  ),
  void: (
    <>
      <circle cx="12" cy="12" r="9.4" opacity=".3" />
      <path className={A} d="M12 2.6A9.4 9.4 0 1 1 2.6 12H6a6 6 0 1 0 6-6V2.6Z" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
  water: (
    <>
      <path d="M12 2.2c3.6 4.2 6.4 7.6 6.4 11a6.4 6.4 0 1 1-12.8 0c0-3.4 2.8-6.8 6.4-11Z" opacity=".35" />
      <path className={A} d="M12 8.6c2.2 2.8 3.6 4.6 3.6 6.4a3.6 3.6 0 1 1-7.2 0c0-1.8 1.4-3.6 3.6-6.4Z" />
    </>
  ),
  meal: (
    <>
      <path d="M4 2.4h2.2v7.2H4zM8.4 2.4h2.2v7.2H8.4z" />
      <path className={A} d="M3 10.4h8.6v2H3z" />
      <path d="M6.2 12.4h2.2V22H6.2zM17.6 2.4c2 0 3.4 2.6 3.4 6.4 0 2.6-.8 4.4-2.2 5.2V22h-2.4V2.4h1.2Z" />
    </>
  ),
  chart: (
    <>
      <path d="M3 19.6h18V22H3z" />
      <path d="M4.4 12h3v6.2h-3zM10.4 8h3v10.2h-3z" opacity=".7" />
      <path className={A} d="M16.4 3.6h3v14.6h-3z" />
    </>
  ),
  arena: (
    <>
      <path d="M2.4 6.4 12 2.4l9.6 4v3.2c0 6-4.2 10.4-9.6 12C6.6 20 2.4 15.6 2.4 9.6V6.4Z" opacity=".3" />
      <path className={A} d="M12 5.4 5 8.2v1.4c0 4.4 3 7.6 7 8.8 4-1.2 7-4.4 7-8.8V8.2L12 5.4Z" />
      <path d="M10.8 8.6h2.4v7h-2.4z" />
    </>
  ),
  spark: (
    <>
      <path className={A} d="M12 1.8 14 9l7.2 2-7.2 2-2 7.2-2-7.2L2.8 11 10 9l2-7.2Z" />
    </>
  ),
  rank1: <Crest level={1} />,
  rank2: <Crest level={2} />,
  rank3: <Crest level={3} />,
  rank4: <Crest level={4} />,
  rank5: <Crest level={5} />,
};

/** Ícone ASCEND. Herda a cor do texto; o acento usa o vermelho da marca. */
export function AscendIcon({
  name,
  size = 24,
  className = "",
  title,
}: {
  name: AscendIconName;
  size?: number;
  className?: string;
  title?: string | undefined;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`inline-block shrink-0 align-middle ${className}`}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}

/** Mapa legado: emoji armazenado -> ícone ASCEND (dados permanecem intactos). */
const GLYPH_MAP: Record<string, AscendIconName> = {
  "🏋️": "workout",
  "🏋": "workout",
  "🏋️‍♂️": "workout",
  "💪": "pr",
  "🦵": "legs",
  "🦿": "legs",
  "🧎": "legs",
  "🤸": "calisthenics",
  "🤾": "calisthenics",
  "🧘": "mobility",
  "🏃": "run",
  "🏃‍♂️": "run",
  "🚴": "cardio",
  "❤️": "cardio",
  "🫀": "cardio",
  "🔥": "streak",
  "⚡": "xp",
  "✨": "spark",
  "🌟": "spark",
  "⭐": "spark",
  "🏆": "trophy",
  "🥇": "medal",
  "🥈": "medal",
  "🥉": "medal",
  "🏅": "medal",
  "🎖️": "medal",
  "🎯": "target",
  "✅": "check",
  "✔️": "check",
  "☑️": "check",
  "👑": "crown",
  "🛡️": "shield",
  "🗿": "rank4",
  "⚔️": "rank2",
  "🐣": "rank1",
  "🌌": "void",
  "🕳️": "void",
  "💧": "water",
  "🚰": "water",
  "🥩": "meal",
  "🍗": "meal",
  "🍎": "meal",
  "🍽️": "meal",
  "📈": "chart",
  "📊": "chart",
  "🏟️": "arena",
  "🤝": "shield",
  "🧠": "spark",
  "📍": "target",
  "🎵": "spark",
  "🐐": "crown",
  "😤": "streak",
  "🫡": "shield",
  "😮‍💨": "cardio",
  "🚀": "levelup",
  "⬆️": "levelup",
  "🆙": "levelup",
  "💡": "spark",
};

/** Resolve um emoji legado (ou nome de categoria) para um ícone ASCEND. */
export function iconForGlyph(glyph?: string | null, fallback: AscendIconName = "workout"): AscendIconName {
  if (!glyph) return fallback;
  const raw = glyph.trim();
  if (GLYPH_MAP[raw]) return GLYPH_MAP[raw]!;
  const stripped = raw.replace(/[\uFE0F\u200D]/g, "");
  if (GLYPH_MAP[stripped]) return GLYPH_MAP[stripped]!;
  const key = raw.toLowerCase();
  const byName: Record<string, AscendIconName> = {
    push: "push",
    pull: "pull",
    legs: "legs",
    pernas: "legs",
    full: "fullbody",
    fullbody: "fullbody",
    "full body": "fullbody",
    upper: "upper",
    lower: "lower",
    core: "core",
    abdomen: "core",
    cardio: "cardio",
    corrida: "run",
    run: "run",
    mobilidade: "mobility",
    mobility: "mobility",
    calistenia: "calisthenics",
  };
  return byName[key] ?? fallback;
}

/**
 * Substitui a renderização de um emoji legado por um ícone ASCEND.
 * Uso: `<Glyph value={split.emoji} size={30} />`
 */
export function Glyph({
  value,
  size = 24,
  className = "",
  fallback = "workout",
  title,
}: {
  value?: string | null;
  size?: number;
  className?: string;
  fallback?: AscendIconName;
  title?: string | undefined;
}) {
  return <AscendIcon name={iconForGlyph(value, fallback)} size={size} className={className} title={title} />;
}

/** Cresta de rank por índice de progressão (0..4). */
export function RankCrest({ index, size = 24, className = "" }: { index: number; size?: number; className?: string }) {
  const lvl = Math.min(5, Math.max(1, index + 1)) as 1 | 2 | 3 | 4 | 5;
  return <AscendIcon name={(`rank${lvl}` as AscendIconName)} size={size} className={className} />;
}
