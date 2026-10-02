/* ASCEND Performance Dossier — client-side A4 renderer. Data is supplied by the live workout hooks. */
import type { jsPDF } from "jspdf";
import regularFont from "@/assets/pdf/barlow-regular.ttf.asset.json";
import boldFont from "@/assets/pdf/barlow-bold.ttf.asset.json";
import { ascendBrandUrls } from "@/components/brand";

export type PdfExercise = {
  name: string;
  muscle?: string;
  sets: number;
  reps: string;
  rest: number;
  notes?: string;
  hold?: number | null;
};
export type PdfWorkout = { title: string; focus: string; weekday?: string; minutes: number; exercises: PdfExercise[] };
export type PdfProgram = {
  athlete: string;
  goal?: string | undefined;
  level?: string | undefined;
  version?: number | undefined;
  duration?: string;
  days: PdfWorkout[];
};

type Document = jsPDF;
const W = 210;
const H = 297;
const M = 18;
const RIGHT = W - M;
const INK: [number, number, number] = [7, 7, 7];
const SURFACE: [number, number, number] = [19, 19, 19];
const LINE: [number, number, number] = [46, 46, 46];
const WHITE: [number, number, number] = [242, 242, 242];
const MUTED: [number, number, number] = [155, 155, 155];
const RED: [number, number, number] = [220, 38, 38];

function fill(doc: Document, color: [number, number, number]) { doc.setFillColor(...color); }
function color(doc: Document, value: [number, number, number]) { doc.setTextColor(...value); }
function rule(doc: Document, x: number, y: number, width: number, hue = LINE) {
  fill(doc, hue);
  doc.rect(x, y, width, .28, "F");
}
function text(doc: Document, value: string, x: number, y: number, size = 11, hue = WHITE, weight: "normal" | "bold" = "normal", options?: { align?: "right" | "center" }) {
  doc.setFont("Barlow", weight);
  doc.setFontSize(size);
  color(doc, hue);
  doc.text(value, x, y, options);
}
function lines(doc: Document, value: string, width: number, size: number, weight: "normal" | "bold" = "normal") {
  doc.setFont("Barlow", weight);
  doc.setFontSize(size);
  return doc.splitTextToSize(value, width) as string[];
}
function mark(doc: Document, asset: string | null, x: number, y: number, width: number, ratio: number) {
  if (asset) doc.addImage(asset, "PNG", x, y, width, width / ratio);
  else text(doc, "ASCEND", x, y + 5, 18, WHITE, "bold");
}
function shell(doc: Document, logo: string | null, section: string) {
  fill(doc, INK); doc.rect(0, 0, W, H, "F");
  mark(doc, logo, M, 13, 37, 411 / 33);
  text(doc, section.toUpperCase(), RIGHT, 18, 7, MUTED, "bold", { align: "right" });
  rule(doc, M, 24, W - M * 2);
}
function footer(doc: Document, page: number, total: number) {
  rule(doc, M, 280, W - M * 2);
  text(doc, "ASCEND // PERFORMANCE SYSTEM", M, 285, 7, MUTED, "bold");
  text(doc, `${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, RIGHT, 285, 7, MUTED, "bold", { align: "right" });
}
function newPage(doc: Document, logo: string | null, section: string) { doc.addPage(); shell(doc, logo, section); }
function label(doc: Document, value: string, x: number, y: number) { text(doc, value.toUpperCase(), x, y, 8, MUTED, "bold"); }
function title(doc: Document, value: string, x: number, y: number, width = W - M * 2, size = 30) {
  const result = lines(doc, value.toUpperCase(), width, size, "bold");
  result.forEach((line, i) => text(doc, line, x, y + i * 11, size, WHITE, "bold"));
  return y + (result.length - 1) * 11;
}
function stat(doc: Document, value: string, name: string, x: number, y: number, width: number) {
  fill(doc, SURFACE); doc.rect(x, y, width, 24, "F");
  label(doc, name, x + 5, y + 7);
  const data = lines(doc, value, width - 10, 15, "bold");
  text(doc, data[0] ?? value, x + 5, y + 18, 15, WHITE, "bold");
}
function metric(doc: Document, x: number, y: number, width: number, name: string, value: string) {
  label(doc, name, x, y);
  const wrapped = lines(doc, value, width, 12, "bold");
  wrapped.forEach((line, i) => text(doc, line, x, y + 7 + i * 5, 12, WHITE, "bold"));
}

async function binaryAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar os recursos do PDF.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let output = "";
  for (let i = 0; i < bytes.length; i += 8192) output += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(output);
}
async function imageData(url: string) {
  try { return `data:image/png;base64,${await binaryAsBase64(url)}`; }
  catch { return null; }
}

export async function generateWorkoutPdf(data: PdfProgram, onProgress?: (stage: string) => void) {
  onProgress?.("PREPARANDO SEU PROGRAMA");
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const [fontRegular, fontBold, fullLogo, wordmark, symbol] = await Promise.all([
    binaryAsBase64(regularFont.url), binaryAsBase64(boldFont.url),
    imageData(ascendBrandUrls.full), imageData(ascendBrandUrls.wordmark), imageData(ascendBrandUrls.symbol),
  ]);
  doc.addFileToVFS("Barlow-Regular.ttf", fontRegular);
  doc.addFont("Barlow-Regular.ttf", "Barlow", "normal");
  doc.addFileToVFS("Barlow-Bold.ttf", fontBold);
  doc.addFont("Barlow-Bold.ttf", "Barlow", "bold");
  const date = new Date().toLocaleDateString("pt-BR").replaceAll("/", ".");
  const days = data.days;
  const sessions = days.length;
  const average = sessions ? Math.round(days.reduce((n, d) => n + d.minutes, 0) / sessions) : 0;
  const sets = days.reduce((n, d) => n + d.exercises.reduce((v, e) => v + e.sets, 0), 0);
  const muscles = new Map<string, number>();
  days.forEach(d => d.exercises.forEach(e => {
    if (e.muscle) muscles.set(e.muscle, (muscles.get(e.muscle) ?? 0) + e.sets);
  }));
  onProgress?.("MONTANDO O PLANO DE PERFORMANCE");

  // Cover
  fill(doc, INK); doc.rect(0, 0, W, H, "F");
  fill(doc, RED); doc.rect(M, 18, 1.1, 19, "F");
  mark(doc, fullLogo, M + 5, 15, 55, 406 / 208);
  text(doc, "PERSONALIZED PERFORMANCE PLAN", M, 74, 9, RED, "bold");
  title(doc, "TRAINING\nPROGRAM", M, 99, 155, 42);
  rule(doc, M, 153, 28, RED);
  label(doc, "PREPARADO PARA", M, 175);
  const athleteEnd = title(doc, data.athlete, M, 191, 166, 26);
  const goalY = Math.max(209, athleteEnd + 15);
  if (data.goal) metric(doc, M, goalY, 85, "OBJETIVO", data.goal);
  metric(doc, 108, goalY, 80, "FREQUÊNCIA", `${sessions} ${sessions === 1 ? "TREINO" : "TREINOS"}`);
  if (data.level) metric(doc, M, goalY + 24, 85, "NÍVEL", data.level);
  if (data.version) metric(doc, 108, goalY + 24, 80, "PROGRAMA", `v${data.version}`);
  text(doc, `GENERATED ${date}`, M, 269, 8, MUTED, "bold");
  if (symbol) { doc.saveGraphicsState(); doc.setGState(doc.GState({ opacity: .12 })); mark(doc, symbol, 131, 23, 45, 245 / 205); doc.restoreGraphicsState(); }

  // Overview
  newPage(doc, wordmark, "01 / VISÃO GERAL");
  label(doc, "DOSSIÊ DE PERFORMANCE", M, 39);
  title(doc, "VISÃO GERAL", M, 54);
  text(doc, "SEU PLANO PERSONALIZADO EM UM OLHAR", M, 65, 9, MUTED);
  const gap = 3, sw = (W - M * 2 - gap) / 2;
  stat(doc, data.goal ?? "—", "OBJETIVO", M, 77, sw);
  stat(doc, `${sessions} ${sessions === 1 ? "dia" : "dias"} / semana`, "FREQUÊNCIA", M + sw + gap, 77, sw);
  stat(doc, data.level ?? "Não informado", "NÍVEL", M, 104, sw);
  stat(doc, data.duration ?? "Sem prazo definido", "DURAÇÃO DO PROGRAMA", M + sw + gap, 104, sw);
  stat(doc, `${average} min`, "SESSÃO MÉDIA", M, 131, sw);
  stat(doc, `${Math.max(0, 7 - sessions)} / semana`, "DIAS DE RECUPERAÇÃO", M + sw + gap, 131, sw);
  label(doc, "DIVISÃO SEMANAL", M, 169);
  rule(doc, M, 175, W - M * 2);
  let oy = 186;
  days.forEach((day, i) => {
    if (oy > 269) { newPage(doc, wordmark, "DIVISÃO SEMANAL"); oy = 45; }
    text(doc, String(i + 1).padStart(2, "0"), M, oy, 14, RED, "bold");
    const name = lines(doc, day.title, 89, 12, "bold");
    text(doc, name[0] ?? day.title, M + 17, oy, 12, WHITE, "bold");
    text(doc, day.weekday ?? `${day.exercises.length} exercícios`, RIGHT, oy, 8, MUTED, "bold", { align: "right" });
    const focus = lines(doc, day.focus, W - M * 2 - 17, 8);
    text(doc, focus[0] ?? "", M + 17, oy + 6, 8, MUTED);
    rule(doc, M, oy + 10, W - M * 2);
    oy += 17;
  });

  // Workouts. A card is measured before painting and never split across pages.
  days.forEach((day, index) => {
    newPage(doc, wordmark, `${String(index + 1).padStart(2, "0")} / TREINO`);
    const heading = () => {
      text(doc, `${String(index + 1).padStart(2, "0")} / ${day.weekday ?? "SESSÃO"}`, M, 42, 9, RED, "bold");
      const end = title(doc, day.title, M, 59, 166, 29);
      const focusLines = lines(doc, day.focus, W - M * 2, 10);
      focusLines.forEach((line, i) => text(doc, line, M, end + 11 + i * 5, 10, MUTED));
      const lineY = end + 17 + focusLines.length * 5;
      rule(doc, M, lineY, W - M * 2);
      text(doc, `${day.exercises.length} EXERCÍCIOS`, M, lineY + 7, 8, MUTED, "bold");
      text(doc, `~${day.minutes} MIN`, RIGHT, lineY + 7, 8, MUTED, "bold", { align: "right" });
      return lineY + 15;
    };
    let y = heading();
    day.exercises.forEach((exercise, exerciseIndex) => {
      const nameLines = lines(doc, exercise.name, 146, 14, "bold");
      const noteLines = exercise.notes ? lines(doc, exercise.notes, 151, 9) : [];
      let remaining = [...noteLines];
      let segment = 0;
      do {
        const first = segment === 0;
        const base = first ? 15 + nameLines.length * 6 + (exercise.muscle ? 6 : 0) + 24 : 17;
        if (y + base + (remaining.length ? 14 : 0) > 269) {
          newPage(doc, wordmark, `${String(index + 1).padStart(2, "0")} / TREINO · CONT.`);
          y = 39;
          text(doc, day.title.toUpperCase(), M, y, 11, MUTED, "bold");
          y += 12;
        }
        const available = Math.max(0, Math.floor((269 - y - base - 5) / 4.4));
        const chunk = remaining.splice(0, available);
        const height = base + (chunk.length ? chunk.length * 4.4 + 4 : 0);
        fill(doc, SURFACE); doc.rect(M, y, W - M * 2, height, "F");
        fill(doc, RED); doc.rect(M, y, 1, height, "F");
        if (first) {
          text(doc, String(exerciseIndex + 1).padStart(2, "0"), M + 5, y + 9, 11, RED, "bold");
          nameLines.forEach((line, i) => text(doc, line, M + 18, y + 9 + i * 6, 14, WHITE, "bold"));
          let itemY = y + 10 + nameLines.length * 6;
          if (exercise.muscle) { text(doc, exercise.muscle.toUpperCase(), M + 18, itemY, 8, MUTED); itemY += 6; }
          rule(doc, M + 5, itemY + 1, W - M * 2 - 10);
          metric(doc, M + 5, itemY + 8, 31, "SÉRIES", String(exercise.sets));
          metric(doc, M + 46, itemY + 8, 37, exercise.hold ? "TEMPO" : "REPS", exercise.hold ? `${exercise.hold}s` : exercise.reps);
          metric(doc, M + 96, itemY + 8, 51, "DESCANSO", `${exercise.rest} SEG`);
        } else label(doc, "INSTRUÇÕES · CONTINUAÇÃO", M + 5, y + 9);
        if (chunk.length) {
          const noteY = first ? y + base - 1 : y + 17;
          chunk.forEach((line, i) => text(doc, line, M + 5, noteY + i * 4.4, 9, MUTED));
        }
        y += height + 4;
        segment++;
      } while (remaining.length);
    });
  });

  // Summary
  newPage(doc, wordmark, "RESUMO DE PERFORMANCE");
  label(doc, "ANÁLISE DO PROGRAMA", M, 40);
  title(doc, "PERFORMANCE\nSUMMARY", M, 57, 170, 29);
  rule(doc, M, 83, W - M * 2);
  stat(doc, String(sessions), "TREINOS / SEMANA", M, 94, sw);
  stat(doc, String(sets), "SÉRIES / SEMANA", M + sw + gap, 94, sw);
  stat(doc, `${average} min`, "SESSÃO MÉDIA", M, 121, sw);
  stat(doc, String(Math.max(0, 7 - sessions)), "DIAS DE RECUPERAÇÃO", M + sw + gap, 121, sw);
  if (muscles.size) {
    label(doc, "VOLUME POR GRUPO MUSCULAR", M, 165);
    const ranked = [...muscles.entries()].sort((a, b) => b[1] - a[1]);
    const max = ranked[0]?.[1] ?? 1;
    let vy = 176;
    ranked.slice(0, 9).forEach(([name, count]) => {
      const short = lines(doc, name, 90, 9)[0] ?? name;
      text(doc, short, M, vy, 9, WHITE);
      text(doc, `${count} séries`, RIGHT, vy, 9, MUTED, "bold", { align: "right" });
      fill(doc, LINE); doc.rect(M, vy + 3, W - M * 2, 1.2, "F");
      fill(doc, RED); doc.rect(M, vy + 3, (W - M * 2) * count / max, 1.2, "F");
      vy += 10;
    });
  }
  newPage(doc, wordmark, "ASCEND PRINCIPLE");
  label(doc, "ASCEND PRINCIPLE", M, 118);
  rule(doc, M, 125, 26, RED);
  title(doc, "PROGRESSO NÃO SE GANHA.\nSE CONQUISTA.", M, 148, 168, 27);
  text(doc, data.athlete, M, 182, 11, MUTED);
  if (fullLogo) mark(doc, fullLogo, M, 224, 44, 406 / 208);
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) { doc.setPage(i); footer(doc, i, count); }
  onProgress?.("GERANDO PDF");
  return doc;
}
