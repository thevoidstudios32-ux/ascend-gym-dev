
-- 1. Friendship: only addressee may accept/decline
DROP POLICY IF EXISTS "respond to requests" ON public.friendships;
CREATE POLICY "respond to requests" ON public.friendships
FOR UPDATE TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (auth.uid() = addressee_id);

-- 2. Posts: only own or gym bros
DROP POLICY IF EXISTS "read community posts" ON public.posts;
CREATE POLICY "read posts of bros" ON public.posts
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.are_gym_bros(auth.uid(), user_id));

-- 3. Reactions/comments visible only for visible posts
DROP POLICY IF EXISTS "read reactions" ON public.post_reactions;
CREATE POLICY "read reactions" ON public.post_reactions
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));

DROP POLICY IF EXISTS "read comments" ON public.post_comments;
CREATE POLICY "read comments" ON public.post_comments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));

-- 4. Recipients can delete their own received DMs
DROP POLICY IF EXISTS "delete own dms" ON public.direct_messages;
CREATE POLICY "delete own dms" ON public.direct_messages
FOR DELETE TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- 5. Revoke direct execution of the auth trigger helper
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
