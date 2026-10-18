import asset0 from "@/assets/exercises/supino-reto-0.jpg.asset.json";
import asset1 from "@/assets/exercises/supino-reto-1.jpg.asset.json";
import asset2 from "@/assets/exercises/supino-inclinado-com-halteres-0.jpg.asset.json";
import asset3 from "@/assets/exercises/supino-inclinado-com-halteres-1.jpg.asset.json";
import asset4 from "@/assets/exercises/rosca-direta-0.jpg.asset.json";
import asset5 from "@/assets/exercises/rosca-direta-1.jpg.asset.json";
import asset6 from "@/assets/exercises/agachamento-0.jpg.asset.json";
import asset7 from "@/assets/exercises/agachamento-1.jpg.asset.json";
import asset8 from "@/assets/exercises/puxada-alta-0.jpg.asset.json";
import asset9 from "@/assets/exercises/puxada-alta-1.jpg.asset.json";
import asset10 from "@/assets/exercises/flexao-de-braco-0.jpg.asset.json";
import asset11 from "@/assets/exercises/flexao-de-braco-1.jpg.asset.json";
import asset12 from "@/assets/exercises/elevacao-lateral-0.jpg.asset.json";
import asset13 from "@/assets/exercises/elevacao-lateral-1.jpg.asset.json";
import asset14 from "@/assets/exercises/remada-unilateral-0.jpg.asset.json";
import asset15 from "@/assets/exercises/remada-unilateral-1.jpg.asset.json";
import asset16 from "@/assets/exercises/leg-press-0.jpg.asset.json";
import asset17 from "@/assets/exercises/leg-press-1.jpg.asset.json";
import asset18 from "@/assets/exercises/prancha-0.jpg.asset.json";
import asset19 from "@/assets/exercises/prancha-1.jpg.asset.json";
import asset20 from "@/assets/exercises/triceps-corda-0.jpg.asset.json";
import asset21 from "@/assets/exercises/triceps-corda-1.jpg.asset.json";
import asset22 from "@/assets/exercises/desenvolvimento-com-halteres-0.jpg.asset.json";
import asset23 from "@/assets/exercises/desenvolvimento-com-halteres-1.jpg.asset.json";
import asset24 from "@/assets/exercises/crucifixo-com-halteres-0.jpg.asset.json";
import asset25 from "@/assets/exercises/crucifixo-com-halteres-1.jpg.asset.json";
import asset26 from "@/assets/exercises/stiff-0.jpg.asset.json";
import asset27 from "@/assets/exercises/stiff-1.jpg.asset.json";
import asset28 from "@/assets/exercises/rosca-martelo-0.jpg.asset.json";
import asset29 from "@/assets/exercises/rosca-martelo-1.jpg.asset.json";
import asset30 from "@/assets/exercises/ponte-de-gluteo-0.jpg.asset.json";
import asset31 from "@/assets/exercises/ponte-de-gluteo-1.jpg.asset.json";
import x00 from "@/assets/exercises/supino-declinado-0.jpg.asset.json";
import x01 from "@/assets/exercises/supino-declinado-1.jpg.asset.json";
import x10 from "@/assets/exercises/crucifixo-inclinado-0.jpg.asset.json";
import x11 from "@/assets/exercises/crucifixo-inclinado-1.jpg.asset.json";
import x20 from "@/assets/exercises/peck-deck-0.jpg.asset.json";
import x21 from "@/assets/exercises/peck-deck-1.jpg.asset.json";
import x30 from "@/assets/exercises/crossover-no-cabo-0.jpg.asset.json";
import x31 from "@/assets/exercises/crossover-no-cabo-1.jpg.asset.json";
import x40 from "@/assets/exercises/pulldown-com-corda-0.jpg.asset.json";
import x41 from "@/assets/exercises/pulldown-com-corda-1.jpg.asset.json";
import x50 from "@/assets/exercises/elevacao-frontal-0.jpg.asset.json";
import x51 from "@/assets/exercises/elevacao-frontal-1.jpg.asset.json";
import x60 from "@/assets/exercises/mergulho-no-banco-0.jpg.asset.json";
import x61 from "@/assets/exercises/mergulho-no-banco-1.jpg.asset.json";
import x70 from "@/assets/exercises/coice-no-cabo-0.jpg.asset.json";
import x71 from "@/assets/exercises/coice-no-cabo-1.jpg.asset.json";
import x80 from "@/assets/exercises/abducao-na-maquina-0.jpg.asset.json";
import x81 from "@/assets/exercises/abducao-na-maquina-1.jpg.asset.json";
import x90 from "@/assets/exercises/elevacao-de-pernas-0.jpg.asset.json";
import x91 from "@/assets/exercises/elevacao-de-pernas-1.jpg.asset.json";
import x100 from "@/assets/exercises/abdominal-no-cabo-0.jpg.asset.json";
import x101 from "@/assets/exercises/abdominal-no-cabo-1.jpg.asset.json";
import x110 from "@/assets/exercises/prancha-lateral-0.jpg.asset.json";
import x111 from "@/assets/exercises/prancha-lateral-1.jpg.asset.json";
import x120 from "@/assets/exercises/extensao-de-quadril-em-quatro-apoios-0.jpg.asset.json";
import x121 from "@/assets/exercises/extensao-de-quadril-em-quatro-apoios-1.jpg.asset.json";
// Free Exercise DB (Unlicense) start/end photos.
export const EXERCISE_IMAGES: Record<string, string[]> = {
  "supino-reto": [asset0.url, asset1.url],
  "supino-inclinado-com-halteres": [asset2.url, asset3.url],
  "rosca-direta": [asset4.url, asset5.url],
  "agachamento": [asset6.url, asset7.url],
  "puxada-alta": [asset8.url, asset9.url],
  "flexao-de-braco": [asset10.url, asset11.url],
  "elevacao-lateral": [asset12.url, asset13.url],
  "remada-unilateral": [asset14.url, asset15.url],
  "leg-press": [asset16.url, asset17.url],
  "prancha": [asset18.url, asset19.url],
  "triceps-corda": [asset20.url, asset21.url],
  "desenvolvimento-com-halteres": [asset22.url, asset23.url],
  "crucifixo-com-halteres": [asset24.url, asset25.url],
  "stiff": [asset26.url, asset27.url],
  "rosca-martelo": [asset28.url, asset29.url],
  "ponte-de-gluteo": [asset30.url, asset31.url],
  "supino-declinado": [x00.url, x01.url],
  "crucifixo-inclinado": [x10.url, x11.url],
  "peck-deck": [x20.url, x21.url],
  "crossover-no-cabo": [x30.url, x31.url],
  "pulldown-com-corda": [x40.url, x41.url],
  "elevacao-frontal": [x50.url, x51.url],
  "mergulho-no-banco": [x60.url, x61.url],
  "coice-no-cabo": [x70.url, x71.url],
  "abducao-na-maquina": [x80.url, x81.url],
  "elevacao-de-pernas": [x90.url, x91.url],
  "abdominal-no-cabo": [x100.url, x101.url],
  "prancha-lateral": [x110.url, x111.url],
  "extensao-de-quadril-em-quatro-apoios": [x120.url, x121.url],
};
