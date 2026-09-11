ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pt';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_language_check CHECK (language IN ('pt','en'));