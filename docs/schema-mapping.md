# Mapeamento do schema recebido

Fonte: `schema-supabase.md`. Tabelas/campos foram usados como referência; políticas do snapshot não são tratadas como retrato atual do banco. O usuário confirmou que a autorização deve seguir as RLS vigentes e que as políticas amplas apontadas na análise não estão ativas.

| Operação | Tabelas | Vínculo de empresa | Comportamento |
|---|---|---|---|
| Identidade | `users`, `companys` | `users.id = auth.uid()` e `users.company_id = companys.id` | Requer ambos com `status = true`; nunca aceita identidade por argumento |
| Contatos | `contacts` | `contacts.company_id` | Nome, emails, telefones e criação; busca por nome |
| Oportunidades | `pipeline_deals`, `pipelines` | Empresa do negócio e do funil precisam coincidir | Campos básicos, valor, estado, funil, responsáveis e datas |
| Conversas | `inbox_conversations`, `inboxes` | `inbox_conversations.inbox_id → inboxes.company_id` | Resumo da conversa, caixa, responsáveis e datas; busca por nome/identificador |

As funções são `SECURITY INVOKER`. Assim, restrições de funil, caixa, equipe e responsável que já existam nas RLS permanecem em vigor. A presença da tabela `pipeline_user_access` não é transformada em uma nova regra presumida: cabe às políticas atuais definir como ela influencia a visibilidade.

`inbox_messages` e mensagens privadas ainda não são consultadas. `last_message_content`, `external_ids`, anexos e configurações internas não entram nos resumos de conversas. O schema mostra `company_tokens` e tokens de provedores; nenhuma dessas tabelas é exposta.

A migração cria apenas `mcp_identity` e `mcp_read_page`, com execução restrita ao papel `authenticated`. Não altera as políticas existentes nem concede leitura adicional nas tabelas. Se uma RLS negar uma linha, ela não aparece; se faltar grant de tabela, a consulta falha sem liberar acesso alternativo.

## Verificação local concluída

- Identidade derivada de `auth.uid()` e bloqueio de usuário suspenso.
- Isolamento entre empresas e rejeição de empresa forjada.
- Respeito a restrição por responsável dentro da mesma empresa.
- Exclusão de oportunidade com referência cruzada a funil de outra empresa.
- Filtro de empresa em conversas mesmo em um cenário de política ampla.
- Paginação com timestamps iguais, desempate por UUID e precisão de microssegundos.
- Busca literal com `%` e texto semelhante a SQL.
- Projeção de dados que exclui conteúdo privado e metadados internos.
- Execução sem `SECURITY DEFINER`, sem acesso `anon` e sem grant ao `service_role`.

Os testes foram executados em PostgreSQL 17 temporário, não no Supabase real. A região do Supabase e os índices/planos de execução reais ainda precisam ser verificados para homologar a meta de 100 chamadas por segundo.
