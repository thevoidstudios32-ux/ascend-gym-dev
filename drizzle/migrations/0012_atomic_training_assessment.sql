GRANT UPDATE (gender,height_cm,weight_kg,goal,experience,days_per_week,equipment,training_assessment,onboarded,updated_at) ON public.profiles TO authenticated;
CREATE OR REPLACE FUNCTION public.save_training_assessment(_assessment jsonb, _program jsonb, _replace boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); current_program public.ai_programs%ROWTYPE;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;
 IF jsonb_array_length(_assessment->'available_weekdays') <> (_assessment->>'days_per_week')::integer OR (_assessment->>'days_per_week')::integer NOT BETWEEN 1 AND 7 OR jsonb_array_length(_assessment->'priority_muscles') > 5 OR jsonb_array_length(_program->'days') <> (_assessment->>'days_per_week')::integer THEN RAISE EXCEPTION 'Invalid assessment'; END IF;
 SELECT * INTO current_program FROM public.ai_programs WHERE user_id=uid AND active=true ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
 IF current_program.id IS NOT NULL AND NOT _replace THEN RAISE EXCEPTION 'Accept the proposed change first'; END IF;
 INSERT INTO public.training_preferences(user_id,goal,experience,days_per_week,available_weekdays,minutes_per_session,equipment,priority_muscles)
 VALUES(uid,_assessment->>'goal',_assessment->>'experience',(_assessment->>'days_per_week')::integer,ARRAY(SELECT jsonb_array_elements_text(_assessment->'available_weekdays')),(_assessment->>'minutes_per_session')::integer,ARRAY(SELECT jsonb_array_elements_text(_assessment->'equipment')),ARRAY(SELECT jsonb_array_elements_text(_assessment->'priority_muscles')))
 ON CONFLICT(user_id) DO UPDATE SET goal=excluded.goal,experience=excluded.experience,days_per_week=excluded.days_per_week,available_weekdays=excluded.available_weekdays,minutes_per_session=excluded.minutes_per_session,equipment=excluded.equipment,priority_muscles=excluded.priority_muscles,updated_at=now();
 IF current_program.id IS NOT NULL THEN
 INSERT INTO public.ai_program_versions(program_id,user_id,version,snapshot,reason) VALUES(current_program.id,uid,current_program.version,to_jsonb(current_program),'Reavaliação inicial aceita');
 UPDATE public.ai_programs SET name=_program->>'name',goal=_program->>'goal',split_label=_program->>'split_label',days_per_week=(_program->>'days_per_week')::integer,priorities=ARRAY(SELECT jsonb_array_elements_text(_program->'priorities')),week_focus=_program->>'week_focus',notes=_program->>'notes',days=_program->'days',version=current_program.version+1,updated_at=now() WHERE id=current_program.id AND user_id=uid;
 ELSE
 INSERT INTO public.ai_programs(user_id,name,goal,split_label,days_per_week,priorities,week_focus,notes,days,active) VALUES(uid,_program->>'name',_program->>'goal',_program->>'split_label',(_program->>'days_per_week')::integer,ARRAY(SELECT jsonb_array_elements_text(_program->'priorities')),_program->>'week_focus',_program->>'notes',_program->'days',true);
 END IF;
 UPDATE public.profiles SET gender=CASE WHEN _assessment->>'gender'='nao_informado' THEN NULL ELSE _assessment->>'gender' END,height_cm=(_assessment->>'height_cm')::numeric,weight_kg=(_assessment->>'weight_kg')::numeric,goal=_assessment->>'goal',experience=_assessment->>'experience',days_per_week=(_assessment->>'days_per_week')::integer,equipment=ARRAY(SELECT jsonb_array_elements_text(_assessment->'equipment')),training_assessment=_assessment,onboarded=true,updated_at=now() WHERE id=uid;
END;
$$;
REVOKE ALL ON FUNCTION public.save_training_assessment(jsonb,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_training_assessment(jsonb,jsonb,boolean) TO authenticated;
