
CREATE OR REPLACE FUNCTION public.apply_battle_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.trusted_stat_write', 'on', true);
  UPDATE public.battle_entries
     SET wins = wins + 1, battles = battles + 1, updated_at = now()
   WHERE id = NEW.winner_entry_id;
  UPDATE public.battle_entries
     SET losses = losses + 1, battles = battles + 1, updated_at = now()
   WHERE id = NEW.loser_entry_id;
  PERFORM set_config('app.trusted_stat_write', 'off', true);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_battle_entry_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND coalesce(current_setting('app.trusted_stat_write', true), 'off') <> 'on' THEN
    NEW.wins := OLD.wins;
    NEW.losses := OLD.losses;
    NEW.battles := OLD.battles;
    NEW.best_rank := OLD.best_rank;
    NEW.video_verified := OLD.video_verified;
    NEW.season := OLD.season;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'retired' THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_battle_entry_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_battle_vote() FROM PUBLIC, anon, authenticated;
