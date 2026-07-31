ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'full';
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS calories integer NOT NULL DEFAULT 0;

CREATE TABLE public.exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  exercise text NOT NULL,
  set_index integer NOT NULL DEFAULT 1,
  reps integer NOT NULL DEFAULT 10,
  weight_kg numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_sets TO authenticated;
GRANT ALL ON public.exercise_sets TO service_role;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercise_sets" ON public.exercise_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  ml integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water_logs" ON public.water_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  name text NOT NULL,
  kcal integer NOT NULL DEFAULT 0,
  protein integer NOT NULL DEFAULT 0,
  carbs integer NOT NULL DEFAULT 0,
  fat integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_logs TO authenticated;
GRANT ALL ON public.meal_logs TO service_role;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal_logs" ON public.meal_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  chest_cm numeric,
  waist_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  hip_cm numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own body_measurements" ON public.body_measurements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  path text NOT NULL,
  pose text NOT NULL DEFAULT 'frente',
  analysis text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress_photos" ON public.progress_photos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  code text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.achievements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);