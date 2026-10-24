DROP POLICY IF EXISTS "send requests" ON public.friendships;
CREATE POLICY "send requests" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND requester_id <> addressee_id AND status = 'pending');
REVOKE UPDATE ON public.friendships FROM authenticated;
GRANT UPDATE (status, updated_at) ON public.friendships TO authenticated;
ALTER TABLE public.friendships
  ADD CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted', 'declined')) NOT VALID;

REVOKE UPDATE ON public.direct_messages FROM authenticated;
GRANT UPDATE (read_at) ON public.direct_messages TO authenticated;

CREATE OR REPLACE FUNCTION app_private.guard_workout()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR current_setting('app.reward_engine', true) = 'on' THEN
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
$function$;

CREATE OR REPLACE FUNCTION app_private.guard_achievement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (auth.uid() IS NOT NULL AND COALESCE(current_setting('app.reward_engine', true), '') <> 'on') THEN
      RAISE EXCEPTION 'Selos nao podem ser alterados';
    END IF;
    RETURN NEW;
  END IF;

  IF (auth.uid() IS NOT NULL AND COALESCE(current_setting('app.reward_engine', true), '') <> 'on') THEN
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
$function$;

REVOKE INSERT, UPDATE ON public.workouts FROM authenticated;

CREATE OR REPLACE FUNCTION public.remove_workout(_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  UPDATE public.profiles SET xp = GREATEST(0, COALESCE(xp, 0) - GREATEST(w_xp, 0)), updated_at = now()
  WHERE id = uid
  RETURNING xp INTO total_xp;

  PERFORM set_config('app.reward_engine', 'off', true);
  RETURN jsonb_build_object('removed', true, 'totalXp', COALESCE(total_xp, 0));
END;
$function$;
REVOKE ALL ON FUNCTION public.remove_workout(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_workout(date) TO authenticated, service_role;