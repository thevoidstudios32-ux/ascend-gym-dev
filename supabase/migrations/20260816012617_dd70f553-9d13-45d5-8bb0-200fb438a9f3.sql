CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION app_private.is_verified(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND verified = true)
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_verified(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_verified(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read all login events" ON public.login_events;
CREATE POLICY "Admins read all login events" ON public.login_events FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins write audit log" ON public.admin_audit_log;
CREATE POLICY "Admins write audit log" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage content" ON public.content_items;
CREATE POLICY "Admins manage content" ON public.content_items FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins upload banner images" ON storage.objects;
CREATE POLICY "Admins upload banner images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banner-images' AND app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update banner images" ON storage.objects;
CREATE POLICY "Admins update banner images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'banner-images' AND app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete banner images" ON storage.objects;
CREATE POLICY "Admins delete banner images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'banner-images' AND app_private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.protect_verified_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT app_private.has_role(auth.uid(), 'admin') THEN
    NEW.verified := OLD.verified;
    NEW.verified_at := OLD.verified_at;
    NEW.verified_by := OLD.verified_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_verified(uuid);

DROP POLICY IF EXISTS "Vota como si mesmo" ON public.battle_votes;
CREATE POLICY "Vota como si mesmo" ON public.battle_votes FOR INSERT TO authenticated
  WITH CHECK (
    voter_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.battle_entries e
      WHERE e.id IN (winner_entry_id, loser_entry_id) AND e.user_id = auth.uid()
    )
  );