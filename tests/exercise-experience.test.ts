import { describe, test, expect } from 'bun:test';
import { getExerciseInfo } from '../src/lib/exercise-detail';
import { substitutesFor } from '../src/lib/exercises';
describe('Fichas de exercícios',()=>{
 test('supino destaca peito e músculos secundários',()=>{const e=getExerciseInfo('Supino inclinado com halteres');expect(e.primaryMuscles).toEqual(['Peitoral']);expect(e.secondaryMuscles).toContain('Ombros');expect(e.images.length).toBe(2);expect(e.instructions.length).toBe(4);});
 test('rosca destaca bíceps e agachamento quadríceps/glúteos',()=>{expect(getExerciseInfo('Rosca direta').primaryMuscles).toEqual(['Bíceps']);expect(getExerciseInfo('Agachamento').primaryMuscles).toEqual(['Quadríceps','Glúteos']);});
 test('não usa fotografia de outro exercício em nome desconhecido',()=>{expect(getExerciseInfo('Supino inventado').images).toEqual([]);expect(getExerciseInfo('Supino inventado').equipment).toBe('Não informado');});
 test('substituições excluem indesejados e equipamentos indisponíveis',()=>{const r=substitutesFor('Supino reto',{equipment:['Halteres'],disliked:['Crucifixo com halteres']});expect(r.every(x=>x.available && x.sameGroup)).toBe(true);expect(r.some(x=>x.exercise.name==='Crucifixo com halteres')).toBe(false);expect(r.some(x=>x.exercise.equipment==='Máquina')).toBe(false);expect(r.some(x=>x.exercise.name==='Paralelas')).toBe(false);});
});
