# Correções pontuais de segurança

- Aplicar uma migração com as políticas, permissões e alterações exatas nas três funções indicadas, preservando seus demais trechos.
- Zerar XP negativo existente com a ferramenta de dados, pois a ferramenta de migrações não permite limpeza de linhas.
- Remover somente o endpoint de chat indicado e adicionar a cota de 24 horas antes de qualquer chamada de IA.
- Conferir identificação do usuário autenticado nas chamadas existentes; alterar apenas onde faltar.
- Validar as regras alteradas sem varreduras extras, mudanças de interface ou publicação.

## Detalhes técnicos
- Contagem exata de `ai_usage_logs` por `user_id` e `created_at`, limite padrão 60 e erro 429 antes dos provedores e da reserva.
- A árvore de rotas será regenerada automaticamente.