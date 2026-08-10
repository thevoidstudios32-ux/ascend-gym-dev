import { useState } from "react";

type Props = {
  /** URL da foto (data URL ou http). */
  src?: string | null;
  name?: string | null;
  className?: string;
  /** Mostra skeleton enquanto o perfil ainda está carregando. */
  loading?: boolean;
  rounded?: string;
};

export function initialsOf(name?: string | null) {
  return (
    (name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join("") || "A"
  );
}

/**
 * Avatar único do ASCEND — usado em toda a aplicação para manter a foto
 * consistente (Home, Perfil, Gym Bros, Feed, Stories, Ranking…).
 */
export function UserAvatar({
  src,
  name,
  className = "size-12",
  loading = false,
  rounded = "rounded-2xl",
}: Props) {
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;

  if (loading) {
    return <div className={`skeleton shrink-0 ${rounded} ${className}`} />;
  }

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden ${rounded} bg-primary text-base font-extrabold text-primary-foreground shadow-glow ${className}`}
    >
      {showImg ? (
        <img
          src={src!}
          alt={name ?? "Foto de perfil"}
          className="size-full object-cover"
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </div>
  );
}
