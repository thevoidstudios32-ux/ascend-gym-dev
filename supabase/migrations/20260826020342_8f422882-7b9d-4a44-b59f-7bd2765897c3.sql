DROP POLICY IF EXISTS "user_badges_select" ON public.user_badges;

CREATE POLICY "user_badges_select_scoped"
ON public.user_badges
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR app_private.has_role(auth.uid(), 'admin'::app_role)
  OR (
    revoked_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_badges.user_id AND p.is_public = true
      )
      OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = user_badges.user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = user_badges.user_id)
          )
      )
    )
  )
);