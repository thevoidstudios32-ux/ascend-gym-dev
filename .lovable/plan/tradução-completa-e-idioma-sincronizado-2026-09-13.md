# Tradução completa e idioma sincronizado

## Objetivo
Concluir a experiência bilíngue do ASCEND nas áreas ainda pendentes e manter Português/English sincronizado entre o dispositivo e o perfil do usuário.

## Implementação
- Atualizar o seletor de idioma para salvar `pt` ou `en` no perfil do usuário e refletir imediatamente em todas as telas.
- Ao entrar, carregar o idioma salvo no perfil; usar a preferência local apenas enquanto o perfil não estiver disponível e manter ambos sincronizados.
- Traduzir dieta, Shape Tracker, progresso, Coach, painel do Coach, Gym Bros, Arena, Stories, chat e perfil.
- Traduzir botões, abas, títulos, mensagens vazias, campos, acessibilidade, confirmações e avisos dessas áreas.
- Traduzir mensagens de treino, recompensas, conquistas, badges e títulos sem alterar os dados ou regras de desbloqueio.
- Adaptar textos gerados pelo Coach e pelas análises para responder no idioma salvo no perfil.
- Preservar nomes e conteúdo criados pelos usuários; somente textos do sistema serão traduzidos.

## Detalhes técnicos
- Expandir os dicionários modulares de inglês e manter o português como chave/fallback.
- Reutilizar o contexto de idioma existente, adicionando sincronização autenticada com `profiles.language`.
- Passar o idioma às chamadas de IA que produzem textos exibidos no app.
- Não alterar layout, dados históricos, recompensas, autenticação ou regras de negócio.

## Validação
- Executar verificação de tipos.
- Testar a troca PT/EN, recarregamento da página e nova sessão.
- Conferir as principais telas em desktop e mobile, incluindo avisos e modais de recompensa.
