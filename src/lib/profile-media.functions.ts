import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AVATAR_MAX = 300_000; // ~300KB de data URL

/** Salva a foto de perfil (data URL comprimida) do usuário autenticado. */
export const saveAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        avatar_url: z
          .string()
          .max(AVATAR_MAX, "Imagem muito grande")
          .regex(/^data:image\/(png|jpeg|webp);base64,/, "Formato inválido")
          .nullable(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.avatar_url })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Equipa um banner de perfil. */
export const saveBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ banner_id: z.string().min(1).max(40) }).parse(data))
  .handler(async ({ context, data }) => {
    const { BANNERS, isVoidOwner } = await import("@/lib/banners");
    const banner = BANNERS.find((b) => b.id === data.banner_id);
    if (!banner) throw new Error("Banner inválido");
    if (banner.category === "VOID" && !isVoidOwner(context.userId)) {
      throw new Error("Banner indisponível");
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({ banner_id: data.banner_id })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

