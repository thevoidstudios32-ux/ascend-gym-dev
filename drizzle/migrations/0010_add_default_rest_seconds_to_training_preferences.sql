ALTER TABLE public.training_preferences
ADD COLUMN default_rest_seconds integer NOT NULL DEFAULT 90
CHECK (default_rest_seconds BETWEEN 15 AND 600);

COMMENT ON COLUMN public.training_preferences.default_rest_seconds IS 'Preferred default rest time between exercise sets, in seconds.';

GRANT SELECT, INSERT, UPDATE (default_rest_seconds) ON public.training_preferences TO authenticated;
GRANT ALL ON public.training_preferences TO service_role;