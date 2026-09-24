# Corrigir indisponibilidade geral da IA

## Objetivo
Fazer Coach, personalização, troca de exercícios, nutrição e Shape Tracker continuarem respondendo quando o provedor principal estiver temporariamente sobrecarregado, com o menor consumo possível.

## Alterações
- Centralizar a reserva já existente no ponto comum usado por todas as funções de IA.
- Acionar a reserva somente depois de respostas 429, 503 ou demora excessiva; chamadas normais continuam no provedor atual.
- Adaptar texto e fotos ao formato esperado pela reserva, preservando os pedidos e dados existentes.
- Remover a reserva duplicada exclusiva da personalização para impedir chamadas repetidas.
- Manter erros de créditos, credenciais, conteúdo ou pedidos inválidos como finais, sem novas tentativas.

## Validação econômica
- Validar tipos e o fluxo local sem chamada paga.
- Fazer no máximo uma pergunta curta real no Coach para confirmar a recuperação.
- Conferir o registro da chamada e parar imediatamente após o primeiro resultado conclusivo.

## Fora do escopo
- Nenhuma mudança em treinos salvos, banco, autenticação, XP, conquistas ou aparência.
