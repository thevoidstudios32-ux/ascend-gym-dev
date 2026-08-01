-- Profile extras
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS gym text,
  ADD COLUMN IF NOT EXISTS training_since date,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- everyone signed in can discover public profiles
DROP POLICY IF EXISTS "public profiles are discoverable" ON public.profiles;
CREATE POLICY "public profiles are discoverable" ON public.profiles
  FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = id);

-- FRIENDSHIPS
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "send requests" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND requester_id <> addressee_id);
CREATE POLICY "respond to requests" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id)
  WITH CHECK (auth.uid() = addressee_id OR auth.uid() = requester_id);
CREATE POLICY "remove friendship" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE OR REPLACE FUNCTION public.are_gym_bros(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a))
  )
$$;

-- POSTS
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'workout',
  content text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read community posts" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "own posts write" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own posts update" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own posts delete" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REACTIONS
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT 'fist',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.post_reactions TO authenticated;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read reactions" ON public.post_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "own reactions" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own reactions" ON public.post_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- COMMENTS
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read comments" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "own comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- DIRECT MESSAGES
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachment jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own dms" ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "send dms" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.are_gym_bros(auth.uid(), recipient_id));
CREATE POLICY "mark read" ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
CREATE POLICY "delete own dms" ON public.direct_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- CHALLENGES
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  metric text NOT NULL DEFAULT 'workouts',
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date NOT NULL DEFAULT (CURRENT_DATE + 7),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;
GRANT ALL ON public.challenge_participants TO service_role;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_challenge_member(_challenge uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.challenge_participants WHERE challenge_id = _challenge AND user_id = _user)
      OR EXISTS (SELECT 1 FROM public.challenges WHERE id = _challenge AND owner_id = _user)
$$;

CREATE POLICY "read own challenges" ON public.challenges FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_challenge_member(id, auth.uid()));
CREATE POLICY "create challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update own challenges" ON public.challenges FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete own challenges" ON public.challenges FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "read participants" ON public.challenge_participants FOR SELECT TO authenticated
  USING (public.is_challenge_member(challenge_id, auth.uid()));
CREATE POLICY "join challenge" ON public.challenge_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.owner_id = auth.uid()));
CREATE POLICY "update own participation" ON public.challenge_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leave challenge" ON public.challenge_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS posts_created_idx ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS dm_pair_idx ON public.direct_messages (sender_id, recipient_id, created_at);