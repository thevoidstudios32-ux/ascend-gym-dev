import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askCoach } from "@/lib/coach.server";
import { buildContextSummary, collectCoachData } from "@/lib/coach-analysis.server";

import { z } from "zod";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, workouts, records, weights] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("workouts").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase
        .from("records")
        .select("*")
        .eq("user_id", userId)
        .order("achieved_on", { ascending: false }),
      supabase.from("weight_logs").select("*").eq("user_id", userId).order("date"),
    ]);

    if (profile.error) throw new Error(profile.error.message);

    return {
      profile: profile.data,
      workouts: workouts.data ?? [],
      records: records.data ?? [],
      weights: weights.data ?? [],
    };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().min(1).max(40),
        goal: z.string().min(1).max(40),
        experience: z.string().min(1).max(40),
        age: z.number().int().min(10).max(100).nullable(),
        height_cm: z.number().min(100).max(250).nullable(),
        weight_kg: z.number().min(30).max(300).nullable(),
        days_per_week: z.number().int().min(1).max(7),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ ...data, onboarded: true, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    if (data.weight_kg) {
      await context.supabase.from("weight_logs").upsert(
        {
          user_id: context.userId,
          date: new Date().toISOString().slice(0, 10),
          weight_kg: data.weight_kg,
        },
        { onConflict: "user_id,date" },
      );
    }
    return { ok: true };
  });

export const toggleWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        date: z.string(),
        title: z.string().max(60).optional(),
        duration_min: z.number().int().min(5).max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const existing = await supabase
      .from("workouts")
      .select("id, xp")
      .eq("user_id", userId)
      .eq("date", data.date)
      .maybeSingle();

    const profile = await supabase.from("profiles").select("xp").eq("id", userId).maybeSingle();
    const currentXp = profile.data?.xp ?? 0;
    // XP é campo protegido no banco: só o client de serviço pode gravar.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (existing.data) {
      await supabase.from("workouts").delete().eq("id", existing.data.id);
      await supabaseAdmin
        .from("profiles")
        .update({ xp: Math.max(0, currentXp - (existing.data.xp ?? 0)) })
        .eq("id", userId);
      return { added: false };
    }

    const xp = 120;
    const { error } = await supabase.from("workouts").insert({
      user_id: userId,
      date: data.date,
      title: data.title ?? "Treino",
      duration_min: data.duration_min ?? 60,
      xp,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ xp: currentXp + xp }).eq("id", userId);

    await supabase.from("posts").insert({
      user_id: userId,
      kind: "workout",
      content: `${data.title ?? "Treino"} concluído · ${data.duration_min ?? 60} min`,
      meta: { xp, date: data.date } as never,
    });
    return { added: true, xp };
  });

export const addRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        exercise: z.string().min(1).max(50),
        weight_kg: z.number().min(1).max(600),
        reps: z.number().int().min(1).max(100),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("records").insert({
      user_id: context.userId,
      exercise: data.exercise,
      weight_kg: data.weight_kg,
      reps: data.reps,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("posts").insert({
      user_id: context.userId,
      kind: "pr",
      content: `Novo PR: ${data.exercise} ${data.weight_kg}kg x${data.reps}`,
      meta: { exercise: data.exercise, weight_kg: data.weight_kg, reps: data.reps } as never,
    });
    return { ok: true };
  });

export const deleteRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("records")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ weight_kg: z.number().min(30).max(300), date: z.string().optional() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const date = data.date ?? new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("weight_logs")
      .upsert(
        { user_id: context.userId, date, weight_kg: data.weight_kg },
        { onConflict: "user_id,date" },
      );
    if (error) throw new Error(error.message);
    await context.supabase
      .from("profiles")
      .update({ weight_kg: data.weight_kg })
      .eq("id", context.userId);
    return { ok: true };
  });

export const getMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const clearMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("chat_messages").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ text: z.string().min(1).max(2000) }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const [collected, historyRes] = await Promise.all([
      collectCoachData(supabase as never, userId),
      supabase
        .from("chat_messages")
        .select("role,content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(16),
    ]);

    const summary = buildContextSummary(collected);

    const history = ((historyRes.data ?? []) as { role: string; content: string }[])
      .slice()
      .reverse()
      .map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content }));


    // A mensagem do atleta é gravada ANTES da IA: se o provedor falhar,
    // o histórico não se perde e ele pode só pedir de novo.
    await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role: "user", content: data.text });

    const reply = await askCoach([...history, { role: "user", content: data.text }], summary, {
      userId,
      feature: "coach-chat",
    });

    await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role: "assistant", content: reply });

    return { reply };
  });
