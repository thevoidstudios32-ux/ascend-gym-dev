# Migração do backend de IA do ASCEND para função própria

Toda a IA do app deixa de usar o gateway da Lovable e passa a chamar uma Edge Function própria (`coach-ai`), que fala com um provedor compatível com OpenAI usando um secret no backend. Nada muda visualmente.

## Situação atual (verificada)

- Um único arquivo concentra todas as chamadas de IA: `src/lib/coach.server.ts` → `https://ai.gateway.lovable.dev/v1/chat/completions` com `LOVABLE_API_KEY`.
- Outros três arquivos chamam o gateway direto: `program.server.ts` (programa IA), `nutrition.server.ts` (macros/foto/barcode) e `custom.server.ts` (treinos personalizados).
- Consumidores: chat do Coach (`ascend.functions.ts` → `sendMessage`), análises do Coach (`coach.functions.ts`), substituição de exercícios, Shape Tracker (visão), nudges do Gym Bros, programa IA, nutrição.
- Histórico já existe na tabela `chat_messages` (por `user_id`, com RLS). Será reutilizada como está.
- Hoje **não há streaming** — a resposta chega completa. O comportamento será mantido igual.
- Não existe nenhuma Edge Function no projeto ainda.

## O que será feito

### 1. Edge Function `coach-ai`

- Recebe: lista de mensagens (system + histórico + mensagem atual), modelo lógico e parâmetros opcionais.
- Valida o usuário autenticado pelo token do Supabase; sem token válido → 401. O `user_id` vem sempre do token, nunca do corpo da requisição.
- Chama o provedor via secret; responde com o texto gerado em JSON.
- Erros traduzidos e claros: provedor fora do ar, limite de uso, timeout (com abort), não autenticado, erro interno.

### 2. Camada de provedor trocável

Dentro da função, um adaptador único no formato OpenAI-compatível, com endpoint e modelos vindos de configuração. Trocar de provedor no futuro = mudar secrets, sem mexer no Coach.

### 3. Secrets (somente no backend)

- `AI_API_KEY` — chave do provedor
- `AI_BASE_URL` — endpoint (ex.: `https://api.openai.com/v1`)
- `AI_MODEL_TEXT` e `AI_MODEL_VISION` — modelos usados para texto e para análise de imagem

Nenhuma chave no frontend, no HTML ou no bundle.

### 4. Reapontar o app

- `coach.server.ts`, `program.server.ts`, `nutrition.server.ts` e `custom.server.ts` passam a usar um único cliente interno que chama a Edge Function, encaminhando o token do usuário autenticado.
- Prompts, formatos de resposta, parsing, gravação em `chat_messages` e todas as regras atuais ficam idênticos.
- Remoção da dependência de `LOVABLE_API_KEY` no caminho de IA.

### 5. Verificação

- Nenhuma referência restante a `ai.gateway.lovable.dev` no código.
- Chamada anônima à função retorna 401.
- Chat do Coach responde e grava histórico; análises, substituição de exercício, programa IA, nutrição e Shape Tracker continuam funcionando.
- Nenhuma chave exposta no bundle do frontend.
- Typecheck limpo; nenhuma alteração em layout, navegação, login, treinos, Stories, comunidade ou XP.

## Detalhes técnicos

- Função em Deno em `supabase/functions/coach-ai/index.ts`, com `verify_jwt` ativo e validação adicional via `auth.getUser()`.
- Cliente interno em `src/lib/ai-client.server.ts`: monta a URL da função a partir de `SUPABASE_URL`, envia `Authorization: Bearer <token do usuário>` obtido do contexto autenticado do server function, com timeout e mapeamento de status (401/402/429/5xx) para as mensagens já usadas na UI.
- Suporte a mensagens multimodais (texto + `image_url`) preservado para Shape Tracker e nutrição.
- Nenhuma tabela nova; `chat_messages` continua sendo a fonte do histórico.

## Necessário de você

Antes da ativação real, preciso da chave do provedor (`AI_API_KEY`) e de qual endpoint/modelo usar. Posso implementar tudo já preparado e pedir o secret no momento da configuração.
