CREATE OR REPLACE FUNCTION public.protect_profile_gamification_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT app_private.has_role(auth.uid(), 'admin') THEN
    NEW.xp := 0;
    NEW.banner_id := NULL;
    NEW.equipped_title_id := NULL;
    NEW.verified := false;
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_gamification_insert ON public.profiles;
CREATE TRIGGER protect_profile_gamification_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_gamification_insert();

CREATE OR REPLACE FUNCTION public.protect_battle_entry_stats_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT app_private.has_role(auth.uid(), 'admin') THEN
    NEW.wins := 0;
    NEW.losses := 0;
    NEW.battles := 0;
    NEW.best_rank := NULL;
    NEW.video_verified := false;
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_battle_entry_stats_insert ON public.battle_entries;
CREATE TRIGGER protect_battle_entry_stats_insert
BEFORE INSERT ON public.battle_entries
FOR EACH ROW EXECUTE FUNCTION public.protect_battle_entry_stats_insert();