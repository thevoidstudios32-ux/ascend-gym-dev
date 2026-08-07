DROP POLICY IF EXISTS "read views of visible stories" ON public.story_views;
CREATE POLICY "story owner or self reads views" ON public.story_views
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_views.story_id AND s.user_id = auth.uid())
);
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;