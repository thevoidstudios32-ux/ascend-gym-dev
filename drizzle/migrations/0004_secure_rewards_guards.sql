CREATE OR REPLACE FUNCTION app_private.streak_days(_uid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH d AS (SELECT DISTINCT date FROM public.workouts WHERE user_id = _uid),
  anchor AS (
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM d WHERE date = CURRENT_DATE) THEN CURRENT_DATE
      WHEN EXISTS (SELECT 1 FROM d WHERE date = CURRENT_DATE - 1) THEN CURRENT_DATE - 1
      ELSE NULL END AS a
  ),
  ordered AS (
    SELECT d.date, row_number() OVER (ORDER BY d.date DESC) AS rn, anchor.a
    FROM d, anchor
    WHERE anchor.a IS NOT NULL AND d.date <= anchor.a
  )
  SELECT COALESCE((SELECT count(*)::int FROM ordered WHERE date = a - ((rn - 1)::int)), 0);
$$;

CREATE OR REPLACE FUNCTION app_private.achievement_earned(_uid uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  w int; r int; p int; hy int; st int; lvl int; v_xp int; wt numeric; tgt int;
BEGIN
  SELECT count(*) INTO w FROM public.workouts WHERE user_id = _uid;
  SELECT count(*) INTO r FROM public.records WHERE user_id = _uid;
  SELECT count(*) INTO p FROM public.progress_photos WHERE user_id = _uid;
  SELECT COALESCE(pr.xp, 0), pr.weight_kg INTO v_xp, wt FROM public.profiles pr WHERE pr.id = _uid;
  lvl := floor(COALESCE(v_xp, 0) / 500.0) + 1;
  st := app_private.streak_days(_uid);
  tgt := round((COALESCE(wt, 75) * 35) / 50.0) * 50;
  SELECT count(*) INTO hy FROM public.water_logs WHERE user_id = _uid AND ml >= tgt;

  RETURN CASE _code
    WHEN 'first_workout' THEN w >= 1
    WHEN 'workouts_10' THEN w >= 10
    WHEN 'workouts_50' THEN w >= 50
    WHEN 'workouts_100' THEN w >= 100
    WHEN 'streak_3' THEN st >= 3
    WHEN 'streak_7' THEN st >= 7
    WHEN 'streak_30' THEN st >= 30
    WHEN 'level_10' THEN lvl >= 10
    WHEN 'level_25' THEN lvl >= 25
    WHEN 'first_pr' THEN r >= 1
    WHEN 'photo_1' THEN p >= 1
    WHEN 'hydrated' THEN hy >= 1
    ELSE false
  END;
END;
$$;

REVOKE ALL ON FUNCTION app_private.streak_days(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.achievement_earned(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION app_private.guard_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF current_user NOT IN ('postgres', 'service_role') THEN
      RAISE EXCEPTION 'Selos nao podem ser alterados';
    END IF;
    RETURN NEW;
  END IF;

  IF current_user NOT IN ('postgres', 'service_role') THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Selo invalido';
    END IF;
    IF NOT app_private.achievement_earned(NEW.user_id, NEW.code) THEN
      RAISE EXCEPTION 'Selo ainda nao conquistado';
    END IF;
  END IF;
  NEW.unlocked_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_achievement ON public.achievements;
CREATE TRIGGER guard_achievement
BEFORE INSERT OR UPDATE ON public.achievements
FOR EACH ROW EXECUTE FUNCTION app_private.guard_achievement();

CREATE OR REPLACE FUNCTION app_private.guard_workout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.xp IS DISTINCT FROM OLD.xp OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'XP do treino e definido pelo servidor';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Treino invalido';
  END IF;
  IF NEW.date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Nao e possivel registrar treinos futuros';
  END IF;
  NEW.xp := LEAST(GREATEST(COALESCE(NEW.xp, 0), 0), 500);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_workout ON public.workouts;
CREATE TRIGGER guard_workout
BEFORE INSERT OR UPDATE ON public.workouts
FOR EACH ROW EXECUTE FUNCTION app_private.guard_workout();