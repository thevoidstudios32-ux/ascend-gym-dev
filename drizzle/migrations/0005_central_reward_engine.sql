-- Permite que apenas o motor de recompensas (SECURITY DEFINER) grave XP
CREATE OR REPLACE FUNCTION public.protect_profile_gamification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.reward_engine', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND NOT app_private.has_role(auth.uid(), 'admin') THEN
    NEW.xp := OLD.xp;
    NEW.banner_id := OLD.banner_id;
    NEW.equipped_title_id := OLD.equipped_title_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_workout(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  d date := (_payload->>'date')::date;
  v_title text := left(coalesce(_payload->>'title', 'Treino'), 60);
  v_kind text := left(coalesce(_payload->>'kind', 'custom'), 60);
  v_duration int := LEAST(GREATEST(COALESCE((_payload->>'duration_min')::int, 60), 1), 400);
  v_cal int := LEAST(GREATEST(COALESCE((_payload->>'calories')::int, 0), 0), 5000);
  sets jsonb := COALESCE(_payload->'sets', '[]'::jsonb);
  n_sets int;
  volume numeric;
  v_xp int;
  w_id uuid;
  total_xp int;
  new_prs text[] := '{}';
  unlocked text[] := '{}';
  rec record;
  c text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado';
  END IF;
  IF d IS NULL OR d > CURRENT_DATE THEN
    RAISE EXCEPTION 'Data invalida';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  PERFORM set_config('app.reward_engine', 'on', true);

  SELECT count(*), COALESCE(sum((s->>'reps')::int * (s->>'weight_kg')::numeric), 0)
    INTO n_sets, volume
  FROM jsonb_array_elements(sets) s;

  IF n_sets > 80 THEN
    RAISE EXCEPTION 'Sessao invalida';
  END IF;

  v_xp := 120 + LEAST(200, round(volume / 100))::int + n_sets * 5;

  INSERT INTO public.workouts (user_id, date, title, kind, duration_min, calories, xp)
  VALUES (uid, d, v_title, v_kind, v_duration, v_cal, v_xp)
  ON CONFLICT (user_id, date) DO NOTHING
  RETURNING id INTO w_id;

  IF w_id IS NULL THEN
    SELECT COALESCE(xp, 0) INTO total_xp FROM public.profiles WHERE id = uid;
    PERFORM set_config('app.reward_engine', 'off', true);
    RETURN jsonb_build_object('xp', 0, 'duplicate', true, 'newPrs', '[]'::jsonb,
                              'unlocked', '[]'::jsonb, 'totalXp', COALESCE(total_xp, 0));
  END IF;

  INSERT INTO public.exercise_sets (user_id, workout_id, date, exercise, set_index, reps, weight_kg)
  SELECT uid, w_id, d,
         left(s->>'exercise', 80),
         LEAST(GREATEST((s->>'set_index')::int, 1), 20),
         LEAST(GREATEST((s->>'reps')::int, 1), 100),
         LEAST(GREATEST((s->>'weight_kg')::numeric, 0), 600)
  FROM jsonb_array_elements(sets) s;

  FOR rec IN
    SELECT left(s->>'exercise', 80) AS exercise,
           max((s->>'weight_kg')::numeric) AS weight,
           (array_agg((s->>'reps')::int ORDER BY (s->>'weight_kg')::numeric DESC))[1] AS reps
    FROM jsonb_array_elements(sets) s
    GROUP BY 1
  LOOP
    CONTINUE WHEN rec.weight IS NULL OR rec.weight <= 0;
    IF NOT EXISTS (
      SELECT 1 FROM public.records r
      WHERE r.user_id = uid AND r.exercise = rec.exercise AND r.weight_kg >= rec.weight
    ) THEN
      INSERT INTO public.records (user_id, exercise, weight_kg, reps, achieved_on)
      VALUES (uid, rec.exercise, rec.weight, GREATEST(COALESCE(rec.reps, 1), 1), d);
      new_prs := new_prs || rec.exercise;
    END IF;
  END LOOP;

  UPDATE public.profiles SET xp = COALESCE(xp, 0) + v_xp, updated_at = now()
  WHERE id = uid
  RETURNING xp INTO total_xp;

  FOREACH c IN ARRAY ARRAY['first_workout','workouts_10','workouts_50','workouts_100',
                           'streak_3','streak_7','streak_30','level_10','level_25','first_pr']
  LOOP
    IF app_private.achievement_earned(uid, c)
       AND NOT EXISTS (SELECT 1 FROM public.achievements a WHERE a.user_id = uid AND a.code = c) THEN
      INSERT INTO public.achievements (user_id, code) VALUES (uid, c)
      ON CONFLICT (user_id, code) DO NOTHING;
      unlocked := unlocked || c;
    END IF;
  END LOOP;

  INSERT INTO public.posts (user_id, kind, content, meta)
  VALUES (uid, 'workout',
          v_title || ' concluido - ' || v_duration || ' min - ' || v_cal || ' kcal',
          jsonb_build_object('xp', v_xp, 'date', d, 'kind', v_kind, 'sets', n_sets, 'volume', volume));

  PERFORM set_config('app.reward_engine', 'off', true);

  RETURN jsonb_build_object(
    'xp', v_xp, 'duplicate', false,
    'newPrs', to_jsonb(new_prs), 'unlocked', to_jsonb(unlocked),
    'totalXp', COALESCE(total_xp, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_workout(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_workout(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.remove_workout(_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  w_id uuid;
  w_xp int;
  total_xp int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  PERFORM set_config('app.reward_engine', 'on', true);

  SELECT id, COALESCE(xp, 0) INTO w_id, w_xp FROM public.workouts WHERE user_id = uid AND date = _date;
  IF w_id IS NULL THEN
    SELECT COALESCE(xp, 0) INTO total_xp FROM public.profiles WHERE id = uid;
    PERFORM set_config('app.reward_engine', 'off', true);
    RETURN jsonb_build_object('removed', false, 'totalXp', COALESCE(total_xp, 0));
  END IF;

  DELETE FROM public.workouts WHERE id = w_id;
  UPDATE public.profiles SET xp = GREATEST(0, COALESCE(xp, 0) - w_xp), updated_at = now()
  WHERE id = uid
  RETURNING xp INTO total_xp;

  PERFORM set_config('app.reward_engine', 'off', true);
  RETURN jsonb_build_object('removed', true, 'totalXp', COALESCE(total_xp, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.remove_workout(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_workout(date) TO authenticated, service_role;

-- Titulos nao podem ser apagados/alterados pelo cliente (evitava refarm de XP)
DROP POLICY IF EXISTS "Users delete own titles" ON public.user_titles;
DROP POLICY IF EXISTS "Users update own titles" ON public.user_titles;
REVOKE UPDATE, DELETE ON public.user_titles FROM authenticated;