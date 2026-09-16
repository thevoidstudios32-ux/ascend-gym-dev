# Corrigir bloqueio do questionário e idioma

## Implementação
- Liberar somente as colunas editáveis `gender` e `language` para usuários autenticados no próprio perfil.
- Preservar as proteções atuais de XP, títulos, banners e demais campos do sistema.
- Manter a validação existente de Feminino/Masculino e Português/English.

## Validação
- Confirmar as permissões efetivas no banco.
- Testar a atualização de sexo e idioma com uma conta autenticada.
- Verificar que o questionário conclui sem liberar campos protegidos.
