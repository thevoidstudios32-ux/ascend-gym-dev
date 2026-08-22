
-- Arena entry system stats are server-managed
CREATE OR REPLACE FUNCTION public.protect_battle_entry_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.wins := OLD.wins;
    NEW.losses := OLD.losses;
    NEW.battles := OLD.battles;
    NEW.best_rank := OLD.best_rank;
    NEW.video_verified := OLD.video_verified;
    NEW.season := OLD.season;
    -- players may retire their own entry, never reactivate it
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'retired' THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_battle_entry_stats ON public.battle_entries;
CREATE TRIGGER protect_battle_entry_stats
BEFORE UPDATE ON public.battle_entries
FOR EACH ROW EXECUTE FUNCTION public.protect_battle_entry_stats();

-- Profile gamification fields are server-managed
CREATE OR REPLACE FUNCTION public.protect_profile_gamification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT app_private.has_role(auth.uid(), 'admin') THEN
    NEW.xp := OLD.xp;
    NEW.banner_id := OLD.banner_id;
    NEW.equipped_title_id := OLD.equipped_title_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_gamification ON public.profiles;
CREATE TRIGGER protect_profile_gamification
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_gamification();

-- Title unlocks must come from the trusted server path
CREATE OR REPLACE FUNCTION public.block_client_title_grants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT app_private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Titles can only be granted by the server' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_client_title_grants ON public.user_titles;
CREATE TRIGGER block_client_title_grants
BEFORE INSERT ON public.user_titles
FOR EACH ROW EXECUTE FUNCTION public.block_client_title_grants();

CREATE OR REPLACE FUNCTION public.protect_user_title_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.title_id := OLD.title_id;
    NEW.xp_awarded := OLD.xp_awarded;
    NEW.unlocked_at := OLD.unlocked_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_title_fields ON public.user_titles;
CREATE TRIGGER protect_user_title_fields
BEFORE UPDATE ON public.user_titles
FOR EACH ROW EXECUTE FUNCTION public.protect_user_title_fields();

-- Defense in depth: no self-voting, even outside RLS
CREATE OR REPLACE FUNCTION public.block_self_battle_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.battle_entries e
    WHERE e.id IN (NEW.winner_entry_id, NEW.loser_entry_id)
      AND e.user_id = NEW.voter_id
  ) THEN
    RAISE EXCEPTION 'You cannot vote on your own entry' USING ERRCODE = '42501';
  END IF;
  IF NEW.winner_entry_id = NEW.loser_entry_id THEN
    RAISE EXCEPTION 'Invalid battle' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_self_battle_vote ON public.battle_votes;
CREATE TRIGGER block_self_battle_vote
BEFORE INSERT ON public.battle_votes
FOR EACH ROW EXECUTE FUNCTION public.block_self_battle_vote();

REVOKE EXECUTE ON FUNCTION public.protect_battle_entry_stats() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_gamification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_client_title_grants() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_user_title_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_self_battle_vote() FROM anon, authenticated;
