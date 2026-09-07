import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Search, Sparkles, Star, X } from "lucide-react";
import {
  EQUIPMENTS,
  MUSCLE_GROUPS,
  substitutesFor,
  type CatalogExercise,
  type Equipment,
  type MuscleGroup,
} from "@/lib/exercises";
import { getGymSetup, suggestSubstitution, toggleFavoriteExercise } from "@/lib/exercises.functions";
import { Glyph } from "@/components/ascend-icon";

export function useGymSetup() {
  const fetcher = useServerFn(getGymSetup);
  return useQuery({ queryKey: ["gym-setup"], queryFn: () => fetcher(), staleTime: 60_000 });
}

const DIFF_COLOR: Record<string, string> = {
  Iniciante: "text-emerald-400",
  Intermediário: "text-amber-400",
  Avançado: "text-primary",
};

export function ExerciseSwapSheet({
  current,
  muscle,
  onClose,
  onSwap,
}: {
  current: string;
  muscle: string;
  onClose: () => void;
  onSwap: (next: CatalogExercise, keepLoad: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: setup, isLoading } = useGymSetup();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [equip, setEquip] = useState<Equipment | null>(null);
  const [picked, setPicked] = useState<CatalogExercise | null>(null);
  const [aiPick, setAiPick] = useState<{ choice: string; reason: string } | null>(null);

  const favorites = setup?.favorites ?? [];
  const gymEquipment = setup?.equipment ?? [];

  const results = useMemo(() => {
    const base = substitutesFor(current, { muscle, favorites, equipment: gymEquipment });
    const term = q.trim().toLowerCase();
    return base.filter((r) => {
      if (group && r.exercise.group !== group) return false;
      if (equip && r.exercise.equipment !== equip) return false;
      if (term && !r.exercise.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [current, muscle, favorites, gymEquipment, q, group, equip]);

  const favToggle = useServerFn(toggleFavoriteExercise);
  const favMutation = useMutation({
    mutationFn: (exercise: string) => favToggle({ data: { exercise } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-setup"] }),
  });

  const askAi = useServerFn(suggestSubstitution);
  const ai = useMutation({
    mutationFn: () =>
      askAi({
        data: {
          exercise: current,
          muscle,
          candidates: results.slice(0, 12).map((r) => r.exercise.name),
        },
      }),
    onSuccess: (res) => {
      setAiPick(res);
      const found = results.find((r) => r.exercise.name === res.choice);
      if (found) setPicked(found.exercise);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unavailable = results.length > 0 && results.every((r) => !r.available);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center">
      <div
        className="animate-sheet-up glass flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl md:rounded-3xl"
        role="dialog"
        aria-label="Trocar exercício"
      >
        <header className="flex items-center gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Trocar exercício</p>
            <h2 className="truncate text-lg font-extrabold">{current}</h2>
          </div>
          <button onClick={onClose} className="press rounded-full bg-elevated p-2" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center gap-2 rounded-2xl bg-elevated px-3 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar exercício…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(group === g ? null : g)}
                className={`press shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  group === g ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {EQUIPMENTS.map((eq) => (
              <button
                key={eq}
                onClick={() => setEquip(equip === eq ? null : eq)}
                className={`press shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  equip === eq
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {eq}
              </button>
            ))}
          </div>
          <button
            onClick={() => ai.mutate()}
            disabled={ai.isPending || results.length === 0}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary/15 py-2.5 text-sm font-bold text-primary disabled:opacity-50"
          >
            {ai.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Escolher melhor substituição
          </button>
          {aiPick && (
            <p className="animate-pop rounded-2xl bg-elevated p-3 text-xs leading-relaxed">
              <span className="font-bold text-primary">Coach IA:</span> {aiPick.reason}
            </p>
          )}
          {unavailable && (
            <p className="rounded-2xl bg-elevated p-3 text-xs text-muted-foreground">
              Esse exercício não está disponível na sua academia — veja as alternativas compatíveis abaixo.
            </p>
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20" />)}
          {!isLoading && results.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum exercício encontrado com esses filtros.
            </p>
          )}
          {results.map(({ exercise, favorite, available }) => {
            const active = picked?.name === exercise.name;
            return (
              <button
                key={exercise.name}
                onClick={() => setPicked(exercise)}
                className={`card animate-slide-fade flex w-full items-center gap-3 p-3 text-left ${
                  active ? "ring-2 ring-primary" : ""
                } ${available ? "" : "opacity-50"}`}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-elevated text-2xl">
                  <Glyph value={exercise.emoji} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate font-bold">
                    {favorite && <Star className="size-3.5 fill-primary text-primary" />}
                    {exercise.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {exercise.group} · {exercise.equipment} ·{" "}
                    <span className={DIFF_COLOR[exercise.difficulty]}>{exercise.difficulty}</span>
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {exercise.muscles.join(", ")}
                  </span>
                </span>
                <span
                  onClick={(ev) => {
                    ev.stopPropagation();
                    favMutation.mutate(exercise.name);
                  }}
                  className="press rounded-full bg-elevated p-2"
                  aria-label="Favoritar"
                >
                  <Star className={`size-4 ${favorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </span>
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="animate-pop space-y-2 border-t border-border p-4">
            <p className="text-xs text-muted-foreground">
              Trocar para <span className="font-bold text-foreground">{picked.name}</span>. Séries e
              repetições serão mantidas.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onSwap(picked, true)}
                className="press flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-glow"
              >
                <Check className="size-4" /> Manter carga
              </button>
              <button
                onClick={() => onSwap(picked, false)}
                className="press flex-1 rounded-2xl bg-elevated py-3 text-sm font-bold"
              >
                Editar carga
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
