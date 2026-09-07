import { Glyph } from "@/components/ascend-icon";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { useCustomAction, useCustomWorkouts } from "@/hooks/use-custom";
import { applyWorkoutChange, proposeWorkoutChange } from "@/lib/custom.functions";
import { estimateMinutes, type Proposal } from "@/lib/custom";
import { SPLITS } from "@/lib/ascend";

const QUICK = [
  "Deixe mais focado em calistenia",
  "Reduza o tempo total do treino",
  "Aumente o volume para hipertrofia",
  "Adapte para eu treinar sem equipamento",
  "Meu ombro está doendo, adapte",
];

/**
 * Painel do Coach IA para personalizar treinos.
 * A IA só PROPÕE — nada é salvo sem a confirmação explícita do atleta.
 */
export function WorkoutTuner({ workoutId }: { workoutId?: string }) {
  const navigate = useNavigate();
  const custom = useCustomWorkouts();
  const [target, setTarget] = useState<string>(workoutId ?? "split:push");
  const [request, setRequest] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const propose = useCustomAction(useServerFn(proposeWorkoutChange));
  const apply = useCustomAction(useServerFn(applyWorkoutChange));

  const isSplit = target.startsWith("split:");
  const currentId = isSplit ? null : target;

  function ask(text: string) {
    const value = text.trim();
    if (!value) return;
    setProposal(null);
    propose.mutate(
      {
        request: value,
        workoutId: currentId,
        splitId: isSplit ? target.slice(6) : null,
      },
      {
        onSuccess: (res) => setProposal(res.proposal),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  function confirm() {
    if (!proposal) return;
    apply.mutate(
      {
        workoutId: currentId,
        reason: request.slice(0, 200) || "Ajuste do Coach IA",
        proposal: {
          name: proposal.name,
          focus: proposal.focus,
          emoji: proposal.emoji,
          difficulty: proposal.difficulty,
          notes: proposal.notes,
          exercises: proposal.exercises,
        },
      },
      {
        onSuccess: (res) => {
          setProposal(null);
          setRequest("");
          toast.success(res.created ? "Novo treino criado com o ajuste" : "Treino atualizado");
          navigate({ to: "/app/personalizado/$id", params: { id: res.id } });
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <section className="panel space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-bold">Personalizar com o Coach IA</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Peça o ajuste em linguagem natural. O coach mostra a proposta e só altera o treino depois da
        sua confirmação — a versão anterior fica salva no histórico.
      </p>

      {!workoutId && (
        <select
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setProposal(null);
          }}
          className="w-full rounded-xl bg-elevated px-3 py-2.5 text-sm outline-none ring-ring focus:ring-2"
        >
          <optgroup label="Divisões padrão">
            {SPLITS.map((s) => (
              <option key={s.id} value={`split:${s.id}`}>
                <Glyph value={s.emoji} size={14} className="mr-1" />{s.name}
              </option>
            ))}
          </optgroup>
          {(custom.data?.workouts.length ?? 0) > 0 && (
            <optgroup label="Meus treinos">
              {custom.data?.workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  <Glyph value={w.emoji} size={14} className="mr-1" fallback="calisthenics" />{w.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      )}

      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => {
              setRequest(q);
              ask(q);
            }}
            className="press ember-border rounded-full bg-elevated px-3 py-1.5 text-xs font-semibold"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(request);
        }}
        className="flex gap-2"
      >
        <input
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="Ex.: troque agachamento por pistol squat"
          className="flex-1 rounded-xl bg-elevated px-3 py-2.5 text-sm outline-none ring-ring focus:ring-2"
        />
        <button
          type="submit"
          disabled={propose.isPending || !request.trim()}
          className="press rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {propose.isPending ? <Loader2 className="size-4 animate-spin" /> : "Propor"}
        </button>
      </form>

      {proposal && (
        <div className="animate-pop space-y-3 rounded-2xl bg-elevated p-4">
          <div className="flex items-center gap-2">
            <Glyph value={proposal.emoji} size={20} />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{proposal.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {proposal.focus} · {proposal.difficulty} · ~{estimateMinutes(proposal.exercises)} min
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{proposal.summary}</p>

          {proposal.changes.length > 0 && (
            <ul className="space-y-1">
              {proposal.changes.map((c) => (
                <li key={c} className="text-xs font-semibold text-primary">
                  • {c}
                </li>
              ))}
            </ul>
          )}

          <ul className="space-y-1.5">
            {proposal.exercises.map((e, i) => (
              <li key={`${e.name}-${i}`} className="flex items-center gap-2 rounded-xl bg-surface p-2.5">
                <Glyph value={e.emoji} size={16} />
                <span className="min-w-0 flex-1 truncate text-xs font-bold">{e.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {e.sets}x{e.hold ? `${e.hold}s` : e.reps} · {e.rest}s
                </span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={apply.isPending}
              className="press flex-1 rounded-full bg-primary py-2.5 text-xs font-extrabold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              {apply.isPending ? "Aplicando…" : isSplit ? "Salvar como meu treino" : "Aplicar alteração"}
            </button>
            <button
              onClick={() => setProposal(null)}
              className="press flex-1 rounded-full bg-surface py-2.5 text-xs font-bold"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
