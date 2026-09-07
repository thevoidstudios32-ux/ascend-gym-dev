import { Glyph } from "@/components/ascend-icon";
import { useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { BroAvatar } from "@/components/bro";
import { useRanking } from "@/hooks/use-arena";
import { CATEGORY_EMOJI, CATEGORY_LABEL, RANGES, medalFor, type ArenaRange } from "@/lib/arena";

export function ArenaRanking({ category, myId }: { category: string; myId: string | undefined }) {
  const [range, setRange] = useState<ArenaRange>("week");
  const { data, isLoading } = useRanking(category, range);
  const rows = data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`press shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              range === r.id ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Glyph value={CATEGORY_EMOJI[category]} size={18} fallback="arena" />
          <p className="text-sm font-extrabold">{CATEGORY_LABEL[category] ?? category}</p>
        </div>

        {isLoading ? (
          <div className="grid h-32 place-items-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Ninguém pontuou nesta categoria ainda. Seja o primeiro a entrar na Arena.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const medal = medalFor(r.position);
              const mine = r.entry.user_id === myId;
              return (
                <li
                  key={r.entry.id}
                  className={`flex items-center gap-3 p-3 ${mine ? "bg-primary/10" : ""}`}
                >
                  <span className="w-7 shrink-0 text-center text-sm font-extrabold text-muted-foreground">
                    {medal ?? r.position}
                  </span>
                  {r.url ? (
                    <img
                      src={r.url}
                      alt={`Shape de ${r.profile?.name ?? "atleta"}`}
                      loading="lazy"
                      className="size-11 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <BroAvatar profile={r.profile ?? undefined} size="sm" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {r.profile?.name ?? "Atleta"} {mine ? <span className="text-primary">· você</span> : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.wins} vitórias · {r.battles} batalhas · {r.rate}% de aproveitamento
                    </p>
                  </div>
                  {r.position === 1 ? <Crown className="size-4 shrink-0 text-primary" /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
