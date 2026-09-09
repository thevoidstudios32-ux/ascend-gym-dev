/* Dicionário EN agregado. Cada módulo cobre uma área do app. */
import { common } from "./common";
import { home } from "./home";
import { workouts } from "./workouts";
import { social } from "./social";
import { health } from "./health";

export const EN: Record<string, string> = {
  ...common,
  ...home,
  ...workouts,
  ...social,
  ...health,
};
