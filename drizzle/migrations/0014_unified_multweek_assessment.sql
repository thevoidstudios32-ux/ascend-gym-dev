ALTER TABLE public.ai_programs ADD COLUMN IF NOT EXISTS planning_model integer NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS planning_weeks integer NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS weeks jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.training_preferences ADD COLUMN IF NOT EXISTS planning_weeks integer NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS restricted_muscles text[] NOT NULL DEFAULT '{}';
GRANT SELECT, INSERT, UPDATE ON public.ai_programs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.training_preferences TO authenticated;
CREATE OR REPLACE FUNCTION public.save_unified_assessment(_assessment jsonb, _program jsonb, _expected_id uuid DEFAULT NULL, _expected_version integer DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE uid uuid := auth.uid(); current_program public.ai_programs%ROWTYPE; saved jsonb; n integer := (_assessment->>'planning_weeks')::integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT training_assessment INTO saved FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;
 SELECT * INTO current_program FROM public.ai_programs WHERE user_id=uid AND active ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
 IF current_program.planning_model=2 AND saved=_assessment THEN RETURN; END IF;
 IF current_program.id IS DISTINCT FROM _expected_id OR current_program.version IS DISTINCT FROM _expected_version THEN RAISE EXCEPTION 'Seu programa mudou. Gere uma nova proposta antes de confirmar.'; END IF;
 IF n IS NULL OR n NOT BETWEEN 1 AND 12 OR jsonb_array_length(_program->'weeks') IS DISTINCT FROM n OR (_program->>'planning_model')::integer IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'Invalid planning'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(_program->'weeks') w WHERE jsonb_array_length(w->'days') IS DISTINCT FROM (_assessment->>'days_per_week')::integer) THEN RAISE EXCEPTION 'Invalid weekly schedule'; END IF;
 PERFORM public.save_training_assessment(_assessment,_program,current_program.id IS NOT NULL);
 UPDATE public.training_preferences SET planning_weeks=n, restricted_muscles=ARRAY(SELECT jsonb_array_elements_text(_assessment->'restricted_muscles')), default_rest_seconds=(_assessment->>'default_rest_seconds')::integer, liked_exercises=ARRAY(SELECT jsonb_array_elements_text(_assessment->'liked_exercises')), disliked_exercises=ARRAY(SELECT jsonb_array_elements_text(_assessment->'disliked_exercises')), restrictions=nullif(_assessment->>'restrictions',''), notes=nullif(_assessment->>'notes',''), split_preference=_assessment->>'split_preference' WHERE user_id=uid;
 UPDATE public.ai_programs SET planning_model=2,planning_weeks=n,weeks=_program->'weeks' WHERE user_id=uid AND active AND id=(SELECT id FROM public.ai_programs WHERE user_id=uid AND active ORDER BY updated_at DESC LIMIT 1);
END; $$;
REVOKE ALL ON FUNCTION public.save_unified_assessment(jsonb,jsonb,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_unified_assessment(jsonb,jsonb,uuid,integer) TO authenticated;
COMMENT ON COLUMN public.ai_programs.planning_model IS '1 legacy; 2 unified assessment. Existing plans remain available until user accepts conversion.';