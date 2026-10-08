import { EXERCISE_CATALOG } from './exercises';
import { exerciseId, getExerciseInfo } from './exercise-detail';

/** Local catalog enrichment only: no fetches, generation, or additional AI calls. */
export function coachExerciseReferences(names: string[], request = '') {
  const mentioned = EXERCISE_CATALOG.filter(e => request.toLowerCase().includes(e.name.toLowerCase())).map(e => e.name);
  const ids = new Set([...mentioned, ...names].map(exerciseId));
  const sheets = EXERCISE_CATALOG.filter(e => ids.has(exerciseId(e.name))).slice(0, 12).map(e => {
    const info = getExerciseInfo(e.name);
    return { name: info.name, primary: info.primaryMuscles, secondary: info.secondaryMuscles, equipment: info.equipment, instructions: info.instructions };
  });
  return 'FICHAS DO CATÁLOGO ASCEND (referência técnica; não invente URLs nem diagnósticos). Use os nomes canônicos quando aplicáveis; o app exibe mapa e instruções localmente junto da proposta:\n' + JSON.stringify(sheets);
}