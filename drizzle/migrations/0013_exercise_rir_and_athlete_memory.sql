ALTER TABLE public.exercise_sets ADD COLUMN IF NOT EXISTS rir integer CHECK (rir BETWEEN 0 AND 10);
ALTER TABLE public.training_preferences ADD COLUMN IF NOT EXISTS exercise_memory jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE OR REPLACE FUNCTION public.capture_set_rir() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE payload jsonb;
BEGIN
 payload := nullif(current_setting('app.set_rir_payload',true),'')::jsonb;
 IF payload IS NOT NULL THEN
 SELECT nullif(s->>'rir','')::integer INTO NEW.rir FROM jsonb_array_elements(payload->'sets') s WHERE s->>'exercise'=NEW.exercise AND (s->>'set_index')::integer=NEW.set_index LIMIT 1;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER capture_exercise_set_rir BEFORE INSERT ON public.exercise_sets FOR EACH ROW EXECUTE FUNCTION public.capture_set_rir();
CREATE OR REPLACE FUNCTION public.complete_workout_with_rir(_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(_payload->'sets') s WHERE s->>'rir' IS NOT NULL AND ((s->>'rir')::integer < 0 OR (s->>'rir')::integer > 10)) THEN RAISE EXCEPTION 'Invalid RIR'; END IF;
 PERFORM set_config('app.set_rir_payload',_payload::text,true);
 result := public.complete_workout(_payload);
 PERFORM set_config('app.set_rir_payload','',true);
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.complete_workout_with_rir(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_workout_with_rir(jsonb) TO authenticated;
