import { findExercise, EXERCISE_CATALOG } from './exercises';
import { EXERCISE_IMAGES } from './exercise-media';
import { EXERCISE_MOTION } from './exercise-motion';
export const exerciseId = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export type ExerciseInfo = { id: string; name: string; muscleGroup: string; primaryMuscles: string[]; secondaryMuscles: string[]; equipment: string; difficulty: string; description: string; instructions: string[]; tips: string[]; images: string[]; videoUrl?: string; webmUrl?: string; gifUrl?: string; posterUrl?: string; mediaCredit?: { author: string; sourceUrl: string; license: string; licenseUrl: string }; alternatives: string[] };
export function anatomyMuscle(m: string): string {
 const s=m.toLowerCase();
 if (/peit|peitor/.test(s)) return 'Peitoral'; if (/delto|ombro/.test(s)) return 'Ombros';
 if (/bícep|bicep/.test(s)) return 'Bíceps'; if (/trícep|tricep/.test(s)) return 'Tríceps';
 if (/antebra|braquior/.test(s)) return 'Antebraços'; if (/dorsa|costas|rombo/.test(s)) return 'Dorsais';
 if (/trap/.test(s)) return 'Trapézio'; if (/lomb/.test(s)) return 'Lombar';
 if (/quadr/.test(s)) return 'Quadríceps'; if (/posterior|isquio/.test(s)) return 'Posterior de coxa';
 if (/glút|glut/.test(s)) return 'Glúteos'; if (/panturr/.test(s)) return 'Panturrilhas';
 if (/core|abd|obl|transvers/.test(s)) return 'Abdômen'; return m;
}
const instructions: Record<string,string[]> = {
 'supino-inclinado-com-halteres': ['Ajuste o banco em cerca de 30° e apoie os pés no chão.', 'Posicione os halteres ao lado do peito, com as escápulas apoiadas.', 'Desça os halteres de forma controlada, sem forçar a amplitude.', 'Empurre para cima sem bater os halteres nem travar os cotovelos.'],
 'supino-reto': ['Deite no banco com pés apoiados e escápulas estáveis.', 'Segure a barra com punhos alinhados e peça auxílio quando necessário.', 'Desça controladamente em direção ao peito, sem quicar.', 'Empurre mantendo os ombros apoiados no banco.'],
 'agachamento': ['Posicione os pés em uma base confortável.', 'Flexione quadris e joelhos, mantendo os joelhos na direção dos pés.', 'Desça até a amplitude que permita manter controle e estabilidade.', 'Retorne empurrando o chão, sem perder o alinhamento.'],
 'rosca-direta': ['Segure a barra com as palmas voltadas para cima.', 'Mantenha os cotovelos próximos ao tronco.', 'Flexione os cotovelos sem balançar o corpo.', 'Desça a barra lentamente, mantendo controle.'],
 'puxada-alta': ['Ajuste o apoio das coxas e segure a barra.', 'Mantenha o peito aberto e o tronco estável.', 'Puxe a barra à frente em direção à parte alta do peito.', 'Retorne lentamente, sem soltar a tensão de forma brusca.'],
};
export function getExerciseInfo(name: string, muscle='', tip=''): ExerciseInfo {
 const candidate=findExercise(name);
 const e=candidate && exerciseId(candidate.name)===exerciseId(name) ? candidate : undefined;
 const id=exerciseId(e?.name ?? name);
 const primary=anatomyMuscle(e?.muscles[0] ?? muscle);
 const secondary=[...new Set((e?.muscles.slice(1) ?? []).map(anatomyMuscle))].filter(m=>m!==primary);
 const squat = /agachamento|leg-press|hack-squat/.test(id);
 return { id, name, muscleGroup: e?.muscles[0] ?? (muscle || 'Não informado'), primaryMuscles: squat ? ['Quadríceps','Glúteos'] : [primary], secondaryMuscles: squat ? ['Posterior de coxa','Abdômen'] : secondary,
 equipment: e?.equipment ?? 'Não informado', difficulty:e?.difficulty ?? 'Não informado',
 description:e ? `Trabalha ${e.muscles.join(', ').toLowerCase()}. ${e.tip}` : tip || 'Confira a execução com um profissional antes de iniciar.',
 instructions: instructions[id] ?? (e ? [e.tip, 'Ajuste a carga para manter o controle durante toda a amplitude confortável.', 'Interrompa a execução se houver dor.'] : ['Peça orientação para ajustar a posição e a execução deste movimento.']),
 tips: [e?.tip ?? tip, 'Não aumente a carga sacrificando a execução.'].filter(Boolean), images:e ? EXERCISE_IMAGES[id] ?? [] : [], ...(e ? EXERCISE_MOTION[id] : {}),
 alternatives:EXERCISE_CATALOG.filter(x=>x.name!==e?.name && x.group===e?.group).slice(0,4).map(x=>x.name) };
}
export type SetEntry = { exercise: string; set_index: number; reps: number; weight_kg: number; rir: number | null; done: boolean };
