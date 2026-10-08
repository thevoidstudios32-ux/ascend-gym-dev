/* Biblioteca de exercícios do ASCEND — client-safe.
   Usada pela troca inteligente de exercícios. */

export type MuscleGroup =
  | "Peito"
  | "Costas"
  | "Ombro"
  | "Bíceps"
  | "Tríceps"
  | "Pernas"
  | "Abdômen"
  | "Glúteos";

export type Equipment = "Máquina" | "Barra" | "Halteres" | "Cabo" | "Peso corporal";

export type Difficulty = "Iniciante" | "Intermediário" | "Avançado";

export type CatalogExercise = {
  name: string;
  emoji: string;
  group: MuscleGroup;
  equipment: Equipment;
  difficulty: Difficulty;
  muscles: string[];
  tip: string;
};

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Peito",
  "Costas",
  "Ombro",
  "Bíceps",
  "Tríceps",
  "Pernas",
  "Abdômen",
  "Glúteos",
];

export const EQUIPMENTS: Equipment[] = ["Máquina", "Barra", "Halteres", "Cabo", "Peso corporal"];

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // ---------------- Peito ----------------
  { name: "Supino reto", emoji: "🏋️", group: "Peito", equipment: "Barra", difficulty: "Intermediário", muscles: ["Peitoral maior", "Tríceps", "Deltoide anterior"], tip: "Escápulas retraídas, desça controlado até o peito." },
  { name: "Supino inclinado com halteres", emoji: "💪", group: "Peito", equipment: "Halteres", difficulty: "Intermediário", muscles: ["Peitoral superior", "Deltoide anterior"], tip: "Banco a 30°, não trave os cotovelos no topo." },
  { name: "Supino declinado", emoji: "📉", group: "Peito", equipment: "Barra", difficulty: "Intermediário", muscles: ["Peitoral inferior", "Tríceps"], tip: "Amplitude curta e controlada, sem quicar no peito." },
  { name: "Crucifixo com halteres", emoji: "🕊️", group: "Peito", equipment: "Halteres", difficulty: "Iniciante", muscles: ["Peitoral maior"], tip: "Cotovelos levemente flexionados, abra até sentir o alongamento." },
  { name: "Crucifixo inclinado", emoji: "🪽", group: "Peito", equipment: "Halteres", difficulty: "Intermediário", muscles: ["Peitoral superior"], tip: "Movimento em arco, sem transformar em supino." },
  { name: "Peck deck", emoji: "🦋", group: "Peito", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Peitoral maior"], tip: "Segure 1s na contração central." },
  { name: "Chest press", emoji: "🛗", group: "Peito", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Peitoral maior", "Tríceps"], tip: "Ajuste o banco na linha do meio do peito." },
  { name: "Crossover no cabo", emoji: "✝️", group: "Peito", equipment: "Cabo", difficulty: "Intermediário", muscles: ["Peitoral maior", "Peitoral inferior"], tip: "Cruze levemente as mãos no final." },
  { name: "Flexão de braço", emoji: "🤸", group: "Peito", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Peitoral", "Tríceps", "Core"], tip: "Corpo em linha reta, desça até o peito quase tocar." },
  { name: "Paralelas", emoji: "🪜", group: "Peito", equipment: "Peso corporal", difficulty: "Avançado", muscles: ["Peitoral inferior", "Tríceps"], tip: "Incline o tronco à frente para focar no peito." },

  // ---------------- Costas ----------------
  { name: "Barra fixa", emoji: "🧗", group: "Costas", equipment: "Peso corporal", difficulty: "Avançado", muscles: ["Dorsal", "Bíceps"], tip: "Puxe com os cotovelos, peito para cima." },
  { name: "Puxada alta", emoji: "🪝", group: "Costas", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Dorsal", "Bíceps"], tip: "Leve a barra até a clavícula, sem balanço." },
  { name: "Remada curvada", emoji: "🚣", group: "Costas", equipment: "Barra", difficulty: "Intermediário", muscles: ["Dorsal", "Romboides", "Trapézio"], tip: "Tronco a 45°, coluna neutra." },
  { name: "Remada unilateral", emoji: "💪", group: "Costas", equipment: "Halteres", difficulty: "Iniciante", muscles: ["Dorsal", "Romboides"], tip: "Amplitude total, segure 1s na contração." },
  { name: "Remada baixa no cabo", emoji: "🎣", group: "Costas", equipment: "Cabo", difficulty: "Iniciante", muscles: ["Dorsal", "Trapézio médio"], tip: "Peito aberto, puxe até o abdômen." },
  { name: "Remada máquina", emoji: "⚙️", group: "Costas", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Dorsal", "Romboides"], tip: "Apoie o peito no suporte e evite usar a lombar." },
  { name: "Pulldown com corda", emoji: "🪢", group: "Costas", equipment: "Cabo", difficulty: "Iniciante", muscles: ["Dorsal"], tip: "Braços quase estendidos, puxe até a coxa." },
  { name: "Levantamento terra", emoji: "🏗️", group: "Costas", equipment: "Barra", difficulty: "Avançado", muscles: ["Lombar", "Posterior", "Glúteo"], tip: "Barra colada na perna, quadril e ombros sobem juntos." },

  // ---------------- Ombro ----------------
  { name: "Desenvolvimento militar", emoji: "🤸", group: "Ombro", equipment: "Barra", difficulty: "Intermediário", muscles: ["Deltoide anterior", "Tríceps"], tip: "Core firme, evite arquear a lombar." },
  { name: "Desenvolvimento com halteres", emoji: "🙆", group: "Ombro", equipment: "Halteres", difficulty: "Iniciante", muscles: ["Deltoide anterior", "Deltoide lateral"], tip: "Trajetória levemente à frente da cabeça." },
  { name: "Elevação lateral", emoji: "🕊️", group: "Ombro", equipment: "Halteres", difficulty: "Iniciante", muscles: ["Deltoide lateral"], tip: "Suba até a linha do ombro, sem embalo." },
  { name: "Elevação frontal", emoji: "☝️", group: "Ombro", equipment: "Halteres", difficulty: "Iniciante", muscles: ["Deltoide anterior"], tip: "Controle a descida em 2 segundos." },
  { name: "Face pull", emoji: "🎯", group: "Ombro", equipment: "Cabo", difficulty: "Iniciante", muscles: ["Deltoide posterior", "Trapézio"], tip: "Ótimo para postura e saúde do ombro." },
  { name: "Desenvolvimento máquina", emoji: "🛗", group: "Ombro", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Deltoide anterior"], tip: "Alinhe as pegadas com a altura dos ombros." },
  { name: "Crucifixo inverso", emoji: "🔁", group: "Ombro", equipment: "Halteres", difficulty: "Intermediário", muscles: ["Deltoide posterior"], tip: "Tronco inclinado, cotovelos altos." },

  // ---------------- Bíceps ----------------
  { name: "Rosca direta", emoji: "🦾", group: "Bíceps", equipment: "Barra", difficulty: "Iniciante", muscles: ["Bíceps braquial"], tip: "Cotovelo fixo ao lado do corpo." },
  { name: "Rosca alternada", emoji: "🔄", group: "Bíceps", equipment: "Halteres", difficulty: "Iniciante", muscles: ["Bíceps", "Braquial"], tip: "Gire o punho na subida (supinação)." },
  { name: "Rosca martelo", emoji: "🔨", group: "Bíceps", equipment: "Halteres", difficulty: "Iniciante", muscles: ["Braquiorradial", "Bíceps"], tip: "Pegada neutra do início ao fim." },
  { name: "Rosca scott", emoji: "⛪", group: "Bíceps", equipment: "Máquina", difficulty: "Intermediário", muscles: ["Bíceps"], tip: "Não estenda totalmente para proteger o cotovelo." },
  { name: "Rosca no cabo", emoji: "🪢", group: "Bíceps", equipment: "Cabo", difficulty: "Iniciante", muscles: ["Bíceps"], tip: "Tensão constante, ótimo para finalizar." },

  // ---------------- Tríceps ----------------
  { name: "Tríceps corda", emoji: "🪢", group: "Tríceps", equipment: "Cabo", difficulty: "Iniciante", muscles: ["Tríceps"], tip: "Abra a corda no final do movimento." },
  { name: "Tríceps testa", emoji: "🧠", group: "Tríceps", equipment: "Barra", difficulty: "Intermediário", muscles: ["Tríceps cabeça longa"], tip: "Cotovelos apontando para o teto." },
  { name: "Tríceps francês", emoji: "🥖", group: "Tríceps", equipment: "Halteres", difficulty: "Intermediário", muscles: ["Tríceps cabeça longa"], tip: "Desça atrás da cabeça com controle." },
  { name: "Mergulho no banco", emoji: "🪑", group: "Tríceps", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Tríceps", "Peitoral inferior"], tip: "Ombros para trás, desça até 90°." },
  { name: "Tríceps máquina", emoji: "⚙️", group: "Tríceps", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Tríceps"], tip: "Trave o tronco no encosto." },

  // ---------------- Pernas ----------------
  { name: "Agachamento livre", emoji: "🦵", group: "Pernas", equipment: "Barra", difficulty: "Avançado", muscles: ["Quadríceps", "Glúteo", "Core"], tip: "Joelho na direção do pé, desça até a paralela." },
  { name: "Agachamento", emoji: "🦵", group: "Pernas", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Quadríceps", "Glúteo"], tip: "Base da força de todo o corpo." },
  { name: "Leg press", emoji: "🛗", group: "Pernas", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Quadríceps", "Glúteo"], tip: "Não deixe a lombar sair do encosto." },
  { name: "Hack squat", emoji: "📐", group: "Pernas", equipment: "Máquina", difficulty: "Intermediário", muscles: ["Quadríceps"], tip: "Pés no meio da plataforma." },
  { name: "Cadeira extensora", emoji: "🪑", group: "Pernas", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Quadríceps"], tip: "Segure 1s no topo." },
  { name: "Mesa flexora", emoji: "🛏️", group: "Pernas", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Posterior de coxa"], tip: "Quadril colado no banco." },
  { name: "Stiff", emoji: "🧎", group: "Pernas", equipment: "Barra", difficulty: "Intermediário", muscles: ["Posterior de coxa", "Glúteo"], tip: "Empurre o quadril para trás, joelho semi-flexionado." },
  { name: "Afundo com halteres", emoji: "🚶", group: "Pernas", equipment: "Halteres", difficulty: "Intermediário", muscles: ["Quadríceps", "Glúteo"], tip: "Passo longo, tronco ereto." },
  { name: "Búlgaro", emoji: "🦿", group: "Pernas", equipment: "Halteres", difficulty: "Avançado", muscles: ["Quadríceps", "Glúteo"], tip: "Pé de trás elevado, desça na vertical." },
  { name: "Panturrilha em pé", emoji: "🦶", group: "Pernas", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Panturrilha"], tip: "Amplitude completa, sem quicar." },

  // ---------------- Glúteos ----------------
  { name: "Elevação pélvica", emoji: "🍑", group: "Glúteos", equipment: "Barra", difficulty: "Intermediário", muscles: ["Glúteo máximo"], tip: "Queixo no peito, contraia 1s no topo." },
  { name: "Coice no cabo", emoji: "🐴", group: "Glúteos", equipment: "Cabo", difficulty: "Iniciante", muscles: ["Glúteo máximo"], tip: "Sem rodar o quadril." },
  { name: "Abdução na máquina", emoji: "↔️", group: "Glúteos", equipment: "Máquina", difficulty: "Iniciante", muscles: ["Glúteo médio"], tip: "Tronco levemente à frente." },
  { name: "Ponte de glúteo", emoji: "🌉", group: "Glúteos", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Glúteo", "Posterior"], tip: "Empurre pelos calcanhares." },

  // ---------------- Abdômen ----------------
  { name: "Prancha", emoji: "🧘", group: "Abdômen", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Core", "Transverso"], tip: "Glúteo contraído, quadril alinhado." },
  { name: "Abdominal supra", emoji: "🔺", group: "Abdômen", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Reto abdominal"], tip: "Tire só as escápulas do chão." },
  { name: "Elevação de pernas", emoji: "🦵", group: "Abdômen", equipment: "Peso corporal", difficulty: "Intermediário", muscles: ["Abdômen inferior"], tip: "Não deixe a lombar arquear." },
  { name: "Abdominal no cabo", emoji: "🪢", group: "Abdômen", equipment: "Cabo", difficulty: "Intermediário", muscles: ["Reto abdominal"], tip: "Enrole a coluna, não puxe com os braços." },
  { name: "Prancha lateral", emoji: "📏", group: "Abdômen", equipment: "Peso corporal", difficulty: "Intermediário", muscles: ["Oblíquos"], tip: "Quadril alto e alinhado." },
];

export function findExercise(name: string) {
  const n = name.toLowerCase();
  return (
    EXERCISE_CATALOG.find((e) => e.name.toLowerCase() === n) ??
    EXERCISE_CATALOG.find((e) => n.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(n))
  );
}

/** Mapeia o "muscle" textual dos splits para um grupo do catálogo. */
export function groupFromMuscle(muscle: string): MuscleGroup | null {
  const m = muscle.toLowerCase();
  if (m.includes("peito")) return "Peito";
  if (m.includes("dorsal") || m.includes("costas")) return "Costas";
  if (m.includes("ombro") || m.includes("deltoide")) return "Ombro";
  if (m.includes("bíceps")) return "Bíceps";
  if (m.includes("tríceps")) return "Tríceps";
  if (m.includes("glúteo")) return "Glúteos";
  if (m.includes("core") || m.includes("abd")) return "Abdômen";
  if (m.includes("perna") || m.includes("quadr") || m.includes("posterior") || m.includes("panturrilha"))
    return "Pernas";
  return null;
}

/** Sugestões inteligentes para substituir um exercício. */
export function substitutesFor(
  name: string,
  opts: { muscle?: string; favorites?: string[]; equipment?: string[]; disliked?: string[] } = {},
) {
  const base = findExercise(name);
  const group = base?.group ?? (opts.muscle ? groupFromMuscle(opts.muscle) : null);
  const favorites = new Set(opts.favorites ?? []);
  const available = opts.equipment && opts.equipment.length ? new Set(opts.equipment) : null;

  return EXERCISE_CATALOG.filter((e) => e.name !== base?.name && !(opts.disliked ?? []).some(n=>n.toLowerCase()===e.name.toLowerCase()))
    .map((e) => {
      const sameGroup = group ? e.group === group : false;
      const shared = base ? e.muscles.filter((m) => base.muscles.includes(m)).length : 0;
      const fav = favorites.has(e.name);
      const usable = !available || available.has("Academia completa") || (e.equipment === "Peso corporal" && e.name !== "Barra fixa" && e.name !== "Paralelas" && e.name !== "Mergulho no banco") || available.has(e.equipment) && !(e.name === "Barra fixa" && !available.has("Barra fixa")) && !(e.name === "Paralelas" && !available.has("Paralelas"));
      const score =
        (sameGroup ? 100 : 0) + shared * 20 + (fav ? 500 : 0) + (usable ? 30 : -60);
      return { exercise: e, score, favorite: fav, available: usable, sameGroup };
    })
    .filter((r) => r.sameGroup && r.available)
    .sort((a, b) => b.score - a.score);
}

export function isAvailable(equipment: string, gymEquipment: string[] | null | undefined) {
  if (!gymEquipment || gymEquipment.length === 0) return true;
  return gymEquipment.includes(equipment);
}
