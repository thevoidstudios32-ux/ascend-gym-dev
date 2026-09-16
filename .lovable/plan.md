# Acelerar a personalização de treino

## Objetivo
Fazer o Coach IA entregar a proposta de treino em menos tempo e falhar rapidamente quando o provedor estiver travado, sem alterar os dados do atleta nem a qualidade essencial do programa.

## Alterações
- Reduzir o limite de espera exclusivo da geração de programas, hoje configurado para até dois minutos por tentativa.
- Diminuir o tamanho máximo da resposta para o necessário ao programa semanal.
- Evitar que uma tentativa lenta seja seguida automaticamente por outra tentativa igualmente longa.
- Manter fallback apenas para indisponibilidade rápida do modelo e preservar mensagens claras de erro.

## Validação
- Conferir tipos e executar uma chamada real de personalização.
- Comparar o tempo registrado com o histórico atual de 15–27 segundos nas respostas normais e 123 segundos nas falhas.

## Detalhes técnicos
- Mudanças focadas no fluxo `programa-ia`; Shape Tracker e demais recursos não serão alterados.
- Nenhuma mudança no banco, autenticação, treinos existentes, XP ou conquistas.