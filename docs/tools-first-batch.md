# Primeiro grupo de ferramentas migradas

O MCP com Supabase configurado passa a oferecer 11 ferramentas: as três buscas existentes e oito consultas adaptadas do projeto `mcp-supabase`. As três Edge Functions e os demais relatórios do catálogo antigo ficam para os próximos grupos.

## Ferramentas e permissões

| Ferramenta | Origem dos dados | Permissão MCP |
|---|---|---|
| `list_users` | REST `users` | `catalog:read` |
| `list_pipelines` | REST `pipelines` | `catalog:read` |
| `list_products` | REST `products` | `catalog:read` |
| `list_sources` | REST `sources` | `catalog:read` |
| `list_campaigns` | REST `campaigns` | `catalog:read` |
| `get_pipeline_deals_page_v7` | RPC existente do mesmo nome | `opportunities:read` |
| `get_pipeline_deals_totals_v7` | RPC existente do mesmo nome | `opportunities:read` |
| `get_contact_full_context_v2` | RPC existente do mesmo nome | `contacts:context:read` |

Os novos cadastros e o contexto completo exigem consentimento específico. O contexto pode conter informações relacionadas além dos dados básicos de contato; por isso não amplia automaticamente `contacts:read`. Os escopos do MCP não são enviados ao OAuth Server do Supabase: a conexão upstream continua usando `email`, como antes.

Conexões antigas mantêm os escopos aprovados, inclusive ao renovar tokens. Para obter as novas permissões, inicie uma nova autorização que as solicite. Se o cliente omitir `scope`, o MCP apresenta todos os escopos suportados na tela de consentimento. Caso o cliente envie uma lista explícita, ela precisa incluir `catalog:read` e `contacts:context:read` para habilitar essas consultas. Os metadados das ferramentas informam a permissão necessária e uma chamada sem permissão retorna `insufficient_scope`.

## Autenticação e integração

- Cada execução resolve a concessão OAuth no Redis, valida seu usuário/empresa/recurso/permissões e utiliza o JWT Supabase dessa sessão, renovando-o pelo mecanismo existente quando necessário.
- A identidade atual é conferida com `mcp_identity` antes da nova consulta. Revogação, troca de empresa e falta de permissão bloqueiam a execução.
- Os schemas rejeitam `company_id`, `user_id`, tokens, URLs e nomes de RPC fornecidos como argumentos pela IA. Responsável/SDR/closer continuam sendo filtros, sem substituir a identidade autenticada.
- Cadastros usam API REST com projeção explícita de colunas, filtro da empresa obtida da sessão e JWT individual. O retorno também é conferido contra essa empresa. `pipelines.settings` não é incluído: o catálogo retorna identificação, status, empresa, criação e etapa de ganho.
- As duas RPCs de oportunidades preservam os argumentos `p_*` do MCP antigo e dependem da identidade do JWT; não acrescentam argumentos de usuário/empresa inexistentes naquele contrato.
- A RPC de contexto recebe `p_identifiers`, `p_company_id` e `p_user_id`, sendo os dois últimos preenchidos pelo servidor a partir da sessão.
- Não há migração SQL, alteração de RLS, nova Edge Function, chave administrativa nem instalação de SDK no SaaS neste grupo.
- O gateway de tokens pessoais também implementa as ferramentas. O gateway HTTP externo (`SAAS_API_URL`, sem Supabase direto) continua oferecendo apenas as três buscas anteriores, até existir um contrato remoto para as operações novas.

## Parâmetros e resultados

Cadastros: `limit` de 1 a 100 (padrão 25), `offset` de 0 a 10000 (padrão 0), `order_by`, `ascending` e `status_filter`. Usuários também aceitam `is_ia`. Ordenação permitida:

- Usuários: `name`, `email`, `created_at`, `updated_at`, `role`, `status`.
- Funis: `name`, `created_at`, `status`.
- Produtos: `name`, `price`.
- Origens/campanhas: `name`, `status`.

Retornam `items`, `next_offset` e `pagination_limit_reached`. O adaptador busca um registro extra para identificar continuação. Se atingir o limite de offset com mais registros, sinaliza `pagination_limit_reached: true`. Não reutiliza o cursor UUID/data das buscas anteriores para estes cadastros.

Oportunidades: filtros antigos por funil, nome/identificador, etapa, negócio, status, responsável, SDR, closer, origem, campanha, valores, criação, probabilidade, produtos, atividades, UTMs e campos personalizados. Arrays são limitados a 100 elementos; datas usam ISO com timezone; intervalos invertidos são rejeitados. `sort_by` aceita `updated_at`, `created_at`, `id`, `name` e `value`; `sort_order` aceita `asc`/`desc`. Listagem usa `page` de 1 a 10001 e `limit` de 1 a 100. Totais não recebem paginação. Para paginação profunda, avalie o custo da RPC existente antes de ampliar limites.

A listagem exige resposta da RPC com `data` como array, limitado ao tamanho solicitado, e preserva os metadados retornados pela função. Totais e contexto retornam `{ data: <JSON da RPC> }`, aceitando objeto, array de objetos ou `null`. A definição da RPC de totais fornecida em 10/09/2026 retorna `total` e valores agregados do conjunto filtrado. Contexto exige `identifiers`, com 1 a 100 textos de até 200 caracteres.

Para oportunidades de hoje, ontem ou um dia específico, as duas ferramentas de pipeline agora aceitam `created_on`. O MCP calcula o dia em São Paulo e compensa o +3h interno das RPCs existentes. Consulte [datas e fusos no MCP](date-time.md), incluindo o campo `date_filter` das respostas.

As três buscas existentes mantêm seus parâmetros e retornos. Todas as ferramentas novas respondem com conteúdo textual JSON e `structuredContent`.

## Publicar e testar

1. Execute `npm run check`, `npm run build` e `npm test`.
2. Gere e publique uma imagem Docker com uma tag nova pelo procedimento habitual (`linux/amd64`). Atualize somente a imagem na mesma stack do Portainer. Este grupo não exige novas variáveis de ambiente nem limpeza do Redis.
3. Inicie nova autorização em `https://mcp.usemakecrm.com.br/mcp` e confira as permissões de cadastros e contexto na tela do MCP. A tela Supabase do SaaS mantém seu fluxo atual.
4. Confira 11 ferramentas no catálogo e teste no Claude: “Liste até cinco funis aos quais tenho acesso”; “Liste cinco produtos ativos”; “Busque cinco oportunidades do funil selecionado”; “Consulte os totais por etapa desse funil”; “Consulte o contexto do contato pelo e-mail informado”.
5. Compare com o SaaS usando o mesmo usuário e os mesmos filtros. Repita com outra empresa e um usuário com acesso restrito a funis. Resultados devem seguir as permissões atuais da conta.
6. Teste uma conexão antiga sem os novos escopos: cadastros e contexto devem ser negados. Revogue uma conexão e confirme que ela deixa de consultar.

## Validação e limites

Os testes locais verificam os oito registros, os contratos REST/RPC, rejeição de identidade injetada, limites, isolamento concorrente entre empresas, escopos persistidos, renovação de JWT, revogação e descoberta/chamada via HTTP MCP. Usam Supabase simulado e armazenamento OAuth em memória; os testes Redis existentes podem ser habilitados separadamente com a configuração de teste documentada no projeto.

Não foram executadas consultas ao Supabase de produção pelo agente. As definições de listagem e totais v7 foram fornecidas pelo usuário em 10/09/2026 e usadas para ajustar os filtros de data. Um retorno diferente do contrato `data: []` da RPC de oportunidades será rejeitado, sem ser interpretado como lista vazia. A resposta real da RPC de contexto ainda precisa ser validada com o SaaS.

Os limites Redis existentes permanecem aplicados por requisição, usuário e empresa. Timeouts e limites de resposta da API continuam em vigor (padrões: 8 segundos por chamada e 1 MiB por resposta). O teste de concorrência verifica isolamento, não comprova 100 chamadas por segundo no ambiente real; relatórios/totais precisam de medição com a carga e o volume reais.
