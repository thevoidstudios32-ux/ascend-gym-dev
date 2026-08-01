REVOKE ALL ON FUNCTION public.are_gym_bros(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_challenge_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_gym_bros(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_challenge_member(uuid, uuid) TO authenticated, service_role;