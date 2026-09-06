/* Ficha de treino imprimível (PDF via impressão do navegador). */
import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { ascendBrandUrls } from "@/components/brand";
import { useProgram } from "@/hooks/use-program";
import { useCustomWorkouts } from "@/hooks/use-custom";
import { useDashboard } from "@/hooks/use-dashboard";
import { SPLITS } from "@/lib/ascend";
import { estimateMinutes } from "@/lib/custom";
import { dayMinutes, WEEKDAYS } from "@/lib/program";

type Row = {
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  rest: number;
  tip?: string;
};

type Block = { title: string; subtitle: string; minutes: number; rows: Row[] };

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

function blockHtml(b: Block) {
  const rows = b.rows
    .map(
      (r) => `
      <tr>
        <td class="ex"><strong>${esc(r.name)}</strong>${
          r.tip ? `<span class="tip">${esc(r.tip)}</span>` : ""
        }</td>
        <td>${esc(r.muscle)}</td>
        <td class="c">${r.sets}</td>
        <td class="c">${esc(r.reps)}</td>
        <td class="c">${r.rest}s</td>
        <td class="c load"></td>
        <td class="c load"></td>
        <td class="c load"></td>
        <td class="c load"></td>
      </tr>`,
    )
    .join("");
  return `
  <section class="block">
    <div class="bhead">
      <h2>${esc(b.title)}</h2>
      <span>${esc(b.subtitle)} · ~${b.minutes} min · ${b.rows.length} exercícios</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Exercício</th><th>Músculo</th><th class="c">Séries</th><th class="c">Reps</th><th class="c">Desc.</th>
          <th class="c">S1</th><th class="c">S2</th><th class="c">S3</th><th class="c">S4</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function sheetHtml(opts: { name: string; goal: string; blocks: Block[]; watermark: string }) {
  const date = new Date().toLocaleDateString("pt-BR");
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>Ficha de treino · ASCEND</title>
<style>
  @page { size: A4; margin: 14mm 12mm 24mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color:#0b0b0b; margin:0; }
  header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #DC2626; padding-bottom:8px; margin-bottom:14px; }
  h1 { font-size:22px; margin:0; letter-spacing:.14em; }
  header .meta { font-size:11px; color:#555; text-align:right; line-height:1.5; }
  .block { break-inside: avoid; margin-bottom:16px; }
  .bhead { display:flex; justify-content:space-between; align-items:baseline; border-left:4px solid #DC2626; padding-left:8px; margin-bottom:6px; }
  .bhead h2 { font-size:14px; margin:0; }
  .bhead span { font-size:10px; color:#666; }
  table { width:100%; border-collapse:collapse; font-size:10.5px; }
  th { background:#151515; color:#fff; font-weight:600; padding:5px 6px; text-align:left; font-size:9.5px; text-transform:uppercase; letter-spacing:.05em; }
  td { border-bottom:1px solid #e2e2e2; padding:5px 6px; vertical-align:top; }
  tr:nth-child(even) td { background:#fafafa; }
  td.c, th.c { text-align:center; }
  td.load { min-width:34px; background:#fff !important; border:1px solid #ddd; }
  .ex .tip { display:block; color:#777; font-size:9px; margin-top:2px; }
  .notes { margin-top:10px; font-size:10px; color:#666; }
  .watermark { position:fixed; bottom:6mm; left:0; right:0; text-align:center; opacity:.13; }
  .watermark img { height:52px; }
  .watermark p { margin:2px 0 0; font-size:9px; letter-spacing:.35em; }
  @media print { .watermark { position:fixed; } }
</style></head>
<body>
  <header>
    <h1>ASCEND · FICHA DE TREINO</h1>
    <div class="meta"><div><strong>${esc(opts.name)}</strong></div><div>${esc(opts.goal)}</div><div>Emitida em ${date}</div></div>
  </header>
  ${opts.blocks.map(blockHtml).join("")}
  <p class="notes">S1–S4: anote a carga (kg) e as repetições realizadas em cada série. Progrida quando concluir todas as repetições com boa execução.</p>
  <div class="watermark"><img src="${opts.watermark}" alt="ASCEND" /><p>ASCEND</p></div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); };<\/script>
</body></html>`;
}

export function WorkoutSheetButton() {
  const { data: program } = useProgram();
  const custom = useCustomWorkouts();
  const { data } = useDashboard();
  const [busy, setBusy] = useState(false);

  function build(): Block[] {
    const blocks: Block[] = [];
    const customBlocks: Block[] = (custom.data?.workouts ?? []).map((w) => ({
      title: w.name,
      subtitle: `${w.focus} · ${w.difficulty}`,
      minutes: estimateMinutes(w.exercises),
      rows: w.exercises.map((e) => ({
        name: e.name,
        muscle: e.muscle,
        sets: e.sets,
        reps: e.reps,
        rest: e.rest,
        tip: e.tip,
      })),
    }));
    const days = [...(program?.program?.days ?? [])].sort((a, b) => {
      const ia = WEEKDAYS.findIndex((w) => w === (a.weekday ?? "").toUpperCase());
      const ib = WEEKDAYS.findIndex((w) => w === (b.weekday ?? "").toUpperCase());
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    for (const d of days) {
      blocks.push({
        title: `${d.weekday} · ${d.title}`,
        subtitle: d.focus,
        minutes: dayMinutes(d),
        rows: d.exercises.map((e) => ({
          name: e.name,
          muscle: e.muscle,
          sets: e.sets,
          reps: e.reps,
          rest: e.rest,
          tip: e.purpose,
        })),
      });
    }
    // Sem programa da IA: usa os treinos personalizados do usuário…
    if (blocks.length === 0) blocks.push(...customBlocks);
    // …e se não houver nenhum, cai nas divisões padrão.
    if (blocks.length === 0) {
      for (const s of SPLITS) {
        blocks.push({
          title: s.name,
          subtitle: s.focus,
          minutes: s.minutes,
          rows: s.exercises.map((e) => ({
            name: e.name,
            muscle: e.muscle,
            sets: e.sets,
            reps: e.reps,
            rest: e.rest,
            tip: e.tip,
          })),
        });
      }
    }
    return blocks;
  }

  function open() {
    const blocks = build();
    if (blocks.length === 0) {
      toast.error("Nenhum treino disponível para exportar ainda.");
      return;
    }
    setBusy(true);
    const html = sheetHtml({
      name: data?.profile?.name || "Atleta ASCEND",
      goal: program?.program
        ? `${program.program.name} · ${program.program.split_label}`
        : data?.profile?.goal
          ? `Objetivo: ${data.profile.goal}`
          : "Divisões padrão Push / Pull / Legs / Full Body",
      blocks,
      watermark: new URL(ascendBrandUrls.full, window.location.origin).href,
    });
    const win = window.open("", "_blank");
    if (!win) {
      setBusy(false);
      toast.error("Permita pop-ups para baixar a ficha de treino.");
      return;
    }
    win.document.write(html);
    win.document.close();
    setBusy(false);
    toast.success("Ficha gerada! Use 'Salvar como PDF' na janela de impressão.");
  }

  return (
    <button
      onClick={open}
      disabled={busy}
      className="press flex w-full items-center justify-center gap-2 rounded-full bg-elevated py-3 text-sm font-extrabold disabled:opacity-50"
    >
      <Printer className="size-4" /> Exportar ficha de treino (PDF)
    </button>
  );
}
