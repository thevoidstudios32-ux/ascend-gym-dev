ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

CREATE OR REPLACE FUNCTION public.is_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND verified = true)
$$;

REVOKE ALL ON FUNCTION public.is_verified(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_verified(uuid) TO authenticated, service_role;

-- Impede que o próprio usuário (ou qualquer não-admin) altere o selo pelo Data API.
CREATE OR REPLACE FUNCTION public.protect_verified_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.verified := OLD.verified;
    NEW.verified_at := OLD.verified_at;
    NEW.verified_by := OLD.verified_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_verified_fields ON public.profiles;
CREATE TRIGGER protect_verified_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_verified_fields();

UPDATE public.profiles
SET verified = true, verified_at = COALESCE(verified_at, now())
WHERE id = 'dfa353f8-442b-4c07-a8a1-26b3d0a536ff';