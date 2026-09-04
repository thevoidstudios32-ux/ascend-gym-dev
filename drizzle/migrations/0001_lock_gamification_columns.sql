-- 1) profiles: bloqueia edição direta de xp, banner_id e equipped_title_id
CREATE OR REPLACE FUNCTION public.protect_profile_gamification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- 2) battle_entries: bloqueia edição direta das estatísticas de batalha
CREATE OR REPLACE FUNCTION public.protect_battle_entry_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT app_private.has_role(auth.uid(), 'admin') THEN
    NEW.wins := OLD.wins;
    NEW.losses := OLD.losses;
    NEW.battles := OLD.battles;
    NEW.best_rank := OLD.best_rank;
    NEW.video_verified := OLD.video_verified;
    NEW.user_id := OLD.user_id;
    NEW.category := OLD.category;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('active', 'retired') THEN
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

-- 3) battle_votes: reforça a proibição de voto em si mesmo na RLS
DROP POLICY IF EXISTS "Vota como si mesmo" ON public.battle_votes;
CREATE POLICY "Vota como si mesmo"
ON public.battle_votes
FOR INSERT
TO authenticated
WITH CHECK (
  voter_id = auth.uid()
  AND winner_entry_id <> loser_entry_id
  AND NOT EXISTS (
    SELECT 1 FROM public.battle_entries e
    WHERE e.id IN (winner_entry_id, loser_entry_id)
      AND e.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.battle_entries e
    WHERE e.id = winner_entry_id AND e.status = 'active'
  )
  AND EXISTS (
    SELECT 1 FROM public.battle_entries e
    WHERE e.id = loser_entry_id AND e.status = 'active'
  )
);

-- 4) user_titles: só o fluxo confiável do servidor pode conceder títulos
DROP POLICY IF EXISTS "Users insert own titles" ON public.user_titles;

CREATE OR REPLACE FUNCTION public.protect_user_title_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT app_private.has_role(auth.uid(), 'admin') THEN
    NEW.title_id := OLD.title_id;
    NEW.user_id := OLD.user_id;
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