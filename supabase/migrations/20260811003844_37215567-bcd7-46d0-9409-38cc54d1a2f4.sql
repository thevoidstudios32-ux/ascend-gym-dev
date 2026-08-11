ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_title_id text;

CREATE TABLE IF NOT EXISTS public.user_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id text NOT NULL,
  xp_awarded integer NOT NULL DEFAULT 0,
  reward_shown boolean NOT NULL DEFAULT false,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, title_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_titles TO authenticated;
GRANT ALL ON public.user_titles TO service_role;

ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own titles" ON public.user_titles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own titles" ON public.user_titles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own titles" ON public.user_titles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own titles" ON public.user_titles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER user_titles_updated_at BEFORE UPDATE ON public.user_titles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();