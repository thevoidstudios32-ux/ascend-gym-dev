/* Dieta Inteligente — análise de refeições por IA (server-only). */

import { aiChat } from "@/lib/ai-provider.server";

export type MealItem = { name: string; qty: string; kcal: number; protein: number; carbs: number; fat: number };
export type MealAnalysis = {
  title: string;
  items: MealItem[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
  notes: string;
};

async function vision(prompt: string, imageDataUrl: string) {
  const json = (await aiChat({
    vision: true,
    messages: [
      {
        role: "system",
        content:
          "Você é um nutricionista do app ASCEND. Analise a foto da refeição e estime os alimentos e as " +
          "porções. Responda SOMENTE com JSON válido, sem markdown, no formato: " +
          '{"title":string,"items":[{"name":string,"qty":string,"kcal":number,"protein":number,"carbs":number,"fat":number}],' +
          '"fiber":number,"confidence":number,"notes":string}. ' +
          "Valores em gramas e kcal, números inteiros. confidence de 0 a 100. notes = 1 frase curta em português.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  })) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson(raw: string): Record<string, unknown> {
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Não consegui interpretar a análise. Tente outra foto.");
  return JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>;
}

const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

/** Analisa a foto de uma refeição e devolve macros somados + itens detectados. */
export async function analyzeMealImage(imageDataUrl: string, notes: string): Promise<MealAnalysis> {
  const prompt = notes.trim()
    ? `Analise esta refeição. Observações do usuário (use para melhorar a precisão): ${notes.trim()}`
    : "Analise esta refeição e estime as porções.";
  const parsed = parseJson(await vision(prompt, imageDataUrl));

  const rawItems = Array.isArray(parsed["items"]) ? (parsed["items"] as Record<string, unknown>[]) : [];
  const items: MealItem[] = rawItems.slice(0, 12).map((i) => ({
    name: String(i["name"] ?? "Item"),
    qty: String(i["qty"] ?? ""),
    kcal: num(i["kcal"]),
    protein: num(i["protein"]),
    carbs: num(i["carbs"]),
    fat: num(i["fat"]),
  }));

  const sum = (k: keyof MealItem) => items.reduce((a, i) => a + (i[k] as number), 0);

  return {
    title: String(parsed["title"] ?? "Refeição"),
    items,
    kcal: sum("kcal"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
    fiber: num(parsed["fiber"]),
    confidence: Math.min(100, num(parsed["confidence"])),
    notes: String(parsed["notes"] ?? ""),
  };
}

/** Lê o código de barras a partir da foto quando o navegador não tem BarcodeDetector. */
export async function readBarcodeFromImage(imageDataUrl: string) {
  const raw = await vision(
    'Leia o código de barras (EAN/UPC) desta imagem. Responda SOMENTE com JSON: {"code":"<somente digitos ou vazio>"}',
    imageDataUrl,
  );
  const code = String(parseJson(raw)["code"] ?? "").replace(/\D/g, "");
  return code || null;
}

/** Consulta o Open Food Facts (base pública) por código de barras. */
export async function lookupFoodByBarcode(code: string): Promise<MealAnalysis> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_size`,
  );
  if (!res.ok) throw new Error("Não consegui consultar a base de alimentos agora.");
  const json = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      brands?: string;
      serving_size?: string;
      nutriments?: Record<string, number>;
    };
  };
  if (json.status !== 1 || !json.product) throw new Error("Produto não encontrado nessa base.");

  const n = json.product.nutriments ?? {};
  const per = (key: string) => num(n[`${key}_serving`] ?? n[`${key}_100g`]);
  const title = [json.product.product_name, json.product.brands].filter(Boolean).join(" · ") || "Produto";
  const item: MealItem = {
    name: title,
    qty: json.product.serving_size || "100 g",
    kcal: num(n["energy-kcal_serving"] ?? n["energy-kcal_100g"]),
    protein: per("proteins"),
    carbs: per("carbohydrates"),
    fat: per("fat"),
  };

  return {
    title,
    items: [item],
    kcal: item.kcal,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: per("fiber"),
    confidence: 95,
    notes: `Dados da base pública Open Food Facts (${json.product.serving_size || "por 100 g"}).`,
  };
}
