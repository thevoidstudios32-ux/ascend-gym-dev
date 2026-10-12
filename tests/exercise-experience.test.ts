import { describe, test, expect } from 'bun:test';
import { getExerciseInfo } from '../src/lib/exercise-detail';
import { substitutesFor } from '../src/lib/exercises';
import { coachExerciseReferences } from '../src/lib/exercise-coach-context';
import { ADDITIONAL_EXERCISE_MOTION } from '../src/lib/exercise-motion-additional';
import { EXERCISE_CATALOG } from '../src/lib/exercises';
import { REVIEWED_EXERCISE_MOTION } from '../src/lib/exercise-motion-reviewed';
import { EXERCISE_MOTION } from '../src/lib/exercise-motion';
describe('Fichas de exercícios',()=>{
 test('auditoria cobre 60 exercícios, 28 com movimento e sem IDs duplicados',()=>{
  expect(EXERCISE_CATALOG).toHaveLength(60);
  expect(Object.keys(EXERCISE_MOTION)).toHaveLength(28);
  expect(Object.keys(REVIEWED_EXERCISE_MOTION)).toHaveLength(6);
  const infos=EXERCISE_CATALOG.map(e=>getExerciseInfo(e.name));
  expect(new Set(infos.map(e=>e.id)).size).toBe(60);
  for(const [id,motion] of Object.entries(EXERCISE_MOTION)){
   expect(infos.some(e=>e.id===id)).toBe(true);
   expect(motion.gifUrl).toContain('/__l5e/assets-v1/');
   expect(motion.posterUrl).toContain('/__l5e/assets-v1/');
   expect(motion.mediaCredit.sourceUrl).toStartWith('https://');
  }
 });
 test('novas fontes permitem GIF fotográfico sem exigir vídeo artificial',()=>{
  for(const name of ['Agachamento','Abdominal supra']){
   const e=getExerciseInfo(name);expect(e.videoUrl).toBeUndefined();expect(e.gifUrl).toBeDefined();expect(e.posterUrl).toBeDefined();expect(e.mediaCredit?.license).toBe('CC BY 3.0');
  }
  for(const name of ['Remada curvada','Levantamento terra','Desenvolvimento militar','Agachamento livre']){
   const e=getExerciseInfo(name);expect(e.videoUrl).toBeDefined();expect(e.webmUrl).toBeDefined();expect(e.mediaCredit?.author).toBe('FitnessScape');
  }
 });
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
  for(const name of ['Stiff','Rosca scott','Tríceps corda','Ponte de glúteo','Supino declinado','Cadeira extensora'])expect(getExerciseInfo(name).videoUrl).toBeUndefined();
  expect(getExerciseInfo('Elevação pélvica').videoUrl).toBeDefined();
 });
 test('mídia real tem vídeo, GIF e créditos apenas no exercício correto',()=>{const e=getExerciseInfo('Supino reto');expect(e.videoUrl).toContain('/__l5e/assets-v1/');expect(e.gifUrl).toContain('/__l5e/assets-v1/');expect(e.mediaCredit?.license).toBe('CC BY-SA 4.0');expect(getExerciseInfo('Supino reto inventado').videoUrl).toBeUndefined();expect(getExerciseInfo('Supino reto inventado').gifUrl).toBeUndefined();});
 test('Coach usa instruções e anatomia locais sem dados de execução inventados',()=>{const text=coachExerciseReferences(['Supino reto'],'Troque por Rosca direta');expect(text).toContain('Peitoral');expect(text).toContain('Bíceps');expect(text).toContain('instructions');expect(text).toContain('escápulas');expect(text).not.toContain('videoUrl');});
 test('supino destaca peito e músculos secundários',()=>{const e=getExerciseInfo('Supino inclinado com halteres');expect(e.primaryMuscles).toEqual(['Peitoral']);expect(e.secondaryMuscles).toContain('Ombros');expect(e.images.length).toBe(2);expect(e.instructions.length).toBe(4);});
 test('rosca destaca bíceps e agachamento quadríceps/glúteos',()=>{expect(getExerciseInfo('Rosca direta').primaryMuscles).toEqual(['Bíceps']);expect(getExerciseInfo('Agachamento').primaryMuscles).toEqual(['Quadríceps','Glúteos']);});
 test('não usa fotografia de outro exercício em nome desconhecido',()=>{expect(getExerciseInfo('Supino inventado').images).toEqual([]);expect(getExerciseInfo('Supino inventado').equipment).toBe('Não informado');});
 test('substituições excluem indesejados e equipamentos indisponíveis',()=>{const r=substitutesFor('Supino reto',{equipment:['Halteres'],disliked:['Crucifixo com halteres']});expect(r.every(x=>x.available && x.sameGroup)).toBe(true);expect(r.some(x=>x.exercise.name==='Crucifixo com halteres')).toBe(false);expect(r.some(x=>x.exercise.equipment==='Máquina')).toBe(false);expect(r.some(x=>x.exercise.name==='Paralelas')).toBe(false);});
});
