# Translation completion roadmap

## Vídeo de supino na página inicial
- [ ] Integrar exclusivamente o vídeo enviado ao fundo, otimizar MP4/WebM e extrair poster
- [ ] Preservar cadastro e demais seções; verificar reprodução, loop, fallback e telas pequenas/grandes

## Redesign da divulgação
- [x] Reformular /divulgar com identidade premium e demonstração verdadeira sem dados privados
- [x] Preservar instalação e compartilhamento, editar mensagem e copiar hashtags e termos
- [x] Validar cópias, seis destinos, cadastro, orientação de instalação e layout em 320/390/492/1280px; 13 testes aprovados e build OK
- [ ] Confirmar instalação e compartilhamento nativos em dispositivo compatível — o navegador de teste não oferece esses recursos

## Unificação da personalização e biblioteca
- [ ] Unificar questionário para contas novas/antigas, converter respostas compatíveis e confirmar substituições
- [ ] Persistir planejamento multissemanal, versão do modelo e preferências em transação sem alterar histórico
- [ ] Respeitar catálogo, equipamentos, nível e restrições na geração; exibir semanas reais
- [ ] Auditar mídia e posições reais, corrigir estados alternativos e registrar contagens e limitações
- [ ] Testar geração, migração, persistência, isolamento e interface; entregar relatório objetivo

## Ampliar demonstrações reais
- [x] Conectar cinco gravações CDC verificadas (Chest press, Remada máquina, Cadeira extensora, Rosca scott, Tríceps máquina), com MP4/WebM/GIF/capa e créditos; catálogo agora com 33 demonstrações e 27 sem movimento
- [x] Validar reprodução das cinco novas demonstrações no navegador: vídeos WebM e GIFs carregaram nas fichas reais, sem erros de mídia e sem transbordamento em 390px; 13 testes passaram e build OK (sem alterar programas da conta)
- [ ] Conectar as 27 restantes — faltam fontes baixáveis verificadas; flexão da Marinha bloqueada por HTTP 429, demais candidatos sem correspondência licenciada confirmada
- [ ] Pedido de 17/10: verificar os 26 exercícios do catálogo original ainda sem movimento e os 6 adicionados depois; conectar gravações licenciadas correspondentes, sem geração por IA, e testar reprodução
- [ ] Pedido atual: instruções específicas para todo o catálogo, alternativa visível sem mídia e novas fotos reais verificadas
- [ ] Auditar todo o catálogo, testar mídias existentes, corrigir falhas e registrar relatório com pendências verificadas
- [ ] Pesquisar novamente fontes verificadas para os exercícios ainda sem movimento e conectar apenas correspondências reais licenciadas, sem geração por IA
- [x] Localizar 16 novas gravações reais licenciadas com correspondência de movimento/equipamento, sem geração por IA
- [x] Conectar vídeos, GIFs e capas derivados da gravação aos cards e fichas pelo catálogo compartilhado (22 exercícios com movimento no total)
- [x] Validar reprodução dos 16 vídeos, GIFs compacto/detalhado, 12 testes aprovados e build OK; fontes registradas em MOTION_SOURCES.json
- [ ] Cobrir exercícios restantes — bloqueado pela ausência de gravações licenciadas com correspondência verificada; preservar fotos/estado indisponível em vez de usar variantes incorretas

## Mídia real e fichas no Coach
- [x] Adicionar vídeos/GIFs reais verificados aos cards e detalhes (6 exercícios, licença CC BY-SA 4.0; demais mantêm fotos disponíveis)
- [x] Reutilizar fichas com anatomia e instruções nas propostas, sem chamadas adicionais de IA
- [x] Validar reprodução de vídeo/GIF e ficha local no navegador, sem solicitar IA; 10 testes aprovados

## Fichas inteligentes de exercícios
- [x] Estruturar catálogo, mídia e anatomia reutilizável (16 demonstrações fotográficas; demais exercícios sem mídia inventada)
- [x] Integrar cards, detalhes, séries e comparação de histórico
- [x] Persistir RIR e memória do atleta com substituições compatíveis; manter conclusão transacional
- [x] Validar desktop/celular, anatomia e filtros com 8 testes; não concluir treino nem gravar preferências na conta real durante a verificação

## Avaliação e programa ASCEND
- [x] Criar avaliação obrigatória com disponibilidade, equipamentos e mapa muscular
- [x] Salvar avaliação e gerar programa adaptativo sem atribuir PPL padrão
- [x] Integrar reavaliação e propostas explícitas da IA, preservando funções existentes
- [x] Validar geração de 1–7 dias, mapa muscular e proposta/recusa no navegador; gravação atômica implementada, sem substituir conta real durante os testes

- [x] Sync selected language with the signed-in profile
- [ ] Translate nutrition, shape, progress, coach, community, profile, and notices
- [ ] Translate reward and title messages
- [ ] Validate types and key authenticated screens

## Questionário inicial
- [x] Remover pré-seleções, adicionar sexo e usar a resposta na personalização do treino

## Desempenho da IA
- [x] Fazer a personalização responder mais rápido, sem erro de demora ou sobrecarga do formato antigo
- [x] Manter a personalização disponível quando os modelos principais estiverem temporariamente sobrecarregados
- [x] Permitir definir o descanso entre séries nas preferências do Coach IA
- [x] Aplicar a reserva de IA a todas as funções quando o provedor principal estiver sobrecarregado
- [x] Aceitar a resposta estruturada da reserva ao personalizar um treino individual

## Treinos personalizados
- [x] Ocultar PPL básico e cópias dos dias de IA quando houver programa personalizado ativo, sem apagar dados ou histórico

## Exportação de treinos
- [x] Criar PDF A4 personalizado com identidade oficial ASCEND, prévia, paginação e dados reais de treinos

## Landing page
- [ ] Substituir a página inicial pela experiência visual do arquivo SUBIR.html
- [ ] Direcionar chamadas de entrada, descoberta e início para o cadastro de novos usuários
- [ ] Validar a nova página em desktop e celular
