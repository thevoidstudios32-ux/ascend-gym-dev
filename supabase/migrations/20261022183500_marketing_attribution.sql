-- Rastreamento de marketing do ASCEND (2026-10-22, revisado após revisão de segurança).
-- Mede: visitas que chegam com UTM, cliques nos botões de cadastro e cadastros concluídos.
-- Somente cria objetos novos; não altera tabelas, usuários, gatilhos ou funções existentes.
--
-- Privacidade:
--  * Nenhum e-mail, nome, IP em claro ou user-agent é gravado.
--  * visitor_id é um UUID aleatório do navegador e NÃO é ligado à conta do usuário.
--  * O IP chega pelo servidor do site e só é guardado como hash SHA-256 com um sal diário
--    aleatório; sais com mais de 2 dias são apagados, tornando hashes antigos não vinculáveis.
--  * Só caminhos de páginas públicas são registrados.
--  * Eventos com mais de 13 meses são apagados automaticamente.
-- Segurança:
--  * Tabelas sem acesso direto para anon/authenticated (RLS ativo, sem políticas de escrita).
--  * Visitas/cliques só entram pela função do servidor (service_role), que limita por IP.
--  * Funções SECURITY DEFINER com search_path vazio e nomes totalmente qualificados.

CREATE SCHEMA IF NOT EXISTS app_private;

-- Normaliza um valor de UTM: minúsculas, só [a-z0-9._-], até 100 caracteres; vazio vira NULL.
CREATE OR REPLACE FUNCTION app_private.clean_utm(_v text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT NULLIF(left(regexp_replace(lower(btrim(coalesce(_v, ''))), '[^a-z0-9._-]+', '_', 'g'), 100), '')
$$;
REVOKE ALL ON FUNCTION app_private.clean_utm(text) FROM PUBLIC, anon, authenticated;

-- Sal diário para o hash do IP (nunca exposto; apagado após 2 dias).
CREATE TABLE IF NOT EXISTS app_private.marketing_salts (
  day date PRIMARY KEY,
  salt uuid NOT NULL DEFAULT gen_random_uuid()
);
REVOKE ALL ON app_private.marketing_salts FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- eventos anônimos
CREATE TABLE IF NOT EXISTS public.marketing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,                       -- gerado no navegador: reenvio não duplica
  visitor_id uuid NOT NULL,
  ip_hash text CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$'),  -- NULL = servidor não informou IP
  event_type text NOT NULL CHECK (event_type IN ('visit', 'signup_cta_click')),
  cta text CHECK (cta IS NULL OR cta ~ '^[a-z0-9_]{1,40}$'),
  path text CHECK (path IS NULL OR path IN ('/', '/auth', '/divulgar', '/v2')),
  utm_source text CHECK (utm_source IS NULL OR char_length(utm_source) <= 100),
  utm_medium text CHECK (utm_medium IS NULL OR char_length(utm_medium) <= 100),
  utm_campaign text CHECK (utm_campaign IS NULL OR char_length(utm_campaign) <= 100),
  utm_content text CHECK (utm_content IS NULL OR char_length(utm_content) <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_events_created_idx ON public.marketing_events (created_at);
CREATE INDEX IF NOT EXISTS marketing_events_visitor_idx ON public.marketing_events (visitor_id, created_at);
CREATE INDEX IF NOT EXISTS marketing_events_ip_idx ON public.marketing_events (ip_hash, created_at);

ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.marketing_events TO service_role;
-- Sem políticas: ninguém lê ou escreve diretamente; só pelas funções abaixo.

-- ---------------------------------------------------------------- origem do cadastro
CREATE TABLE IF NOT EXISTS public.user_acquisition (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  first_utm_source text, first_utm_medium text, first_utm_campaign text, first_utm_content text,
  first_touch_at timestamptz,
  last_utm_source text, last_utm_medium text, last_utm_campaign text, last_utm_content text,
  last_touch_at timestamptz,
  data_origin text NOT NULL CHECK (data_origin IN ('browser', 'signup_metadata', 'none')),
  attributed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_acquisition_attributed_idx ON public.user_acquisition (attributed_at);

ALTER TABLE public.user_acquisition ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_acquisition FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_acquisition TO authenticated;
GRANT ALL ON public.user_acquisition TO service_role;
DROP POLICY IF EXISTS "own acquisition read" ON public.user_acquisition;
CREATE POLICY "own acquisition read" ON public.user_acquisition
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------- registrar evento (só servidor)
-- Chamado pela função de servidor do site (service_role), que informa o IP do visitante.
-- Retorna true se gravou; false se ignorou (inválido, duplicado ou acima de um limite).
CREATE OR REPLACE FUNCTION public.track_marketing_event(
  p_event_id uuid, p_visitor_id uuid, p_event_type text, p_cta text, p_path text, p_utm jsonb,
  p_client_ip text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_source text := app_private.clean_utm(p_utm ->> 'utm_source');
  v_medium text := app_private.clean_utm(p_utm ->> 'utm_medium');
  v_campaign text := app_private.clean_utm(p_utm ->> 'utm_campaign');
  v_content text := app_private.clean_utm(p_utm ->> 'utm_content');
  v_cta text := CASE WHEN p_cta ~ '^[a-z0-9_]{1,40}$' THEN p_cta END;
  v_path text := split_part(coalesce(p_path, ''), '?', 1);
  v_ip text := NULLIF(left(btrim(coalesce(p_client_ip, '')), 64), '');
  v_salt uuid;
  v_ip_hash text;
BEGIN
  IF p_event_id IS NULL OR p_visitor_id IS NULL OR p_event_type NOT IN ('visit', 'signup_cta_click') THEN
    RETURN false;
  END IF;
  -- Só contamos como "visita de campanha" quem chega com utm_source.
  IF p_event_type = 'visit' AND v_source IS NULL THEN
    RETURN false;
  END IF;
  IF v_path NOT IN ('/', '/auth', '/divulgar', '/v2') THEN
    v_path := NULL;  -- páginas internas não são registradas
  END IF;

  -- Sal do dia; o primeiro evento do dia também faz a limpeza de retenção.
  SELECT s.salt INTO v_salt FROM app_private.marketing_salts s WHERE s.day = current_date;
  IF v_salt IS NULL THEN
    INSERT INTO app_private.marketing_salts (day) VALUES (current_date) ON CONFLICT (day) DO NOTHING;
    SELECT s.salt INTO v_salt FROM app_private.marketing_salts s WHERE s.day = current_date;
    DELETE FROM app_private.marketing_salts s WHERE s.day < current_date - 2;
    DELETE FROM public.marketing_events e WHERE e.created_at < now() - interval '13 months';
  END IF;
  IF v_ip IS NOT NULL THEN
    v_ip_hash := encode(sha256(convert_to(v_salt::text || '|' || v_ip, 'UTF8')), 'hex');
  END IF;

  -- Serializa eventos da mesma rede (ou sem IP): as verificações abaixo não sofrem corrida.
  PERFORM pg_advisory_xact_lock(hashtextextended('ascend_mkt:' || coalesce(v_ip_hash, 'sem_ip'), 0));

  -- Limite global contra abuso em massa: 5.000 eventos por hora.
  IF (SELECT count(*) FROM public.marketing_events e WHERE e.created_at > now() - interval '1 hour') >= 5000 THEN
    RETURN false;
  END IF;
  -- Limite por rede (IP): 60 eventos por hora; sem IP informado, todos dividem a mesma cota.
  IF (SELECT count(*) FROM public.marketing_events e
      WHERE e.ip_hash IS NOT DISTINCT FROM v_ip_hash AND e.created_at > now() - interval '1 hour') >= 60 THEN
    RETURN false;
  END IF;
  -- Limite por navegador: 60 eventos por hora.
  IF (SELECT count(*) FROM public.marketing_events e
      WHERE e.visitor_id = p_visitor_id AND e.created_at > now() - interval '1 hour') >= 60 THEN
    RETURN false;
  END IF;
  -- Mesma visita de campanha repetida em 30 min (recarregar a página) não conta de novo.
  IF p_event_type = 'visit' AND EXISTS (
    SELECT 1 FROM public.marketing_events e
    WHERE e.visitor_id = p_visitor_id AND e.event_type = 'visit' AND e.created_at > now() - interval '30 minutes'
      AND e.utm_source IS NOT DISTINCT FROM v_source AND e.utm_medium IS NOT DISTINCT FROM v_medium
      AND e.utm_campaign IS NOT DISTINCT FROM v_campaign AND e.utm_content IS NOT DISTINCT FROM v_content
  ) THEN
    RETURN false;
  END IF;
  -- Clique duplo no mesmo botão em 10 s conta uma vez.
  IF p_event_type = 'signup_cta_click' AND EXISTS (
    SELECT 1 FROM public.marketing_events e
    WHERE e.visitor_id = p_visitor_id AND e.event_type = 'signup_cta_click'
      AND e.cta IS NOT DISTINCT FROM v_cta AND e.created_at > now() - interval '10 seconds'
  ) THEN
    RETURN false;
  END IF;
  INSERT INTO public.marketing_events
    (event_id, visitor_id, ip_hash, event_type, cta, path, utm_source, utm_medium, utm_campaign, utm_content)
  VALUES (p_event_id, p_visitor_id, v_ip_hash, p_event_type, v_cta, v_path, v_source, v_medium, v_campaign, v_content)
  ON CONFLICT (event_id) DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.track_marketing_event(uuid, uuid, text, text, text, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_marketing_event(uuid, uuid, text, text, text, jsonb, text) TO service_role;

-- ---------------------------------------------------------------- associar origem ao cadastro
-- Chamado pelo app depois do login. Grava UMA vez por usuário e só para contas criadas
-- há menos de 48 h com e-mail confirmado: contas antigas nunca recebem origem retroativa.
-- A origem é informada pelo próprio usuário (navegador) e por isso é autodeclarada.
CREATE OR REPLACE FUNCTION public.claim_signup_attribution(p_first jsonb, p_last jsonb)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_created timestamptz;
  v_confirmed timestamptz;
  v_meta jsonb;
  v_first jsonb := p_first;
  v_last jsonb := p_last;
  v_origin text := 'browser';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_acquisition a WHERE a.user_id = v_uid) THEN
    RETURN 'ja_registrado';
  END IF;
  SELECT u.created_at, u.email_confirmed_at, u.raw_user_meta_data -> 'acq'
    INTO v_created, v_confirmed, v_meta
  FROM auth.users u WHERE u.id = v_uid;
  IF v_created IS NULL OR v_created < now() - interval '48 hours' THEN
    RETURN 'conta_existente';
  END IF;
  IF v_confirmed IS NULL THEN
    RETURN 'cadastro_nao_confirmado';
  END IF;
  -- Sem dados do navegador (ex.: e-mail confirmado em outro aparelho): usa o que foi
  -- enviado junto com o cadastro, se houver.
  IF app_private.clean_utm(v_first ->> 'utm_source') IS NULL AND app_private.clean_utm(v_last ->> 'utm_source') IS NULL THEN
    IF v_meta IS NOT NULL AND app_private.clean_utm(v_meta -> 'first' ->> 'utm_source') IS NOT NULL THEN
      v_first := v_meta -> 'first';
      v_last := coalesce(v_meta -> 'last', v_meta -> 'first');
      v_origin := 'signup_metadata';
    ELSE
      v_origin := 'none';
    END IF;
  END IF;
  INSERT INTO public.user_acquisition (
    user_id,
    first_utm_source, first_utm_medium, first_utm_campaign, first_utm_content, first_touch_at,
    last_utm_source, last_utm_medium, last_utm_campaign, last_utm_content, last_touch_at,
    data_origin)
  VALUES (
    v_uid,
    app_private.clean_utm(v_first ->> 'utm_source'), app_private.clean_utm(v_first ->> 'utm_medium'),
    app_private.clean_utm(v_first ->> 'utm_campaign'), app_private.clean_utm(v_first ->> 'utm_content'),
    CASE WHEN v_origin = 'none' THEN NULL ELSE (v_first ->> 'at')::timestamptz END,
    app_private.clean_utm(v_last ->> 'utm_source'), app_private.clean_utm(v_last ->> 'utm_medium'),
    app_private.clean_utm(v_last ->> 'utm_campaign'), app_private.clean_utm(v_last ->> 'utm_content'),
    CASE WHEN v_origin = 'none' THEN NULL ELSE (v_last ->> 'at')::timestamptz END,
    v_origin)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN CASE WHEN FOUND THEN 'registrado' ELSE 'ja_registrado' END;
EXCEPTION
  WHEN invalid_datetime_format OR datetime_field_overflow THEN
    RETURN 'dados_invalidos';
END;
$$;
REVOKE ALL ON FUNCTION public.claim_signup_attribution(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_signup_attribution(jsonb, jsonb) TO authenticated;

-- ---------------------------------------------------------------- métricas agregadas (somente admin)
-- Nenhum identificador de usuário é retornado: apenas contagens por campanha.
-- distinct_networks = hashes de IP distintos (com sal diário, aproxima "redes por dia").
-- events_without_ip > 0 indica que o servidor não está recebendo o IP do visitante.
CREATE OR REPLACE FUNCTION public.get_marketing_campaign_metrics(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  visits bigint, unique_visitors bigint, distinct_networks bigint, events_without_ip bigint,
  signup_cta_clicks bigint, signups_first_touch bigint, signups_last_touch bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT (app_private.has_role(auth.uid(), 'admin'::public.app_role)
          OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'ACCESS DENIED';
  END IF;
  RETURN QUERY
  WITH ev AS (
    SELECT coalesce(e.utm_source, '(sem utm)') AS s, coalesce(e.utm_medium, '') AS m,
           coalesce(e.utm_campaign, '') AS c, coalesce(e.utm_content, '') AS ct,
           count(*) FILTER (WHERE e.event_type = 'visit') AS v,
           count(DISTINCT e.visitor_id) FILTER (WHERE e.event_type = 'visit') AS uv,
           count(DISTINCT e.ip_hash) FILTER (WHERE e.event_type = 'visit') AS dn,
           count(*) FILTER (WHERE e.ip_hash IS NULL) AS wi,
           count(*) FILTER (WHERE e.event_type = 'signup_cta_click') AS k
    FROM public.marketing_events e
    WHERE e.created_at >= p_from AND e.created_at < p_to
    GROUP BY 1, 2, 3, 4
  ), ft AS (
    SELECT coalesce(a.first_utm_source, '(sem origem)') AS s, coalesce(a.first_utm_medium, '') AS m,
           coalesce(a.first_utm_campaign, '') AS c, coalesce(a.first_utm_content, '') AS ct, count(*) AS n
    FROM public.user_acquisition a
    WHERE a.attributed_at >= p_from AND a.attributed_at < p_to
    GROUP BY 1, 2, 3, 4
  ), lt AS (
    SELECT coalesce(a.last_utm_source, '(sem origem)') AS s, coalesce(a.last_utm_medium, '') AS m,
           coalesce(a.last_utm_campaign, '') AS c, coalesce(a.last_utm_content, '') AS ct, count(*) AS n
    FROM public.user_acquisition a
    WHERE a.attributed_at >= p_from AND a.attributed_at < p_to
    GROUP BY 1, 2, 3, 4
  )
  SELECT x.s, x.m, x.c, x.ct,
         coalesce(ev.v, 0), coalesce(ev.uv, 0), coalesce(ev.dn, 0), coalesce(ev.wi, 0), coalesce(ev.k, 0),
         coalesce(ft.n, 0), coalesce(lt.n, 0)
  FROM (SELECT s, m, c, ct FROM ev UNION SELECT s, m, c, ct FROM ft UNION SELECT s, m, c, ct FROM lt) x
  LEFT JOIN ev ON (ev.s, ev.m, ev.c, ev.ct) = (x.s, x.m, x.c, x.ct)
  LEFT JOIN ft ON (ft.s, ft.m, ft.c, ft.ct) = (x.s, x.m, x.c, x.ct)
  LEFT JOIN lt ON (lt.s, lt.m, lt.c, lt.ct) = (x.s, x.m, x.c, x.ct)
  ORDER BY coalesce(ft.n, 0) DESC, coalesce(ev.v, 0) DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_marketing_campaign_metrics(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketing_campaign_metrics(timestamptz, timestamptz) TO authenticated;
