-- 1. training_preferences
CREATE TABLE public.training_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  days_per_week integer NOT NULL DEFAULT 4,
  minutes_per_session integer NOT NULL DEFAULT 60,
  goal text NOT NULL DEFAULT 'hipertrofia',
  experience text NOT NULL DEFAULT 'intermediário',
  equipment text[] NOT NULL DEFAULT '{}',
  priority_muscles text[] NOT NULL DEFAULT '{}',
  liked_exercises text[] NOT NULL DEFAULT '{}',
  disliked_exercises text[] NOT NULL DEFAULT '{}',
  split_preference text,
  restrictions text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_preferences TO authenticated;
GRANT ALL ON public.training_preferences TO service_role;
ALTER TABLE public.training_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.training_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER training_preferences_updated_at BEFORE UPDATE ON public.training_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. ai_programs
CREATE TABLE public.ai_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'ASCEND AI PROGRAM',
  goal text NOT NULL DEFAULT 'hipertrofia',
  split_label text NOT NULL DEFAULT 'Personalizado',
  days_per_week integer NOT NULL DEFAULT 4,
  priorities text[] NOT NULL DEFAULT '{}',
  week_focus text,
  notes text,
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_programs_user_idx ON public.ai_programs (user_id, active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_programs TO authenticated;
GRANT ALL ON public.ai_programs TO service_role;
ALTER TABLE public.ai_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own programs" ON public.ai_programs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ai_programs_updated_at BEFORE UPDATE ON public.ai_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ai_program_versions (server-written only)
CREATE TABLE public.ai_program_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.ai_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_program_versions_program_idx ON public.ai_program_versions (program_id, created_at DESC);
GRANT SELECT ON public.ai_program_versions TO authenticated;
GRANT ALL ON public.ai_program_versions TO service_role;
ALTER TABLE public.ai_program_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions read" ON public.ai_program_versions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. ai_recommendations (server-created, user can accept/dismiss)
CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'program',
  title text NOT NULL,
  message text NOT NULL,
  action_label text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_recommendations_user_idx ON public.ai_recommendations (user_id, status, created_at DESC);
GRANT SELECT, UPDATE ON public.ai_recommendations TO authenticated;
GRANT ALL ON public.ai_recommendations TO service_role;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recs read" ON public.ai_recommendations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own recs status" ON public.ai_recommendations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ai_recommendations_updated_at BEFORE UPDATE ON public.ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- keep clients from rewriting recommendation content
CREATE OR REPLACE FUNCTION public.protect_recommendation_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.kind := OLD.kind;
    NEW.title := OLD.title;
    NEW.message := OLD.message;
    NEW.action_label := OLD.action_label;
    NEW.payload := OLD.payload;
    IF NEW.status NOT IN ('pending', 'accepted', 'dismissed') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_recommendation_fields() FROM PUBLIC;
CREATE TRIGGER protect_recommendation_fields BEFORE UPDATE ON public.ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.protect_recommendation_fields();

-- 5. training_feedback
CREATE TABLE public.training_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.ai_programs(id) ON DELETE SET NULL,
  day_key text,
  rating text NOT NULL DEFAULT 'ideal',
  duration_min integer,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX training_feedback_user_idx ON public.training_feedback (user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.training_feedback TO authenticated;
GRANT ALL ON public.training_feedback TO service_role;
ALTER TABLE public.training_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback" ON public.training_feedback FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);