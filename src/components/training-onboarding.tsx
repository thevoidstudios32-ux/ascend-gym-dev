import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MuscleMap } from "@/components/muscle-map";
import { generateAssessmentProgram } from "@/lib/assessment.functions";
import { assessmentSchema, ASSESSMENT_EQUIPMENT, ASSESSMENT_GOALS, type TrainingAssessment } from "@/lib/training-assessment";
import { WEEKDAYS, type ProgramProposal } from "@/lib/program";
import { useApplyProgram } from "@/hooks/use-program";

const equipmentOptions = ["Máquina", "Barra", "Halteres", "Cabo", "Peso corporal", "Barra fixa", "Paralelas"];
const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export function TrainingOnboarding({ initial, onDone, onCancel }: { initial?: unknown; onDone: () => void; onCancel?: () => void }) {
  const parsedInitial = assessmentSchema.safeParse(initial);
  const [form, setForm] = useState<Record<string, unknown>>(parsedInitial.success ? parsedInitial.data : { available_weekdays: [], equipment: [], priority_muscles: [] });
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<ProgramProposal | null>(null);
  const generate = useServerFn(generateAssessmentProgram);
  const qc = useQueryClient();
  const apply = useApplyProgram();
  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));
  const list = (key: string) => Array.isArray(form[key]) ? form[key] as string[] : [];
  const toggle = (key: string, value: string) => set(key, list(key).includes(value) ? list(key).filter(v => v !== value) : [...list(key), value]);
  const complete = () => { qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["ai-program"] }); onDone(); };
  async function submit() {
    const parsed = assessmentSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Complete os campos obrigatórios."); return; }
    setPending(true); setError("");
    try { const result = await generate({ data: parsed.data }); if (result.hadProgram) setProposal(result.proposal); else complete(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível gerar seu programa. Tente novamente."); }
    finally { setPending(false); }
  }
  const validStep = step === 0 ? Boolean(form.gender && form.goal && form.experience && Number(form.height_cm) >= 100 && Number(form.height_cm) <= 250 && Number(form.weight_kg) >= 30 && Number(form.weight_kg) <= 300)
    : step === 1 ? Boolean(form.days_per_week && list("available_weekdays").length === form.days_per_week && form.minutes_per_session)
    : step === 2 ? Boolean(form.equipment_mode && list("equipment").length) : true;
  const choices = (key: string, values: readonly string[]) => <div className="mt-2 flex flex-wrap gap-2">{values.map(v => <Button key={v} type="button" variant={form[key] === v ? "default" : "secondary"} aria-pressed={form[key] === v} onClick={() => set(key, v)}>{v}</Button>)}</div>;
  const field = "mt-2 w-full rounded-lg border border-border bg-elevated p-3 text-foreground";
  if (proposal) return <section className="space-y-5">
    <h1 className="text-display text-3xl">ALTERAÇÃO PROPOSTA</h1><p className="text-sm text-muted-foreground">Sua avaliação foi salva. O programa atual só será substituído se você aceitar.</p>
    <p>{proposal.summary}</p>{proposal.days.map(d => <div key={d.key} className="border-b border-border py-3"><h2 className="font-bold">{d.weekday} · {d.title}</h2>{d.exercises.map(e => <p key={e.name} className="text-sm text-muted-foreground">{e.name} — {e.sets}x{e.reps}</p>)}</div>)}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={apply.isPending} onClick={async () => { try { await apply.mutateAsync({ reason: "Reavaliação inicial aceita", program: proposal }); complete(); } catch(e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); } }}><Check /> ACEITAR ALTERAÇÃO</Button><Button variant="secondary" disabled={apply.isPending} onClick={complete}>RECUSAR</Button></div>
  </section>;
  return <section className="animate-rise space-y-6 pb-6">
    <header><p className="text-xs font-bold uppercase text-primary">Avaliação inicial · {step + 1}/4</p><h1 className="mt-2 text-display text-4xl">SEU PROGRAMA ASCEND</h1><p className="mt-2 text-sm text-muted-foreground">Um programa criado para o seu perfil, seus objetivos e sua rotina.</p></header>
    <div className="grid grid-cols-4 gap-2" aria-label="Progresso da avaliação">{[0,1,2,3].map(i => <div key={i} className={`h-1 rounded-full ${i <= step ? "bg-primary" : "bg-elevated"}`} />)}</div>
    {step === 0 && <div className="space-y-5">
      <div><h2 className="font-bold">Sexo</h2><div className="mt-2 flex flex-wrap gap-2">{[["masculino","Masculino"],["feminino","Feminino"],["nao_informado","Prefiro não informar"]].map(([v,label]) => <Button key={v} variant={form.gender === v ? "default" : "secondary"} aria-pressed={form.gender === v} onClick={() => set("gender",v)}>{label}</Button>)}</div></div>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Altura em cm<input aria-label="Altura em cm" type="number" min="100" max="250" className={field} value={String(form.height_cm ?? "")} onChange={e => set("height_cm",Number(e.target.value))} /></label><label className="text-sm font-bold">Peso em kg<input aria-label="Peso em kg" type="number" min="30" max="300" step="0.1" className={field} value={String(form.weight_kg ?? "")} onChange={e => set("weight_kg",Number(e.target.value))} /></label></div>
      <div><h2 className="font-bold">Objetivo</h2>{choices("goal",ASSESSMENT_GOALS)}</div><div><h2 className="font-bold">Nível de experiência</h2>{choices("experience",["iniciante","intermediário","avançado"])}</div>
    </div>}
    {step === 1 && <div className="space-y-5">
      <div><h2 className="font-bold">Dias por semana</h2><div className="mt-2 grid grid-cols-7 gap-2">{[1,2,3,4,5,6,7].map(n => <Button key={n} className="px-0" variant={form.days_per_week === n ? "default" : "secondary"} aria-pressed={form.days_per_week === n} onClick={() => set("days_per_week",n)}>{n}</Button>)}</div></div>
      <div><h2 className="font-bold">Dias específicos disponíveis</h2><div className="mt-2 flex flex-wrap gap-2">{WEEKDAYS.map((w,i) => <Button key={w} variant={list("available_weekdays").includes(w) ? "default" : "secondary"} aria-pressed={list("available_weekdays").includes(w)} onClick={() => toggle("available_weekdays",w)}>{days[i]}</Button>)}</div><p className="mt-2 text-xs text-muted-foreground">{list("available_weekdays").length} de {String(form.days_per_week ?? "—")} dias selecionados</p></div>
      <div><h2 className="font-bold">Tempo disponível por treino</h2><div className="mt-2 flex flex-wrap gap-2">{[30,45,60,75,90].map(n => <Button key={n} variant={form.minutes_per_session === n ? "default" : "secondary"} aria-pressed={form.minutes_per_session === n} onClick={() => set("minutes_per_session",n)}>{n === 90 ? "90+" : n} minutos</Button>)}</div></div>
    </div>}
    {step === 2 && <div className="space-y-5"><h2 className="font-bold">Equipamentos disponíveis</h2><div className="flex flex-wrap gap-2">{ASSESSMENT_EQUIPMENT.map(mode => <Button key={mode} variant={form.equipment_mode === mode ? "default" : "secondary"} aria-pressed={form.equipment_mode === mode} onClick={() => { set("equipment_mode",mode); set("equipment", mode === "Academia completa" ? equipmentOptions : mode === "Academia básica" ? ["Barra","Halteres","Peso corporal"] : mode === "Casa" || mode === "Apenas peso corporal" ? ["Peso corporal"] : []); }}>{mode}</Button>)}</div>
      {(form.equipment_mode === "Personalizado" || form.equipment_mode === "Casa") && <div><p className="mb-2 text-sm text-muted-foreground">Selecione o que está disponível.</p><div className="flex flex-wrap gap-2">{equipmentOptions.map(e => <Button key={e} variant={list("equipment").includes(e) ? "default" : "secondary"} aria-pressed={list("equipment").includes(e)} onClick={() => toggle("equipment",e)}>{e}</Button>)}</div></div>}
    </div>}
    {step === 3 && <div className="space-y-3"><h2 className="font-bold">Músculos prioritários</h2><p className="text-sm text-muted-foreground">Escolha até 5 prioridades. Elas receberão maior atenção e volume no programa, sem deixar o restante do corpo de lado.</p><MuscleMap value={list("priority_muscles")} onChange={v => set("priority_muscles",v)} /></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">{step > 0 && <Button variant="secondary" disabled={pending} onClick={() => { setStep(s => s-1); setError(""); }}><ArrowLeft /> Voltar</Button>}{onCancel && <Button variant="ghost" disabled={pending} onClick={onCancel}>Cancelar</Button>}<Button className="h-12 min-w-0 flex-1 whitespace-normal font-bold" disabled={!validStep || pending} onClick={() => step === 3 ? void submit() : setStep(s => s+1)}>{pending ? <Loader2 className="animate-spin" /> : step < 3 ? <ArrowRight /> : <Check />}{pending ? "GERANDO SEU PROGRAMA…" : step === 3 ? "GERAR MEU PROGRAMA" : "Continuar"}</Button></div>
  </section>;
}