import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useDashboard, useRefreshDashboard } from "@/hooks/use-dashboard";
import { saveProfile } from "@/lib/ascend.functions";
import { EXPERIENCES, GOALS, levelFromXp } from "@/lib/ascend";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil · ASCEND" },
      { name: "description", content: "Ajuste seus dados, objetivo e frequência de treino." },
      { property: "og:title", content: "Meu perfil · ASCEND" },
      { property: "og:description", content: "Ajuste dados, objetivo e frequência de treino." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PerfilPage,
});

const field = "w-full rounded-xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2";

function PerfilPage() {
  const { data } = useDashboard();
  const refresh = useRefreshDashboard();
  const save = useServerFn(saveProfile);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const p = data?.profile;

  const [form, setForm] = useState<null | {
    name: string;
    goal: string;
    experience: string;
    age: string;
    height_cm: string;
    weight_kg: string;
    days_per_week: string;
  }>(null);

  const current =
    form ??
    (p
      ? {
          name: p.name,
          goal: p.goal,
          experience: p.experience,
          age: String(p.age ?? ""),
          height_cm: String(p.height_cm ?? ""),
          weight_kg: String(p.weight_kg ?? ""),
          days_per_week: String(p.days_per_week),
        }
      : null);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          name: current!.name.trim() || "Atleta",
          goal: current!.goal,
          experience: current!.experience,
          age: Number(current!.age) || null,
          height_cm: Number(current!.height_cm) || null,
          weight_kg: Number(current!.weight_kg) || null,
          days_per_week: Number(current!.days_per_week) || 3,
        },
      }),
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!current || !p) return <p className="py-20 text-center text-muted-foreground">Carregando…</p>;

  const level = levelFromXp(p.xp);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-display text-4xl">PERFIL</h1>
        <p className="text-sm text-muted-foreground">
          Nível {level.level} · {level.name} · {p.xp} XP
        </p>
      </header>

      <section className="panel space-y-3 p-5">
        <input
          className={field}
          value={current.name}
          onChange={(e) => setForm({ ...current, name: e.target.value })}
          placeholder="Nome"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className={field}
            value={current.goal}
            onChange={(e) => setForm({ ...current, goal: e.target.value })}
          >
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={current.experience}
            onChange={(e) => setForm({ ...current, experience: e.target.value })}
          >
            {EXPERIENCES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input
            className={field}
            type="number"
            value={current.age}
            onChange={(e) => setForm({ ...current, age: e.target.value })}
            placeholder="Idade"
          />
          <input
            className={field}
            type="number"
            value={current.height_cm}
            onChange={(e) => setForm({ ...current, height_cm: e.target.value })}
            placeholder="Altura (cm)"
          />
          <input
            className={field}
            type="number"
            value={current.weight_kg}
            onChange={(e) => setForm({ ...current, weight_kg: e.target.value })}
            placeholder="Peso (kg)"
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Dias de treino por semana
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                onClick={() => setForm({ ...current, days_per_week: String(d) })}
                className={`h-10 flex-1 rounded-xl text-sm font-bold ${
                  Number(current.days_per_week) === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-elevated text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full rounded-full bg-primary py-3.5 font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {mutation.isPending ? "Salvando…" : "Salvar alterações"}
        </button>
      </section>

      <button
        onClick={signOut}
        className="w-full rounded-full border border-border py-3 text-sm font-bold text-muted-foreground"
      >
        Sair da conta
      </button>
    </div>
  );
}
