
-- 1) Private schema for RLS helper functions (not exposed via the API)
CREATE SCHEMA IF NOT EXISTS app_private;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.are_gym_bros(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (_a = auth.uid() OR _b = auth.uid())
     AND EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a))
  )
$$;

CREATE OR REPLACE FUNCTION app_private.is_challenge_member(_challenge uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user = auth.uid()
     AND (EXISTS (SELECT 1 FROM public.challenge_participants WHERE challenge_id = _challenge AND user_id = _user)
       OR EXISTS (SELECT 1 FROM public.challenges WHERE id = _challenge AND owner_id = _user))
$$;

REVOKE ALL ON FUNCTION app_private.are_gym_bros(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_challenge_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.are_gym_bros(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_challenge_member(uuid, uuid) TO authenticated, service_role;

-- 2) Repoint every policy to the private helpers
DROP POLICY IF EXISTS "send dms" ON public.direct_messages;
CREATE POLICY "send dms" ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND app_private.are_gym_bros(auth.uid(), recipient_id));

DROP POLICY IF EXISTS "read own challenges" ON public.challenges;
CREATE POLICY "read own challenges" ON public.challenges FOR SELECT TO authenticated
USING (auth.uid() = owner_id OR app_private.is_challenge_member(id, auth.uid()));

DROP POLICY IF EXISTS "read participants" ON public.challenge_participants;
CREATE POLICY "read participants" ON public.challenge_participants FOR SELECT TO authenticated
USING (app_private.is_challenge_member(challenge_id, auth.uid()));

DROP POLICY IF EXISTS "read posts of bros" ON public.posts;
CREATE POLICY "read posts of bros" ON public.posts FOR SELECT TO authenticated
USING (auth.uid() = user_id OR app_private.are_gym_bros(auth.uid(), user_id));

DROP POLICY IF EXISTS "read stories of bros" ON public.stories;
CREATE POLICY "read stories of bros" ON public.stories FOR SELECT TO authenticated
USING (auth.uid() = user_id OR app_private.are_gym_bros(auth.uid(), user_id));

DROP POLICY IF EXISTS "read views of visible stories" ON public.story_views;
CREATE POLICY "read views of visible stories" ON public.story_views FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.stories s
  WHERE s.id = story_views.story_id
    AND (s.user_id = auth.uid() OR app_private.are_gym_bros(auth.uid(), s.user_id))
));

DROP POLICY IF EXISTS "stories read bros" ON storage.objects;
CREATE POLICY "stories read bros" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'stories'
  AND ( (storage.foldername(name))[1] = auth.uid()::text
     OR app_private.are_gym_bros(auth.uid(), ((storage.foldername(name))[1])::uuid) )
);

-- 3) Remove the API-exposed SECURITY DEFINER helpers
DROP FUNCTION IF EXISTS public.are_gym_bros(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_challenge_member(uuid, uuid);

-- 4) Comments / reactions readable only by post owner or accepted gym bros
DROP POLICY IF EXISTS "read comments" ON public.post_comments;
CREATE POLICY "read comments" ON public.post_comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_comments.post_id
    AND (p.user_id = auth.uid() OR app_private.are_gym_bros(auth.uid(), p.user_id))
));

DROP POLICY IF EXISTS "read reactions" ON public.post_reactions;
CREATE POLICY "read reactions" ON public.post_reactions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_reactions.post_id
    AND (p.user_id = auth.uid() OR app_private.are_gym_bros(auth.uid(), p.user_id))
));
