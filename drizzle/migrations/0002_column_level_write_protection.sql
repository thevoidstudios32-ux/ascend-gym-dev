-- Column-level write protection so system-managed fields cannot be written
-- directly by clients, in addition to the existing BEFORE triggers.

-- profiles: users may only update their own editable profile fields
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  name, goal, experience, age, height_cm, weight_kg, days_per_week,
  onboarded, username, avatar_url, bio, gym, training_since, is_public,
  equipment, injuries, updated_at
) ON public.profiles TO authenticated;

-- battle_entries: users may only update presentation fields of their entry
REVOKE UPDATE ON public.battle_entries FROM authenticated;
GRANT UPDATE (
  media_path, media_type, description, status, updated_at
) ON public.battle_entries TO authenticated;

-- user_titles: titles are granted server-side only
REVOKE INSERT ON public.user_titles FROM authenticated;
REVOKE UPDATE ON public.user_titles FROM authenticated;
GRANT UPDATE (reward_shown, updated_at) ON public.user_titles TO authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.battle_entries TO service_role;
GRANT ALL ON public.user_titles TO service_role;