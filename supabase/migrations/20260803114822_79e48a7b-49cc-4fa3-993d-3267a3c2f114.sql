-- Stories
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text',
  content text,
  media_path text,
  media_type text,
  sticker text,
  bg text NOT NULL DEFAULT 'ember',
  location text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read stories of bros" ON public.stories FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.are_gym_bros(auth.uid(), user_id));
CREATE POLICY "own stories write" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own stories update" ON public.stories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own stories delete" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX stories_user_expires_idx ON public.stories (user_id, expires_at DESC);

-- Story views / reactions
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read views of visible stories" ON public.story_views FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_views.story_id
    AND (s.user_id = auth.uid() OR public.are_gym_bros(auth.uid(), s.user_id))));
CREATE POLICY "own view write" ON public.story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own view update" ON public.story_views FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own view delete" ON public.story_views FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Exercícios favoritos
CREATE TABLE public.favorite_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_exercises TO authenticated;
GRANT ALL ON public.favorite_exercises TO service_role;
ALTER TABLE public.favorite_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorite_exercises FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Equipamentos da academia e lesões do atleta
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipment text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS injuries text;