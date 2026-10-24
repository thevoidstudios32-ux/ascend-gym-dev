import { afterEach, describe, expect, mock, test } from 'bun:test';

let usageCount = 0;
let usageError: { message: string } | null = null;
let countedUser = '';
let countedSince = '';
let fallbackCalls = 0;
const originalFetch = globalThis.fetch;
const originalKey = process.env['AI_API_KEY'];
const originalLimit = process.env['AI_DAILY_LIMIT'];
const provider = mock(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 }));

mock.module('../src/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: (_column: string, user: string) => {
        countedUser = user;
        return { gte: async (_dateColumn: string, since: string) => {
          countedSince = since;
          return { count: usageCount, error: usageError };
        } };
      } }),
      insert: async () => ({ error: null }),
    }),
  },
}));
mock.module('../src/lib/program-ai-fallback.server', () => ({
  generateWithLovableAi: async () => { fallbackCalls += 1; return {}; },
}));

const { aiChat } = await import('../src/lib/ai-provider.server');
const input = { messages: [{ role: 'user' as const, content: 'teste' }], meta: { userId: 'authenticated-user', feature: 'coach-chat' } };

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env['AI_API_KEY'];
  else process.env['AI_API_KEY'] = originalKey;
  if (originalLimit === undefined) delete process.env['AI_DAILY_LIMIT'];
  else process.env['AI_DAILY_LIMIT'] = originalLimit;
  provider.mockClear();
  fallbackCalls = 0;
  usageError = null;
});

function setup(count: number) {
  usageCount = count;
  process.env['AI_API_KEY'] = 'test-only';
  delete process.env['AI_DAILY_LIMIT'];
  globalThis.fetch = provider as typeof fetch;
}

describe('Cota diária do Coach IA', () => {
  test('60 chamadas bloqueiam ambos os provedores com status 429', async () => {
    setup(60);
    await expect(aiChat(input)).rejects.toMatchObject({ status: 429 });
    expect(provider).toHaveBeenCalledTimes(0);
    expect(fallbackCalls).toBe(0);
  });

  test('59 chamadas permitem uma chamada e contam somente o usuário nas últimas 24 horas', async () => {
    setup(59);
    const started = Date.now();
    await aiChat(input);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(countedUser).toBe('authenticated-user');
    const cutoff = Date.parse(countedSince);
    expect(cutoff).toBeGreaterThanOrEqual(started - 86_400_000);
    expect(cutoff).toBeLessThanOrEqual(Date.now() - 86_400_000);
  });

  test('AI_DAILY_LIMIT substitui o limite padrão', async () => {
    setup(2);
    process.env['AI_DAILY_LIMIT'] = '2';
    await expect(aiChat(input)).rejects.toMatchObject({ status: 429 });
    expect(provider).toHaveBeenCalledTimes(0);
    expect(fallbackCalls).toBe(0);
  });

  test('falha na contagem não permite acesso aos provedores', async () => {
    setup(0);
    usageError = { message: 'unavailable' };
    await expect(aiChat(input)).rejects.toMatchObject({ status: 503 });
    expect(provider).toHaveBeenCalledTimes(0);
    expect(fallbackCalls).toBe(0);
  });
});