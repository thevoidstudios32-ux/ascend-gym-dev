import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, RefreshCw, Swords, Trophy } from "lucide-react";
import { BroAvatar } from "@/components/bro";
import { Confetti } from "@/components/ui-kit";
import { useArenaAction, useBattle } from "@/hooks/use-arena";
import { castVote } from "@/lib/arena.functions";
import { CATEGORY_EMOJI, CATEGORY_LABEL, type ArenaCard } from "@/lib/arena";

export function ArenaBattle({ category }: { category: string }) {
  const { data, isLoading, refetch, isFetching } = useBattle(category);
  const vote = useArenaAction(useServerFn(castVote));
  const [picked, setPicked] = useState<string | null>(null);

  function choose(winner: ArenaCard, loser: ArenaCard) {
    if (vote.isPending || picked) return;
    setPicked(winner.entry.id);
    vote.mutate(
      { winnerId: winner.entry.id, loserId: loser.entry.id, category },
      {
        onSuccess: () => {
          setTimeout(() => {
            setPicked(null);
            void refetch();
          }, 900);
        },
        onError: (e) => {
          setPicked(null);
          toast.error(e instanceof Error ? e.message : "Não foi possível votar.");
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="glass grid h-64 place-items-center p-6 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass space-y-3 p-6 text-center">
        <p className="text-4xl">{CATEGORY_EMOJI[category] ?? "🔥"}</p>
        <p className="font-bold">Sem confrontos disponíveis</p>
        <p className="text-sm text-muted-foreground">
          Ainda não há participantes suficientes em {CATEGORY_LABEL[category] ?? category} — ou você já
          votou em todos. Volte mais tarde ou participe você mesmo.
        </p>
        <button
          onClick={() => void refetch()}
          className="press mx-auto flex items-center gap-2 rounded-full bg-elevated px-4 py-2 text-xs font-bold"
        >
          <RefreshCw className="size-3.5" /> Procurar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Confetti fire={vote.isSuccess && picked !== null} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          Quem está com o melhor shape?
        </p>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="press flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-[11px] font-bold disabled:opacity-40"
        >
          <RefreshCw className={`size-3 ${isFetching ? "animate-spin" : ""}`} /> Pular
        </button>
      </div>

      <div className="relative grid grid-cols-2 gap-3">
        <BattleSide card={data.left} picked={picked} onPick={() => choose(data.left, data.right)} />
        <BattleSide card={data.right} picked={picked} onPick={() => choose(data.right, data.left)} />
        <span className="pointer-events-none absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 text-primary shadow-glow backdrop-blur">
          <Swords className="size-5" />
        </span>
      </div>
    </div>
  );
}

function BattleSide({
  card,
  picked,
  onPick,
}: {
  card: ArenaCard;
  picked: string | null;
  onPick: () => void;
}) {
  const isWinner = picked === card.entry.id;
  const isLoser = picked !== null && !isWinner;

  return (
    <button
      onClick={onPick}
      disabled={picked !== null}
      className={`press card group relative overflow-hidden text-left transition-all duration-300 ${
        isWinner ? "ring-2 ring-primary shadow-glow" : ""
      } ${isLoser ? "opacity-40 grayscale" : ""}`}
    >
      {card.url ? (
        <img
          src={card.url}
          alt={`Participação de ${card.profile?.name ?? "atleta"} na ASCEND Arena`}
          loading="lazy"
          className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="aspect-[3/4] w-full bg-elevated" />
      )}

      {isWinner ? (
        <span className="animate-pop absolute inset-0 grid place-items-center bg-background/40 text-5xl">
          🏆
        </span>
      ) : null}

      <div className="flex items-center gap-2 p-3">
        <BroAvatar profile={card.profile ?? undefined} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{card.profile?.name ?? "Atleta"}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Trophy className="size-3" /> {card.entry.wins} vitórias
          </p>
        </div>
      </div>
    </button>
  );
}
