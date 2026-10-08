ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS training_assessment jsonb;
GRANT UPDATE (training_assessment) ON public.profiles TO authenticated;
ALTER TABLE public.training_preferences ADD COLUMN IF NOT EXISTS available_weekdays text[] NOT NULL DEFAULT '{}';
GRANT SELECT, INSERT, UPDATE ON public.training_preferences TO authenticated;
GRANT ALL ON public.training_preferences TO service_role;
COMMENT ON COLUMN public.profiles.training_assessment IS 'Initial training assessment; saved for regeneration and reassessment.';