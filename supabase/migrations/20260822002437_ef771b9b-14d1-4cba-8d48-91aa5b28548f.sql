-- 1. Novo nível de permissão máxima
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Helpers de autorização (schema privado, nunca exposto na API)
CREATE OR REPLACE FUNCTION app_private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION app_private.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION app_private.is_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_super_admin(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_super_admin(uuid) TO authenticated, service_role;

-- 3. Catálogo de selos
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon_url text,
  emoji text,
  category text NOT NULL DEFAULT 'Official',
  rarity text NOT NULL DEFAULT 'Epic',
  color text,
  is_active boolean NOT NULL DEFAULT true,
  admin_only boolean NOT NULL DEFAULT true,
  featurable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select" ON public.badges FOR SELECT TO authenticated
  USING (is_active OR app_private.is_staff(auth.uid()));
CREATE POLICY "badges_admin_write" ON public.badges FOR ALL TO authenticated
  USING (app_private.is_staff(auth.uid()))
  WITH CHECK (app_private.is_staff(auth.uid()));

-- 4. Selos dos usuários
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  is_featured boolean NOT NULL DEFAULT false,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX user_badges_user_idx ON public.user_badges (user_id);

-- Leitura para todos os autenticados; nenhuma escrita pelo cliente (sem GRANT e sem policy)
GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_badges_select" ON public.user_badges FOR SELECT TO authenticated USING (true);

-- 5. Auditoria de selos
CREATE TABLE public.badge_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid,
  admin_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('GRANTED', 'REVOKED')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX badge_audit_logs_created_idx ON public.badge_audit_logs (created_at DESC);

GRANT SELECT ON public.badge_audit_logs TO authenticated;
GRANT ALL ON public.badge_audit_logs TO service_role;
ALTER TABLE public.badge_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badge_audit_admin_read" ON public.badge_audit_logs FOR SELECT TO authenticated
  USING (app_private.is_staff(auth.uid()));

-- 6. updated_at
CREATE TRIGGER badges_updated_at BEFORE UPDATE ON public.badges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER user_badges_updated_at BEFORE UPDATE ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Selos iniciais
INSERT INTO public.badges (slug, name, description, emoji, category, rarity, color, admin_only, sort_order) VALUES
  ('verified', 'VERIFIED ADMIN', 'Perfil oficialmente verificado pela administração do ASCEND.', '🛡️', 'Official', 'Legendary', '#DC2626', true, 10),
  ('early-ascender', 'EARLY ASCENDER', 'Esteve com o ASCEND desde os primeiros dias.', '⚡', 'Community', 'Epic', '#B00020', false, 20),
  ('founder', 'FOUNDER', 'Membro fundador do ASCEND.', '🏆', 'Exclusive', 'Mythic', '#F5C542', true, 30),
  ('the-void', 'THE VOID', 'Autoridade máxima do ASCEND. Acesso total ao sistema.', '👑', 'Exclusive', 'Exclusive', '#8B0018', true, 1);