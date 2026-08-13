CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('title','banner')),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  rarity text NOT NULL DEFAULT 'COMMON' CHECK (rarity IN ('COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC','EXCLUSIVE','ASCENDED','VOID')),
  unlock_type text NOT NULL DEFAULT 'manual' CHECK (unlock_type IN ('achievement','level','xp','workouts','streak','manual','admin_only')),
  unlock_value integer,
  unlock_label text,
  xp_reward integer NOT NULL DEFAULT 0,
  image_url text,
  image_position text,
  category text,
  emoji text,
  color text,
  gradient text,
  glow text,
  active boolean NOT NULL DEFAULT true,
  admin_only boolean NOT NULL DEFAULT false,
  builtin boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read live content"
ON public.content_items FOR SELECT TO authenticated
USING (deleted_at IS NULL);

CREATE POLICY "Admins manage content"
ON public.content_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER content_items_updated_at
BEFORE UPDATE ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.content_items (kind, slug, name, description, rarity, unlock_type, unlock_label, xp_reward, emoji, color, gradient, glow, builtin, admin_only, sort_order) VALUES
('title','the-awakened','The Awakened','Concluir o onboarding','COMMON','manual','Concluir o onboarding',100,'🌅','#d4d4d4','linear-gradient(100deg,#f5f5f5,#a3a3a3,#f5f5f5)','rgba(212,212,212,0.35)',true,false,10),
('title','born-from-grit','Born From Grit','10 treinos registrados','RARE','manual','10 treinos registrados',250,'🩸','#dc2626','linear-gradient(100deg,#fecaca,#dc2626,#fee2e2)','rgba(220,38,38,0.4)',true,false,20),
('title','warforged','Warforged','50 treinos registrados','EPIC','manual','50 treinos registrados',500,'⚔️','#f59e0b','linear-gradient(100deg,#fde68a,#f97316,#fbbf24)','rgba(249,115,22,0.45)',true,false,30),
('title','apex','Apex','Alcançar o nível 25','LEGENDARY','manual','Alcançar o nível 25',1500,'🗻','#38bdf8','linear-gradient(100deg,#e0f2fe,#38bdf8,#0ea5e9)','rgba(56,189,248,0.45)',true,false,40),
('title','the-conqueror','The Conqueror','100 treinos registrados','LEGENDARY','manual','100 treinos registrados',1500,'🏆','#e9c46a','linear-gradient(100deg,#fff3c4,#e9c46a,#f59e0b,#fff3c4)','rgba(233,196,106,0.5)',true,false,50),
('title','sovereign','Sovereign','Nível 50 + 5 conquistas','MYTHIC','manual','Nível 50 + 5 conquistas',2500,'👑','#f472b6','linear-gradient(100deg,#fbcfe8,#f472b6,#fda4af,#fbcfe8)','rgba(244,114,182,0.5)',true,false,60),
('title','voidborn','Voidborn','Nível 75 · 250 treinos · 10 conquistas · 30 dias de sequência','MYTHIC','manual','Nível 75 · 250 treinos · 10 conquistas · 30 dias de sequência',5000,'🌑','#a855f7','linear-gradient(100deg,#ddd6fe,#a855f7,#4c1d95,#ddd6fe)','rgba(168,85,247,0.5)',true,false,70),
('title','child-of-the-void','Child of the Void','Nível 100 · 500 treinos · 20 conquistas · 90 dias de sequência','EXCLUSIVE','manual','Nível 100 · 500 treinos · 20 conquistas · 90 dias de sequência',10000,'🌌','#a855f7','linear-gradient(100deg,#f3e8ff,#a855f7,#2e1065,#c084fc,#f3e8ff)','rgba(168,85,247,0.6)',true,false,80),
('title','void-creator','The Void Creator','Criador do ASCEND · The Void Studios','EXCLUSIVE','admin_only','Criador do ASCEND · The Void Studios',0,'🟣','#a855f7','linear-gradient(100deg,#e9d5ff,#a855f7,#6d28d9,#e9d5ff)','rgba(168,85,247,0.55)',true,true,90);

INSERT INTO public.content_items (kind, slug, name, description, rarity, unlock_type, unlock_label, category, image_position, builtin, admin_only, sort_order) VALUES
('banner','throne-hall','Throne Hall',NULL,'COMMON','manual',NULL,'CORE',NULL,true,false,10),
('banner','neon-grid','Neon Grid',NULL,'COMMON','manual',NULL,'CORE',NULL,true,false,20),
('banner','forge','The Forge','Complete 10 treinos','RARE','manual','Complete 10 treinos','FORGED',NULL,true,false,30),
('banner','titan-temple','Titan Temple','Alcance o nível 5 e 3 medalhas','EPIC','manual','Alcance o nível 5 e 3 medalhas','FORGED',NULL,true,false,40),
('banner','skyline','Skyline Ascension','Alcance o nível 15 e 30 treinos','LEGENDARY','manual','Alcance o nível 15 e 30 treinos','FORGED',NULL,true,false,50),
('banner','effort-beats-talent','O Esforço Vence o Talento',NULL,'EPIC','manual',NULL,'LEGACY','center 40%',true,false,60),
('banner','ganley-legacy','Ganley · The Legacy',NULL,'LEGENDARY','manual',NULL,'LEGACY','center 35%',true,false,70),
('banner','void-studios','The Void Studios',NULL,'ASCENDED','admin_only',NULL,'VOID',NULL,true,true,80);

CREATE POLICY "Authenticated can read banner images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'banner-images');

CREATE POLICY "Admins upload banner images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'banner-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update banner images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'banner-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete banner images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'banner-images' AND public.has_role(auth.uid(), 'admin'));