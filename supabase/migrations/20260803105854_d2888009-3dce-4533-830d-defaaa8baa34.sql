
CREATE OR REPLACE FUNCTION public.are_gym_bros(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT auth.uid() IS NOT NULL
     AND (_a = auth.uid() OR _b = auth.uid())
     AND EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a))
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_challenge_member(_challenge uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT _user = auth.uid()
     AND (EXISTS (SELECT 1 FROM public.challenge_participants WHERE challenge_id = _challenge AND user_id = _user)
       OR EXISTS (SELECT 1 FROM public.challenges WHERE id = _challenge AND owner_id = _user))
$function$;
