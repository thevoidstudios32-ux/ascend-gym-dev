import { describe, test, expect } from 'bun:test';
import { getExerciseInfo } from '../src/lib/exercise-detail';
import { substitutesFor } from '../src/lib/exercises';
import { coachExerciseReferences } from '../src/lib/exercise-coach-context';
import { ADDITIONAL_EXERCISE_MOTION } from '../src/lib/exercise-motion-additional';
import { EXERCISE_CATALOG } from '../src/lib/exercises';
describe('Fichas de exercícios',()=>{
 test('novas demonstrações pertencem ao catálogo e têm vídeos, GIF, capa e licença',()=>{
  expect(Object.keys(ADDITIONAL_EXERCISE_MOTION)).toHaveLength(16);
  for(const id of Object.keys(ADDITIONAL_EXERCISE_MOTION)) {
   const exercise=EXERCISE_CATALOG.map(e=>getExerciseInfo(e.name)).find(e=>e.id===id);
   expect(exercise).toBeDefined();
   for(const url of [exercise?.videoUrl,exercise?.webmUrl,exercise?.gifUrl,exercise?.posterUrl])expect(url).toContain('/__l5e/assets-v1/');
   expect(exercise?.mediaCredit?.license).toBe('CC BY-SA 4.0');
  }
 });
 test('não confunde variantes de movimento ou equipamento',()=>{
  for(const name of ['Agachamento livre','Stiff','Rosca scott','Tríceps corda','Ponte de glúteo'])expect(getExerciseInfo(name).videoUrl).toBeUndefined();
  expect(getExerciseInfo('Elevação pélvica').videoUrl).toBeDefined();
 });
 test('mídia real tem vídeo, GIF e créditos apenas no exercício correto',()=>{const e=getExerciseInfo('Supino reto');expect(e.videoUrl).toContain('/__l5e/assets-v1/');expect(e.gifUrl).toContain('/__l5e/assets-v1/');expect(e.mediaCredit?.license).toBe('CC BY-SA 4.0');expect(getExerciseInfo('Supino reto inventado').videoUrl).toBeUndefined();expect(getExerciseInfo('Supino reto inventado').gifUrl).toBeUndefined();});
 test('Coach usa instruções e anatomia locais sem dados de execução inventados',()=>{const text=coachExerciseReferences(['Supino reto'],'Troque por Rosca direta');expect(text).toContain('Peitoral');expect(text).toContain('Bíceps');expect(text).toContain('instructions');expect(text).toContain('escápulas');expect(text).not.toContain('videoUrl');});
 test('supino destaca peito e músculos secundários',()=>{const e=getExerciseInfo('Supino inclinado com halteres');expect(e.primaryMuscles).toEqual(['Peitoral']);expect(e.secondaryMuscles).toContain('Ombros');expect(e.images.length).toBe(2);expect(e.instructions.length).toBe(4);});
 test('rosca destaca bíceps e agachamento quadríceps/glúteos',()=>{expect(getExerciseInfo('Rosca direta').primaryMuscles).toEqual(['Bíceps']);expect(getExerciseInfo('Agachamento').primaryMuscles).toEqual(['Quadríceps','Glúteos']);});
 test('não usa fotografia de outro exercício em nome desconhecido',()=>{expect(getExerciseInfo('Supino inventado').images).toEqual([]);expect(getExerciseInfo('Supino inventado').equipment).toBe('Não informado');});
 test('substituições excluem indesejados e equipamentos indisponíveis',()=>{const r=substitutesFor('Supino reto',{equipment:['Halteres'],disliked:['Crucifixo com halteres']});expect(r.every(x=>x.available && x.sameGroup)).toBe(true);expect(r.some(x=>x.exercise.name==='Crucifixo com halteres')).toBe(false);expect(r.some(x=>x.exercise.equipment==='Máquina')).toBe(false);expect(r.some(x=>x.exercise.name==='Paralelas')).toBe(false);});
});
