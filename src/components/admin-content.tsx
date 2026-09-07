import { Glyph } from "@/components/ascend-icon";
import { useState } from "react";
import { Eye, EyeOff, ImageIcon, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminContent,
  useDeleteContent,
  useRestoreContent,
  useSaveContent,
  useToggleContent,
  useUploadBannerImage,
} from "@/hooks/use-content";
import {
  CONTENT_RARITIES,
  UNLOCK_LABEL,
  UNLOCK_TYPES,
  type ContentPayload,
  type ContentRarity,
  type UnlockType,
} from "@/lib/content";

type Kind = "title" | "banner";
type Row = ContentPayload & {
  id: string;
  builtin: boolean;
  deleted_at: string | null;
  users: number;
  preview: string | null;
};

const EMPTY = (kind: Kind): ContentPayload => ({
  id: null,
  kind,
  slug: "",
  name: "",
  description: "",
  rarity: "COMMON",
  unlock_type: "manual",
  unlock_value: null,
  unlock_label: "",
  xp_reward: 0,
  image_url: null,
  image_position: "center",
  category: kind === "banner" ? "FORGED" : null,
  emoji: kind === "title" ? "🏅" : null,
  color: "#9CA3AF",
  active: true,
  admin_only: false,
  sort_order: 100,
});

/** Gerenciamento de títulos e banners do ASCEND (somente admin). */
export function ContentManagement() {
  const [kind, setKind] = useState<Kind>("title");
  const [editing, setEditing] = useState<ContentPayload | null>(null);
  const list = useAdminContent(kind);
  const toggle = useToggleContent();
  const remove = useDeleteContent();
  const restore = useRestoreContent();

  const rows = (list.data?.rows ?? []) as unknown as Row[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["title", "banner"] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`press rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide ${
              kind === k
                ? "bg-primary text-primary-foreground shadow-glow"
                : "border border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "title" ? "Títulos" : "Banners"}
          </button>
        ))}
        <button
          onClick={() => setEditing(EMPTY(kind))}
          className="press ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground"
        >
          <Plus className="size-3.5" /> Novo
        </button>
      </div>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando catálogo…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item cadastrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3 ${
                r.deleted_at ? "opacity-50" : ""
              }`}
            >
              {r.kind === "banner" ? (
                r.preview ? (
                  <img src={r.preview} alt={r.name} className="h-12 w-20 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-12 w-20 place-items-center rounded-lg bg-elevated text-muted-foreground">
                    <ImageIcon className="size-4" />
                  </span>
                )
              ) : (
                <span className="grid size-12 place-items-center rounded-lg bg-elevated text-xl">
                  <Glyph value={r.emoji} size={18} fallback="medal" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {r.name}{" "}
                  {r.builtin ? (
                    <span className="ml-1 rounded-full bg-elevated px-2 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                      nativo
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {r.rarity} · {UNLOCK_LABEL[r.unlock_type]}
                  {r.unlock_value ? ` ${r.unlock_value}` : ""} · {r.users} usuários
                  {r.admin_only ? " · admin only" : ""}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  aria-label={r.active ? "Desativar" : "Ativar"}
                  onClick={() =>
                    toggle.mutate(
                      { id: r.id, active: !r.active },
                      { onError: (e: Error) => toast.error(e.message) },
                    )
                  }
                  className="press grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
                >
                  {r.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <button
                  aria-label="Editar"
                  onClick={() => setEditing({ ...r, id: r.id })}
                  className="press grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
                {r.deleted_at ? (
                  <button
                    aria-label="Restaurar"
                    onClick={() => restore.mutate(r.id)}
                    className="press grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                ) : (
                  <button
                    aria-label="Excluir"
                    onClick={() => {
                      if (!window.confirm(`Excluir "${r.name}"?`)) return;
                      remove.mutate(r.id, {
                        onSuccess: (res) =>
                          toast.success(
                            res.softDeleted
                              ? "Item desativado (já usado por jogadores)"
                              : "Item excluído",
                          ),
                        onError: (e: Error) => toast.error(e.message),
                      });
                    }}
                    className="press grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-primary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <ContentForm value={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function ContentForm({ value, onClose }: { value: ContentPayload; onClose: () => void }) {
  const [form, setForm] = useState<ContentPayload>(value);
  const [preview, setPreview] = useState<string | null>(null);
  const save = useSaveContent();
  const upload = useUploadBannerImage();
  const set = <K extends keyof ContentPayload>(k: K, v: ContentPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function pickImage(file?: File) {
    if (!file) return;
    if (file.size > 2_500_000) {
      toast.error("Imagem muito grande (máx. 2.5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      upload.mutate(dataUrl, {
        onSuccess: (res) => {
          set("image_url", res.reference);
          setPreview(res.previewUrl);
          toast.success("Imagem enviada");
        },
        onError: (e: Error) => toast.error(e.message),
      });
    };
    reader.readAsDataURL(file);
  }

  function submit() {
    save.mutate(
      { ...form, slug: form.slug.trim().toLowerCase() },
      {
        onSuccess: () => {
          toast.success("Conteúdo salvo");
          onClose();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  const needsValue = ["level", "xp", "workouts", "streak", "achievement"].includes(form.unlock_type);

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-rise max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
            {form.id ? "Editar" : "Novo"} {form.kind === "title" ? "título" : "banner"}
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="press rounded-full bg-white/10 p-1.5">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Nome">
            <input className="inp" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Slug (identificador)">
            <input
              className="inp"
              value={form.slug}
              disabled={!!form.id}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="ex: iron-legend"
            />
          </Field>
          <Field label="Descrição">
            <input
              className="inp"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Raridade">
              <select
                className="inp"
                value={form.rarity}
                onChange={(e) => set("rarity", e.target.value as ContentRarity)}
              >
                {CONTENT_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ordem">
              <input
                type="number"
                className="inp"
                value={form.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Desbloqueio">
              <select
                className="inp"
                value={form.unlock_type}
                onChange={(e) => set("unlock_type", e.target.value as UnlockType)}
              >
                {UNLOCK_TYPES.map((u) => (
                  <option key={u} value={u}>
                    {UNLOCK_LABEL[u]}
                  </option>
                ))}
              </select>
            </Field>
            {needsValue ? (
              <Field label="Valor exigido">
                <input
                  type="number"
                  className="inp"
                  value={form.unlock_value ?? 0}
                  onChange={(e) => set("unlock_value", Number(e.target.value))}
                />
              </Field>
            ) : null}
          </div>

          <Field label="Texto do requisito (opcional)">
            <input
              className="inp"
              value={form.unlock_label ?? ""}
              onChange={(e) => set("unlock_label", e.target.value)}
            />
          </Field>

          {form.kind === "title" ? (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Emoji">
                <input className="inp" value={form.emoji ?? ""} onChange={(e) => set("emoji", e.target.value)} />
              </Field>
              <Field label="Cor">
                <input
                  type="color"
                  className="inp h-10 p-1"
                  value={form.color ?? "#9CA3AF"}
                  onChange={(e) => set("color", e.target.value)}
                />
              </Field>
              <Field label="XP ao desbloquear">
                <input
                  type="number"
                  className="inp"
                  value={form.xp_reward}
                  onChange={(e) => set("xp_reward", Number(e.target.value))}
                />
              </Field>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoria">
                  <select
                    className="inp"
                    value={form.category ?? "FORGED"}
                    onChange={(e) => set("category", e.target.value as ContentPayload["category"])}
                  >
                    {["CORE", "FORGED", "LEGACY", "VOID"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Posição da imagem">
                  <input
                    className="inp"
                    value={form.image_position ?? ""}
                    onChange={(e) => set("image_position", e.target.value)}
                    placeholder="center 40%"
                  />
                </Field>
              </div>
              <Field label="Imagem do banner">
                <label className="press flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <ImageIcon className="size-4" />
                  {upload.isPending ? "Enviando…" : "Escolher imagem"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => pickImage(e.target.files?.[0])}
                  />
                </label>
              </Field>
              {preview ? (
                <img src={preview} alt="Prévia" className="h-28 w-full rounded-xl object-cover" />
              ) : null}
            </>
          )}

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <input
                type="checkbox"
                checked={form.admin_only}
                onChange={(e) => set("admin_only", e.target.checked)}
              />
              Somente admin
            </label>
          </div>

          <button
            onClick={submit}
            disabled={save.isPending || !form.name || !form.slug}
            className="press mt-2 w-full rounded-xl bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-50"
          >
            {save.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
