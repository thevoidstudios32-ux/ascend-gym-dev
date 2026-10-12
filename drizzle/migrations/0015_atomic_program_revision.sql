CREATE OR REPLACE FUNCTION public.apply_program_revision(_program jsonb, _reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid := auth.uid(); cur public.ai_programs%ROWTYPE; pid uuid; n integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 SELECT * INTO cur FROM public.ai_programs WHERE user_id=uid AND active ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
 IF jsonb_array_length(_program->'days') IS DISTINCT FROM (_program->>'days_per_week')::integer OR (_program->>'days_per_week')::integer NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
 n := coalesce(cur.planning_weeks,1);
 IF jsonb_array_length(_program->'weeks') IS DISTINCT FROM n THEN RAISE EXCEPTION 'Invalid weeks'; END IF;
 IF cur.id IS NOT NULL THEN
 INSERT INTO public.ai_program_versions(program_id,user_id,version,snapshot,reason) VALUES(cur.id,uid,cur.version,to_jsonb(cur),left(_reason,200));
 UPDATE public.ai_programs SET name=_program->>'name',goal=_program->>'goal',split_label=_program->>'split_label',days_per_week=(_program->>'days_per_week')::integer,priorities=ARRAY(SELECT jsonb_array_elements_text(_program->'priorities')),week_focus=_program->>'week_focus',notes=_program->>'notes',days=_program->'days',weeks=_program->'weeks',version=cur.version+1 WHERE id=cur.id AND user_id=uid;
 pid:=cur.id;
 ELSE
 INSERT INTO public.ai_programs(user_id,name,goal,split_label,days_per_week,priorities,week_focus,notes,days,weeks) VALUES(uid,_program->>'name',_program->>'goal',_program->>'split_label',(_program->>'days_per_week')::integer,ARRAY(SELECT jsonb_array_elements_text(_program->'priorities')),_program->>'week_focus',_program->>'notes',_program->'days',_program->'weeks') RETURNING id INTO pid;
 END IF;
 RETURN jsonb_build_object('id',pid,'created',cur.id IS NULL);
END; $$;
REVOKE ALL ON FUNCTION public.apply_program_revision(jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_program_revision(jsonb,text) TO authenticated;
ALTER TABLE public.custom_workouts ADD COLUMN IF NOT EXISTS program_id uuid, ADD COLUMN IF NOT EXISTS program_day_key text;
CREATE UNIQUE INDEX IF NOT EXISTS custom_program_day_unique ON public.custom_workouts(user_id,program_id,program_day_key) WHERE program_id IS NOT NULL;
GRANT SELECT,INSERT,UPDATE ON public.custom_workouts TO authenticated;