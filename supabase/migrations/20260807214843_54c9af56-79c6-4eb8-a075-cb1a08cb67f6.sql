
CREATE TABLE public.custom_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  focus text NOT NULL DEFAULT 'Corpo inteiro',
  emoji text NOT NULL DEFAULT '🤸',
  difficulty text NOT NULL DEFAULT 'intermediário',
  notes text,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_workouts TO authenticated;
GRANT ALL ON public.custom_workouts TO service_role;
ALTER TABLE public.custom_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom workouts" ON public.custom_workouts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER custom_workouts_updated_at BEFORE UPDATE ON public.custom_workouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.custom_workout_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.custom_workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  focus text NOT NULL DEFAULT 'Corpo inteiro',
  notes text,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.custom_workout_versions TO authenticated;
GRANT ALL ON public.custom_workout_versions TO service_role;
ALTER TABLE public.custom_workout_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom workout versions" ON public.custom_workout_versions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX custom_workout_versions_workout_idx ON public.custom_workout_versions(workout_id, created_at DESC);

CREATE UNIQUE INDEX workouts_user_date_kind_key ON public.workouts(user_id, date, kind);

CREATE POLICY "gym bros can read workouts" ON public.workouts FOR SELECT TO authenticated
  USING (app_private.are_gym_bros(auth.uid(), user_id));
