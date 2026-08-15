import { Link } from "@tanstack/react-router";
import { broRank, handleOf, initials } from "@/lib/social";
import { VerifiedBadge } from "@/components/verified-badge";
import { useHasStory } from "@/hooks/use-story-ring";

type MiniProfile = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  xp?: number | null;
  verified?: boolean | null;
};

const SIZES = { sm: "size-9 text-[11px]", md: "size-12 text-sm", lg: "size-20 text-xl" } as const;

export function BroAvatar({
  profile,
  size = "md",
  ring = false,
  story,
}: {
  profile: MiniProfile | undefined;
  size?: keyof typeof SIZES;
  ring?: boolean;
  /** Story ativo: light sweep sobre a própria imagem. Se omitido, é detectado automaticamente. */
  story?: boolean;
}) {
  const name = profile?.name ?? "Bro";
  const auto = useHasStory(profile?.id);
  const sweeping = story ?? auto;
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-elevated font-extrabold uppercase text-foreground ${
        SIZES[size]
      } ${ring ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "ring-1 ring-border"}`}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={name} className="size-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
      {sweeping && <i aria-hidden className="avatar-sweep" />}
    </span>
  );
}

export function BroIdentity({
  profile,
  subtitle,
  size = "md",
}: {
  profile: MiniProfile | undefined;
  subtitle?: string;
  size?: keyof typeof SIZES;
}) {
  const rank = broRank(profile?.xp ?? 0);
  return (
    <Link
      to="/app/bros/$id"
      params={{ id: profile?.id ?? "" }}
      className="press flex min-w-0 items-center gap-3"
    >
      <BroAvatar profile={profile} size={size} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 truncate font-bold leading-tight">
          {profile?.name ?? "Bro"}
          {profile?.verified && <VerifiedBadge size="sm" />}
          <span title={rank.name}>{rank.icon}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {subtitle ?? handleOf({ username: profile?.username ?? null, name: profile?.name ?? "bro" })}
        </span>
      </span>
    </Link>
  );
}


export function RankBadge({ xp }: { xp: number }) {
  const rank = broRank(xp);
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide"
      style={{ backgroundColor: `${rank.color}22`, color: rank.color }}
    >
      {rank.icon} {rank.name}
    </span>
  );
}
