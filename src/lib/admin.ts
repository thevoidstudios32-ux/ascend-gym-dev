/* ASCEND Admin — tipos e helpers puros compartilhados entre servidor e UI. */

export type Period = 7 | 30 | 90 | 0; // 0 = all time

export type AdminMetrics = {
  totalUsers: number;
  newToday: number;
  activeToday: number;
  returningUsers: number;
  d1: RetentionStat;
  d7: RetentionStat;
  d30: RetentionStat;
  growth: SeriesPoint[];
  dau: SeriesPoint[];
  logins: SeriesPoint[];
};

export type RetentionStat = { eligible: number; returned: number; pct: number | null };

export type SeriesPoint = { date: string; value: number };

export type AdminUserRow = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  first_login_at: string | null;
  last_login_at: string | null;
  last_seen_at: string | null;
  login_count: number;
  xp: number;
  equipped_title_id: string | null;
  banner_id: string;
};

export const ONLINE_WINDOW_MIN = 10;

export function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MIN * 60_000;
}

export function utcDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

export function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
