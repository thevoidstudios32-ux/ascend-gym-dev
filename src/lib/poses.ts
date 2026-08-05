/* Poses da ASCEND Arena — catálogo puro (client-safe).
 * Cada pose define os critérios que a IA deve avaliar e uma silhueta de apoio
 * exibida como overlay na câmera.
 */

export type PoseDef = {
  id: string;
  label: string;
  emoji: string;
  /** Instrução curta de execução da pose. */
  how: string;
  /** Critérios exclusivos avaliados nessa categoria. */
  criteria: string[];
  /** Silhueta simplificada (viewBox 0 0 100 150). */
  silhouette: string;
};

/** Silhuetas simplificadas — servem como guia de enquadramento. */
const S = {
  frontDouble:
    "M50 12a9 9 0 100 18 9 9 0 000-18zM50 31c-8 0-13 3-16 7l-9-13-9 5 8 18c2 5 7 8 12 8l3 22c0 6 1 10 2 14l-2 30h9l3-28 3 28h9l-2-30c1-4 2-8 2-14l3-22c5 0 10-3 12-8l8-18-9-5-9 13c-3-4-8-7-16-7z",
  backDouble:
    "M50 12a9 9 0 100 18 9 9 0 000-18zM50 31c-9 0-15 4-18 9l-8-14-9 5 8 19c2 5 7 8 13 8l2 21c0 6 1 10 2 14l-2 30h9l3-28 3 28h9l-2-30c1-4 2-8 2-14l2-21c6 0 11-3 13-8l8-19-9-5-8 14c-3-5-9-9-18-9z",
  side:
    "M54 12a9 9 0 100 18 9 9 0 000-18zM54 31c-9 0-16 6-17 15l-2 16c-1 7 1 12 4 15l-2 20-3 33h9l5-31 4 31h9l-2-34 2-22c6-2 9-7 9-13l-1-16c-1-9-6-14-15-14z",
  mostMuscular:
    "M50 12a9 9 0 100 18 9 9 0 000-18zM50 31c-10 0-17 4-20 10l-13 6 4 10 10-3 2 15c0 6 1 11 3 15l-2 32h9l4-30 4 30h9l-2-32c2-4 3-9 3-15l2-15 10 3 4-10-13-6c-3-6-10-10-20-10z",
  latSpread:
    "M50 12a9 9 0 100 18 9 9 0 000-18zM50 31c-9 0-14 4-17 10L14 33l-6 8 20 18c2 6 5 10 9 12l2 18c0 6 1 10 2 14l-2 30h9l3-28 3 28h9l-2-30c1-4 2-8 2-14l2-18c4-2 7-6 9-12l20-18-6-8-19 8c-3-6-8-10-17-10z",
  absThigh:
    "M50 12a9 9 0 100 18 9 9 0 000-18zM50 31c-8 0-13 4-15 9l-13 10 4 9 9-6 2 14c0 7 1 12 3 16l-3 34h10l4-30 6 30h10l-4-34c2-4 3-9 3-16l2-14 9 6 4-9-13-10c-2-5-7-9-15-9z",
  natural:
    "M50 12a9 9 0 100 18 9 9 0 000-18zM50 31c-8 0-13 4-15 10l-12 8 4 9 8-5 2 13c0 7 1 12 3 16l-3 36h10l3-32 3 32h10l-3-36c2-4 3-9 3-16l2-13 8 5 4-9-12-8c-2-6-7-10-15-10z",
} as const;

export const ARENA_POSES: PoseDef[] = [
  {
    id: "front_double",
    label: "Front Double Biceps",
    emoji: "💪",
    how: "De frente, braços levantados a 90°, punhos fechados, peito aberto e abdômen contraído.",
    criteria: ["largura", "bíceps", "ombros", "cintura"],
    silhouette: S.frontDouble,
  },
  {
    id: "back_double",
    label: "Back Double Biceps",
    emoji: "🦅",
    how: "De costas, braços a 90°, escápulas contraídas e uma perna recuada apoiada na ponta do pé.",
    criteria: ["costas", "dorsal", "trapézio", "posterior de ombro"],
    silhouette: S.backDouble,
  },
  {
    id: "side_chest",
    label: "Side Chest",
    emoji: "🛡️",
    how: "De lado, segure o punho da frente, gire o peito para a câmera e empurre a perna da frente.",
    criteria: ["peitoral", "espessura", "braço", "proporção"],
    silhouette: S.side,
  },
  {
    id: "side_triceps",
    label: "Side Triceps",
    emoji: "🔻",
    how: "De lado, braço de trás estendido travando o tríceps, peito estufado e perna da frente apoiada.",
    criteria: ["tríceps", "peito lateral", "perna", "linha da cintura"],
    silhouette: S.side,
  },
  {
    id: "most_muscular",
    label: "Most Muscular",
    emoji: "🔥",
    how: "De frente, mãos à frente do corpo, contraia tudo: trapézio, peito, ombros e braços.",
    criteria: ["densidade", "trapézio", "peito", "definição"],
    silhouette: S.mostMuscular,
  },
  {
    id: "front_lat",
    label: "Front Lat Spread",
    emoji: "🪽",
    how: "De frente, mãos na cintura, abra as dorsais formando um V mantendo a cintura fina.",
    criteria: ["formato em V", "amplitude dorsal", "peito", "cintura"],
    silhouette: S.latSpread,
  },
  {
    id: "back_lat",
    label: "Back Lat Spread",
    emoji: "🦋",
    how: "De costas, mãos na cintura, abra as dorsais ao máximo mantendo os ombros baixos.",
    criteria: ["amplitude dorsal", "simetria", "lombar", "cintura"],
    silhouette: S.latSpread,
  },
  {
    id: "abs_thigh",
    label: "Abs & Thigh",
    emoji: "🦵",
    how: "Mãos atrás da cabeça, expire o ar, contraia o abdômen e flexione a coxa da frente.",
    criteria: ["abdômen", "serrátil", "quadríceps", "definição"],
    silhouette: S.absThigh,
  },
  {
    id: "natural",
    label: "Melhor Shape Natural",
    emoji: "🌿",
    how: "Pose relaxada de frente, sem contrair ao extremo. Mostre o shape real do dia a dia.",
    criteria: ["proporção", "harmonia", "condicionamento", "naturalidade"],
    silhouette: S.natural,
  },
  {
    id: "evolucao",
    label: "Melhor Evolução",
    emoji: "📈",
    how: "Use a mesma pose e o mesmo ângulo da sua foto antiga para a comparação ficar justa.",
    criteria: ["ganho muscular", "redução de gordura", "postura", "consistência"],
    silhouette: S.natural,
  },
];

export const POSE_BY_ID: Record<string, PoseDef> = Object.fromEntries(
  ARENA_POSES.map((p) => [p.id, p]),
);

export function poseOf(id: string | null | undefined): PoseDef {
  return (id && POSE_BY_ID[id]) || ARENA_POSES[0]!;
}
