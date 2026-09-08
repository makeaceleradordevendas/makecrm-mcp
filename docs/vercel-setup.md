# Configuração na Vercel

Um build concluído confirma a compilação, mas não a configuração do servidor. No primeiro deploy sem variáveis de ambiente, a versão inicial lançava `ZodError` antes de exportar o Express, provocando `FUNCTION_INVOCATION_FAILED`. A entrada atual responde `503 startup_failed` e registra os nomes das variáveis inválidas nos Runtime Logs.

## Variáveis

Abra o projeto na Vercel, **Settings → Environment Variables**. Cadastre as variáveis no ambiente **Production**; configure Preview separadamente caso o utilize. Não envie os segredos por chat nem os inclua no Git.

| Nome | Valor / origem |
|---|---|
| `NODE_ENV` | `production` |
| `AUTH_MODE` | `personal_token` para testes autenticados com UUID manual |
| `PUBLIC_URL` | `https://makecrm-mcp.vercel.app` (sem `/mcp`) |
| `ALLOWED_HOSTS` | `makecrm-mcp.vercel.app` (sem `https://`) |
| `SUPABASE_URL` | URL do seu projeto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Chave **publishable** ou **anon** do mesmo projeto; nunca `service_role` ou `sb_secret_…` |
| `REDIS_URL` | URL de conexão Redis gerenciado via TLS, começando por `rediss://`; não é a URL de uma API REST |
| `SESSION_ENCRYPTION_KEY` | Segredo aleatório de 32 bytes representado por 64 caracteres hexadecimais |
| `MCP_CURSOR_SECRET` | Outro segredo aleatório, de pelo menos 32 caracteres |
| `SAAS_API_KEY` | Outro segredo aleatório, de pelo menos 32 caracteres, exclusivo da API interna; não é uma chave Supabase |
| `OAUTH_ISSUER` | Não cadastrar no modo `personal_token`. Obrigatório somente em `AUTH_MODE=oauth`, com issuer real compatível |
| `ALLOWED_ORIGINS` | Origem HTTPS exata do frontend SaaS. Várias origens separadas por vírgula; pode ficar vazio para clientes sem Origin |
| `TRUST_PROXY_HOPS` | `1` na Vercel, conforme caminho de proxy documentado no README |

Para gerar os três segredos, execute `openssl rand -hex 32` três vezes localmente e use um resultado diferente em cada variável. Guarde os valores no gerenciador de segredos. A chave de criptografia precisa permanecer igual entre instâncias; trocá-la invalida as sessões existentes.

O modo Supabase não precisa de `SAAS_API_URL`. Os limites e timeouts têm valores padrão em `.env.example`.

**OAuth ainda não está implementado por completo neste projeto.** Supabase Auth autentica o usuário do SaaS, mas configurar sua URL como issuer não implementa automaticamente consentimento, códigos de autorização, escopos MCP e renovação. Não use um issuer inventado para considerar o servidor pronto. Essa etapa precisa ser concluída conforme `integration.md` antes da conexão real com ChatGPT/Claude.

`AUTH_MODE=personal_token` permite testar o transporte MCP e as consultas no deploy com Bearer manual, sem descoberta ou redirecionamento OAuth. Autenticação, permissões, expiração, revogação, Redis e RLS continuam obrigatórios. Omitir `AUTH_MODE` mantém o comportamento anterior (`oauth`), que exige `OAUTH_ISSUER`.

Se a integração Upstash criou somente variáveis `KV_*` ou `UPSTASH_REDIS_REST_*`, adicione também **`REDIS_URL`** com a URL TLS `rediss://` fornecida pelo banco. O cliente deste projeto não usa essas variáveis REST. Na Vercel não é necessário cadastrar `PORT`, `HOST` ou `SAAS_API_URL` para o modo integrado Supabase, nem prefixar variáveis com `VITE_`.

## Após configurar

1. Faça um novo deploy: alterar variáveis não atualiza uma função já implantada.
2. Acesse `/`. Com inicialização válida, haverá uma resposta JSON identificando o MakeCRM MCP. Não é uma interface visual nem uma confirmação de integração completa.
3. Acesse `/readyz`. `200` verifica a conexão Redis; `503` indica indisponibilidade. Esse teste não verifica o banco ou OAuth.
4. Aplique e homologue a migração de `supabase/migrations/` no Supabase antes de testar consultas com a sessão de um usuário real e suas RLS.
5. Para clientes de IA, o endpoint será `https://makecrm-mcp.vercel.app/mcp`, após concluir OAuth.

## Teste autenticado com token manual

Use `AUTH_MODE=personal_token` e a versão do código que implementa esse modo. As funções `mcp_identity` e `mcp_read_page` da migração precisam existir no Supabase; elas mantêm as políticas e permissões atuais e consultam os dados como o usuário conectado. A emissão exige um usuário e sua empresa ativos.

1. Faça login no SaaS pelo Supabase Auth. Use o `access_token` dessa sessão em um cliente HTTP local confiável para enviar `POST https://makecrm-mcp.vercel.app/api/mcp-tokens`. Não use a chave publishable, a senha, o refresh token ou `SAAS_API_KEY` como Bearer desse pedido. Não salve tokens em coleções públicas ou logs.
2. Envie os cabeçalhos `Authorization: Bearer <access_token da sessão Supabase>` e `Content-Type: application/json`, com o corpo:

```json
{"label":"Teste produção","scopes":["contacts:read","opportunities:read","conversations:read"]}
```

3. A resposta `201` traz `token` (UUID secreto), `credential_id` e `expires_at`. O servidor emite o UUID; inventar um UUID ou criar uma variável de ambiente com ele não autentica ninguém. O token expira junto com a sessão Supabase, limitado a uma hora.
4. Configure um cliente MCP que aceite cabeçalho Bearer manual com transporte **Streamable HTTP**, URL `https://makecrm-mcp.vercel.app/mcp` e `Authorization: Bearer <token UUID retornado>`. O cliente realiza `initialize` e pode listar as três ferramentas e executar `search_contacts` com `{"limit":1}`. Faça a mesma consulta com usuários de empresas distintas para validar as RLS reais.
5. Ao terminar, envie `DELETE /api/mcp-tokens/<credential_id>` com a sessão Supabase do mesmo usuário para revogar o token. As próximas chamadas com esse UUID devem retornar `401`.

O teste não altera contatos, oportunidades ou conversas. A gestão de credenciais grava apenas no Redis. `/readyz` sozinho não testa RLS nem consultas ao Supabase. Abrir `/mcp` no navegador também não executa uma consulta MCP.

## Diagnóstico

- `503` com `startup_failed`: abra **Logs** na Vercel e procure o evento de mesmo nome. `invalid_fields` lista nomes de variáveis ausentes ou inválidas. Confira também os requisitos da tabela: nenhum valor `replace-…` ou `example.com` deve permanecer.
- `403 invalid_host`: inclua o domínio efetivamente acessado em `ALLOWED_HOSTS` e faça novo deploy.
- `503` em `/readyz` após inicialização válida: confira conexão, credenciais e disponibilidade do Redis.
- `FUNCTION_INVOCATION_FAILED` mesmo após a atualização: copie o erro dos **Runtime Logs**, gerado ao acessar a URL. Logs de build não contêm necessariamente o erro de execução.

Referências: [variáveis de ambiente na Vercel](https://vercel.com/docs/environment-variables), [erro FUNCTION_INVOCATION_FAILED](https://vercel.com/docs/errors/function_invocation_failed).
