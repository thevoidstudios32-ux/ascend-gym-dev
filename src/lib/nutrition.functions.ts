import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Analisa a foto de uma refeição com IA e devolve macros estimados (não salva nada). */
export const analyzeMealPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        image: z.string().min(50).max(9_000_000),
        notes: z.string().max(300).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { analyzeMealImage } = await import("@/lib/nutrition.server");
    return analyzeMealImage(data.image, data.notes);
  });

/** Busca um produto pelo código de barras na base pública Open Food Facts. */
export const scanBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        code: z.string().regex(/^\d{6,14}$/).optional(),
        image: z.string().min(50).max(9_000_000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { lookupFoodByBarcode, readBarcodeFromImage } = await import("@/lib/nutrition.server");
    let code = data.code ?? null;
    if (!code && data.image) code = await readBarcodeFromImage(data.image);
    if (!code) throw new Error("Nenhum código de barras identificado. Tente aproximar mais.");
    return { code, ...(await lookupFoodByBarcode(code)) };
  });
