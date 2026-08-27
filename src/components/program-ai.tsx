/* ASCEND AI PROGRAM — UI: preferências, editor, sheet do Coach IA e insights. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  COACH_SUGGESTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  INTENSITY_LABEL,
  INTENSITY_STYLE,
  MUSCLE_GROUPS,
  SPLIT_PREFERENCES,
  WEEKDAYS,
  dayMinutes,
  defaultPreferences,
  emptyProgramExercise,
  programMuscleVolume,
  type Program,
  type ProgramDay,
  type ProgramProposal,
  type Recommendation,
  type TrainingPreferences,
} from "@/lib/program";
import {
  useApplyProgram,
  useProgram,
  useProposeProgram,
  useRespondRecommendation,
  useSavePreferences,
  useStartProgramDay,
} from "@/hooks/use-program";

/* Overlays precisam sair de qualquer ancestral com `transform` (ex.: animate-rise). */
function Overlay({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.body);
  }, []);
  if (!host) return null;
  return createPortal(children, host);
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Overlay>
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
        <div
          role="dialog"
          aria-label={title}
          className="glass max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="press rounded-full bg-elevated p-2"
            >
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </Overlay>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`press rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Preferências */

export function PreferencesForm({
  initial,
  onDone,
}: {
  initial: TrainingPreferences | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState<TrainingPreferences>(initial ?? defaultPreferences());
  const save = useSavePreferences();

  const toggle = (key: "equipment" | "priority_muscles", value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const submit = async () => {
    try {
      await save.mutateAsync(form);
      toast.success("Preferências salvas.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Dias por semana
          <input
            type="number"
            min={1}
            max={7}
            value={form.days_per_week}
            onChange={(e) => setForm({ ...form, days_per_week: Math.max(1, Math.min(7, Number(e.target.value) || 1)) })}
            className="mt-1 w-full rounded-xl bg-elevated p-3 text-base font-bold text-foreground"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Minutos por sessão
          <input
            type="number"
            min={15}
            max={180}
            step={5}
            value={form.minutes_per_session}
            onChange={(e) =>
              setForm({ ...form, minutes_per_session: Math.max(15, Math.min(180, Number(e.target.value) || 15)) })
            }
            className="mt-1 w-full rounded-xl bg-elevated p-3 text-base font-bold text-foreground"
          />
        </label>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Objetivo</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((g) => (
            <Chip key={g} active={form.goal === g} onClick={() => setForm({ ...form, goal: g })}>
              {g}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Experiência</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPERIENCE_OPTIONS.map((g) => (
            <Chip key={g} active={form.experience === g} onClick={() => setForm({ ...form, experience: g })}>
              {g}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Equipamentos</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((g) => (
            <Chip key={g} active={form.equipment.includes(g)} onClick={() => toggle("equipment", g)}>
              {g}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prioridades</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((g) => (
            <Chip key={g} active={form.priority_muscles.includes(g)} onClick={() => toggle("priority_muscles", g)}>
              {g}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Divisão preferida</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SPLIT_PREFERENCES.map((g) => (
            <Chip
              key={g}
              active={(form.split_preference ?? SPLIT_PREFERENCES[0]) === g}
              onClick={() => setForm({ ...form, split_preference: g === SPLIT_PREFERENCES[0] ? null : g })}
            >
              {g}
            </Chip>
          ))}
        </div>
      </div>

      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Restrições / lesões
        <textarea
          rows={2}
          value={form.restrictions ?? ""}
          onChange={(e) => setForm({ ...form, restrictions: e.target.value || null })}
          placeholder="Ex.: ombro direito sensível, evitar agachamento livre"
          className="mt-1 w-full rounded-xl bg-elevated p-3 text-sm font-medium normal-case tracking-normal text-foreground"
        />
      </label>

      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Observações
        <textarea
          rows={2}
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
          placeholder="Ex.: treino de manhã, gosto de treinos curtos e intensos"
          className="mt-1 w-full rounded-xl bg-elevated p-3 text-sm font-medium normal-case tracking-normal text-foreground"
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={save.isPending}
        className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary p-4 font-extrabold text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Salvar preferências
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------- Editor */

type EditableProgram = Omit<Program, "id" | "version" | "active" | "updated_at">;

export function ProgramEditor({
  program,
  onClose,
  onRegenerate,
}: {
  program: Program;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const [draft, setDraft] = useState<EditableProgram>(() => structuredClone(program) as EditableProgram);
  const [openDay, setOpenDay] = useState<string | null>(program.days[0]?.key ?? null);
  const apply = useApplyProgram();

  const patchDay = (key: string, patch: Partial<ProgramDay>) =>
    setDraft((d) => ({ ...d, days: d.days.map((day) => (day.key === key ? { ...day, ...patch } : day)) }));

  const moveDay = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      const days = [...d.days];
      const target = index + dir;
      if (target < 0 || target >= days.length) return d;
      const [item] = days.splice(index, 1);
      days.splice(target, 0, item);
      return { ...d, days };
    });

  const addDay = () =>
    setDraft((d) => {
      if (d.days.length >= 7) return d;
      const key = `dia-${Date.now()}`;
      const day: ProgramDay = {
        key,
        weekday: WEEKDAYS[d.days.length % 7],
        title: "Novo dia",
        focus: "Full Body",
        muscles: [],
        intensity: "moderado",
        minutes: 60,
        exercises: [emptyProgramExercise()],
      };
      setOpenDay(key);
      return { ...d, days: [...d.days, day], days_per_week: Math.min(7, d.days.length + 1) };
    });

  const removeDay = (key: string) =>
    setDraft((d) => ({
      ...d,
      days: d.days.filter((day) => day.key !== key),
      days_per_week: Math.max(1, d.days.length - 1),
    }));

  const save = async () => {
    const clean: EditableProgram = {
      ...draft,
      days: draft.days.map((d) => ({ ...d, minutes: dayMinutes(d), exercises: d.exercises.filter((e) => e.name.trim()) })),
    };
    if (clean.days.some((d) => d.exercises.length === 0)) {
      toast.error("Cada dia precisa de pelo menos um exercício.");
      return;
    }
    try {
      await apply.mutateAsync({ reason: "Edição manual", program: clean });
      toast.success("Programa atualizado.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Nome do programa
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="mt-1 w-full rounded-xl bg-elevated p-3 text-base font-bold normal-case tracking-normal text-foreground"
        />
      </label>

      <div className="space-y-3">
        {draft.days.map((day, index) => (
          <div key={day.key} className="rounded-2xl border border-border bg-elevated/50 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenDay(openDay === day.key ? null : day.key)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-extrabold">
                  {day.weekday} · {day.title}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {day.focus} · {day.exercises.length} exercícios · {dayMinutes(day)} min
                </p>
              </button>
              <button type="button" aria-label="Mover para cima" onClick={() => moveDay(index, -1)} className="press rounded-full bg-elevated p-2">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" aria-label="Mover para baixo" onClick={() => moveDay(index, 1)} className="press rounded-full bg-elevated p-2">
                <ArrowDown className="size-3.5" />
              </button>
              <button type="button" aria-label="Remover dia" onClick={() => removeDay(day.key)} className="press rounded-full bg-elevated p-2 text-primary">
                <Trash2 className="size-3.5" />
              </button>
            </div>

            {openDay === day.key && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={day.title}
                    onChange={(e) => patchDay(day.key, { title: e.target.value })}
                    placeholder="Título"
                    className="rounded-xl bg-elevated p-2.5 text-sm font-bold"
                  />
                  <input
                    value={day.focus}
                    onChange={(e) => patchDay(day.key, { focus: e.target.value })}
                    placeholder="Foco"
                    className="rounded-xl bg-elevated p-2.5 text-sm font-bold"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((w) => (
                    <Chip key={w} active={day.weekday === w} onClick={() => patchDay(day.key, { weekday: w })}>
                      {w}
                    </Chip>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(INTENSITY_LABEL) as (keyof typeof INTENSITY_LABEL)[]).map((i) => (
                    <Chip key={i} active={day.intensity === i} onClick={() => patchDay(day.key, { intensity: i })}>
                      {INTENSITY_LABEL[i]}
                    </Chip>
                  ))}
                </div>

                <div className="space-y-2">
                  {day.exercises.map((ex, i) => (
                    <div key={i} className="rounded-xl bg-card p-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          value={ex.name}
                          onChange={(e) =>
                            patchDay(day.key, {
                              exercises: day.exercises.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)),
                            })
                          }
                          placeholder="Exercício"
                          className="min-w-0 flex-1 rounded-lg bg-elevated p-2 text-sm font-bold"
                        />
                        <button
                          type="button"
                          aria-label="Remover exercício"
                          onClick={() =>
                            patchDay(day.key, { exercises: day.exercises.filter((_, xi) => xi !== i) })
                          }
                          className="press rounded-full bg-elevated p-2 text-primary"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={ex.sets}
                          onChange={(e) =>
                            patchDay(day.key, {
                              exercises: day.exercises.map((x, xi) =>
                                xi === i ? { ...x, sets: Math.max(1, Math.min(10, Number(e.target.value) || 1)) } : x,
                              ),
                            })
                          }
                          aria-label="Séries"
                          className="rounded-lg bg-elevated p-2 text-xs font-bold"
                        />
                        <input
                          value={ex.reps}
                          onChange={(e) =>
                            patchDay(day.key, {
                              exercises: day.exercises.map((x, xi) => (xi === i ? { ...x, reps: e.target.value } : x)),
                            })
                          }
                          aria-label="Repetições"
                          className="rounded-lg bg-elevated p-2 text-xs font-bold"
                        />
                        <input
                          type="number"
                          min={15}
                          max={600}
                          step={15}
                          value={ex.rest}
                          onChange={(e) =>
                            patchDay(day.key, {
                              exercises: day.exercises.map((x, xi) =>
                                xi === i ? { ...x, rest: Math.max(15, Math.min(600, Number(e.target.value) || 15)) } : x,
                              ),
                            })
                          }
                          aria-label="Descanso (s)"
                          className="rounded-lg bg-elevated p-2 text-xs font-bold"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => patchDay(day.key, { exercises: [...day.exercises, emptyProgramExercise()] })}
                    className="press flex w-full items-center justify-center gap-1.5 rounded-xl bg-elevated p-2.5 text-xs font-bold"
                  >
                    <Plus className="size-3.5" /> Adicionar exercício
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addDay}
        className="press flex w-full items-center justify-center gap-1.5 rounded-2xl bg-elevated p-3 text-sm font-bold"
      >
        <Plus className="size-4" /> Adicionar dia
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRegenerate}
          className="press flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-elevated p-3.5 text-sm font-bold"
        >
          <RefreshCw className="size-4" /> Regenerar com IA
        </button>
        <button
          type="button"
          onClick={save}
          disabled={apply.isPending}
          className="press flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary p-3.5 text-sm font-extrabold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Salvar
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Coach sheet */

function ProposalView({
  proposal,
  onApply,
  onKeep,
  pending,
  hadProgram,
}: {
  proposal: ProgramProposal;
  onApply: () => void;
  onKeep: () => void;
  pending: boolean;
  hadProgram: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-primary">Proposta do Coach</p>
        <p className="mt-1 text-sm font-medium">{proposal.summary}</p>
      </div>

      {proposal.changes.length > 0 && (
        <ul className="space-y-1.5">
          {proposal.changes.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span aria-hidden>•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <p className="text-sm font-extrabold">
          {proposal.name} · {proposal.split_label} · {proposal.days_per_week}x/semana
        </p>
        {proposal.days.map((d) => (
          <div key={d.key} className="rounded-xl bg-elevated p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold">
                {d.weekday} · {d.title}
              </p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${INTENSITY_STYLE[d.intensity]}`}>
                {INTENSITY_LABEL[d.intensity]}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {d.exercises.map((e) => e.name).join(" · ") || d.focus}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onKeep}
          className="press flex-1 rounded-2xl bg-elevated p-3.5 text-sm font-bold"
        >
          Manter programa atual
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={pending}
          className="press flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary p-3.5 text-sm font-extrabold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {hadProgram ? "Aplicar ajuste" : "Criar programa"}
        </button>
      </div>
    </div>
  );
}

export function CoachProgramSheet({
  onClose,
  initialRequest,
}: {
  onClose: () => void;
  initialRequest?: string;
}) {
  const [request, setRequest] = useState(initialRequest ?? "");
  const [result, setResult] = useState<{ proposal: ProgramProposal; hadProgram: boolean } | null>(null);
  const propose = useProposeProgram();
  const apply = useApplyProgram();

  const run = async (text: string) => {
    const q = text.trim();
    if (q.length < 3) {
      toast.error("Descreva o que você quer ajustar.");
      return;
    }
    setResult(null);
    try {
      const res = await propose.mutateAsync(q);
      setResult(res as { proposal: ProgramProposal; hadProgram: boolean });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O Coach não conseguiu responder agora.");
    }
  };

  useEffect(() => {
    if (initialRequest) void run(initialRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyProposal = async () => {
    if (!result) return;
    const p = result.proposal;
    try {
      await apply.mutateAsync({
        reason: request.slice(0, 200) || "Ajuste do Coach IA",
        program: {
          name: p.name,
          goal: p.goal,
          split_label: p.split_label,
          days_per_week: p.days_per_week,
          priorities: p.priorities,
          week_focus: p.week_focus,
          notes: p.notes,
          days: p.days,
        },
      });
      toast.success("Programa atualizado pelo Coach IA.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível aplicar.");
    }
  };

  return (
    <Sheet title="✨ Coach IA · Programa" onClose={onClose}>
      <div className="space-y-4">
        <textarea
          rows={3}
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="Ex.: quero treinar 5 dias, priorizando ombros e costas"
          className="w-full rounded-2xl bg-elevated p-3 text-sm font-medium"
        />
        <div className="flex flex-wrap gap-2">
          {COACH_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setRequest(s);
                void run(s);
              }}
              className="press rounded-full bg-elevated px-3 py-1.5 text-[11px] font-bold text-muted-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void run(request)}
          disabled={propose.isPending}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary p-3.5 font-extrabold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {propose.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Gerar proposta
        </button>

        {propose.isPending && (
          <p className="text-center text-xs text-muted-foreground">O Coach está montando seu programa…</p>
        )}

        {result && (
          <ProposalView
            proposal={result.proposal}
            hadProgram={result.hadProgram}
            pending={apply.isPending}
            onApply={applyProposal}
            onKeep={onClose}
          />
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ Insights */

function CoachInsightsArea({
  insights,
  recommendations,
}: {
  insights: { label: string; value: string; hint: string }[];
  recommendations: Recommendation[];
}) {
  const respond = useRespondRecommendation();
  if (insights.length === 0 && recommendations.length === 0) return null;

  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="text-xs font-black tracking-[0.18em] text-muted-foreground">AI COACH INSIGHTS</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {insights.map((i) => (
          <div key={i.label} className="rounded-xl bg-elevated p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{i.label}</p>
            <p className="mt-0.5 text-lg font-extrabold leading-none">{i.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{i.hint}</p>
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className="mt-3 space-y-2">
          {recommendations.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-elevated/60 p-3">
              <p className="text-sm font-bold">{r.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.message}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate({ id: r.id, status: "accepted" })}
                  className="press rounded-full bg-primary px-3 py-1.5 text-[11px] font-extrabold text-primary-foreground"
                >
                  {r.action_label ?? "Aceitar"}
                </button>
                <button
                  type="button"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate({ id: r.id, status: "dismissed" })}
                  className="press rounded-full bg-elevated px-3 py-1.5 text-[11px] font-bold"
                >
                  Agora não
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------- Seção completa */

export function AiProgramSection() {
  const { data, isLoading } = useProgram();
  const [sheet, setSheet] = useState<null | "coach" | "prefs" | "editor">(null);
  const [seed, setSeed] = useState<string | undefined>(undefined);
  const startDay = useStartProgramDay();
  const navigate = useNavigate();

  const program = data?.program ?? null;
  const volume = useMemo(() => programMuscleVolume(program?.days ?? []).slice(0, 5), [program]);

  const openCoach = (request?: string) => {
    setSeed(request);
    setSheet("coach");
  };

  const start = async (dayKey: string) => {
    try {
      const res = await startDay.mutateAsync(dayKey);
      await navigate({ to: "/app/treino/$split", params: { split: res.workoutId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível iniciar o treino.");
    }
  };

  return (
    <>
      <section className="panel space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xs font-black tracking-[0.18em] text-muted-foreground">ASCEND AI PROGRAM</h2>
            <p className="mt-1 truncate text-lg font-black">
              {program ? program.name : "Seu programa personalizado"}
            </p>
            <p className="text-xs text-muted-foreground">
              {program
                ? `${program.split_label} · ${program.days_per_week}x/semana · v${program.version}`
                : "A IA monta e adapta seu treino com base nos seus dados reais."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSheet("prefs")}
            className="press shrink-0 rounded-full bg-elevated px-3 py-2 text-[11px] font-bold"
          >
            Preferências
          </button>
        </div>

        <button
          type="button"
          onClick={() => openCoach()}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary p-4 font-extrabold text-primary-foreground shadow-glow"
        >
          <Sparkles className="size-4" /> Personalizar meu treino com IA
        </button>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando programa…</p>}

        {program && (
          <>
            {program.week_focus && (
              <p className="rounded-xl bg-elevated p-3 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">Foco da semana: </span>
                {program.week_focus}
              </p>
            )}

            <div className="space-y-2">
              {program.days.map((d) => (
                <div key={d.key} className="flex items-center gap-3 rounded-2xl bg-elevated p-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-extrabold">
                      {d.weekday} · {d.title}
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${INTENSITY_STYLE[d.intensity]}`}>
                        {INTENSITY_LABEL[d.intensity]}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {d.focus} · {d.exercises.length} exercícios · {dayMinutes(d)} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void start(d.key)}
                    disabled={startDay.isPending}
                    className="press shrink-0 rounded-full bg-primary px-3.5 py-2 text-[11px] font-extrabold text-primary-foreground disabled:opacity-60"
                  >
                    Iniciar
                  </button>
                </div>
              ))}
            </div>

            {volume.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {volume.map(([muscle, sets]) => (
                  <span key={muscle} className="rounded-full bg-elevated px-3 py-1 text-[11px] font-bold text-muted-foreground">
                    {muscle} · {sets} séries
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSheet("editor")}
              className="press w-full rounded-2xl bg-elevated p-3 text-sm font-bold"
            >
              Editar programa manualmente
            </button>
          </>
        )}
      </section>

      <CoachInsightsArea insights={data?.insights ?? []} recommendations={data?.recommendations ?? []} />

      {sheet === "coach" && <CoachProgramSheet initialRequest={seed} onClose={() => setSheet(null)} />}

      {sheet === "prefs" && (
        <Sheet title="Preferências de treino" onClose={() => setSheet(null)}>
          <PreferencesForm initial={data?.preferences ?? null} onDone={() => setSheet(null)} />
        </Sheet>
      )}

      {sheet === "editor" && program && (
        <Sheet title="Editar programa" onClose={() => setSheet(null)}>
          <ProgramEditor
            program={program}
            onClose={() => setSheet(null)}
            onRegenerate={() => openCoach("Regenerar meu programa mantendo meus objetivos atuais")}
          />
        </Sheet>
      )}
    </>
  );
}
