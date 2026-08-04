
CREATE TABLE public.battle_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  media_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'photo',
  description text,
  status text NOT NULL DEFAULT 'active',
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  battles integer NOT NULL DEFAULT 0,
  best_rank integer,
  season text,
  video_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX battle_entries_category_idx ON public.battle_entries (category, status);
CREATE INDEX battle_entries_user_idx ON public.battle_entries (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_entries TO authenticated;
GRANT ALL ON public.battle_entries TO service_role;
ALTER TABLE public.battle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entradas ativas visiveis para autenticados"
  ON public.battle_entries FOR SELECT TO authenticated
  USING (status = 'active' OR user_id = auth.uid());
CREATE POLICY "Cria propria entrada"
  ON public.battle_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Edita propria entrada"
  ON public.battle_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Apaga propria entrada"
  ON public.battle_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.battle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_entry_id uuid NOT NULL REFERENCES public.battle_entries(id) ON DELETE CASCADE,
  loser_entry_id uuid NOT NULL REFERENCES public.battle_entries(id) ON DELETE CASCADE,
  category text NOT NULL,
  season text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT battle_votes_distinct CHECK (winner_entry_id <> loser_entry_id),
  CONSTRAINT battle_votes_unique UNIQUE (voter_id, winner_entry_id, loser_entry_id)
);
CREATE INDEX battle_votes_winner_idx ON public.battle_votes (winner_entry_id, created_at DESC);
CREATE INDEX battle_votes_loser_idx ON public.battle_votes (loser_entry_id, created_at DESC);
CREATE INDEX battle_votes_voter_idx ON public.battle_votes (voter_id, created_at DESC);

GRANT SELECT, INSERT ON public.battle_votes TO authenticated;
GRANT ALL ON public.battle_votes TO service_role;
ALTER TABLE public.battle_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ve os proprios votos"
  ON public.battle_votes FOR SELECT TO authenticated
  USING (voter_id = auth.uid());
CREATE POLICY "Vota como si mesmo"
  ON public.battle_votes FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid());

CREATE OR REPLACE FUNCTION public.apply_battle_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.battle_entries
     SET wins = wins + 1, battles = battles + 1, updated_at = now()
   WHERE id = NEW.winner_entry_id;
  UPDATE public.battle_entries
     SET losses = losses + 1, battles = battles + 1, updated_at = now()
   WHERE id = NEW.loser_entry_id;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_battle_vote() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER battle_votes_apply
AFTER INSERT ON public.battle_votes
FOR EACH ROW EXECUTE FUNCTION public.apply_battle_vote();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER battle_entries_updated_at
BEFORE UPDATE ON public.battle_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
