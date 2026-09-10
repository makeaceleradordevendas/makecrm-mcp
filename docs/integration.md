> Para conexões OAuth em produção, use [oauth-production.md](oauth-production.md). Os contratos de tokens manuais abaixo continuam disponíveis somente no modo `personal_token`.

# Integração da API com Supabase e RLS

## Implementação atual

O schema informado em `schema-supabase.md` foi usado para criar duas funções novas em `supabase/migrations/202609080001_mcp_read_api.sql`:

- `mcp_identity()`: resolve `auth.uid()`, empresa e situação ativa do usuário/empresa.
- `mcp_read_page(...)`: consulta contatos, oportunidades ou resumos de conversas com paginação por `(created_at, id)`.

Ambas são `SECURITY INVOKER`, com `search_path` vazio e execução concedida a `authenticated`. Não executam com o dono das tabelas. As RLS atuais e os grants de tabelas do projeto continuam sendo aplicados. Nenhuma tabela ou política existente é alterada. [Funções no Supabase](https://supabase.com/docs/guides/database/functions).

A chave utilizada é **publishable** ou a chave legada **anon**, em conjunto com `Authorization: Bearer <JWT do usuário>`. A implementação recusa `sb_secret_*` e a chave legada `service_role`. `SAAS_API_KEY` é um segredo independente para autenticar as rotas internas do backend; não é uma chave Supabase.

Com as variáveis Supabase configuradas, MCP e API executam no mesmo processo Vercel. O gateway chama a Data API REST do Supabase diretamente, sem fazer uma chamada HTTP à própria função Vercel. As rotas `/internal/mcp` também permitem separar a API em outro deployment; nesse caso, use `SAAS_API_URL` no processo MCP e mantenha as variáveis Supabase apenas no processo da API.

## Emissão de UUID no SaaS

Para testes no deploy sem servidor OAuth, configure `AUTH_MODE=personal_token` e não cadastre `OAUTH_ISSUER`. Nesse modo, o servidor exige Bearer manual e não publica descoberta OAuth nem metadados OAuth nas ferramentas. Os controles de acesso são os mesmos. Veja o [roteiro na Vercel](vercel-setup.md#teste-autenticado-com-token-manual). O modo padrão, quando omitido, continua sendo `oauth` e exige um issuer real.

`POST /api/mcp-tokens` exige uma sessão Supabase de usuário, enviada no cabeçalho Authorization. Não aceita uma credencial MCP para gerenciar credenciais. O backend valida a sessão com Supabase Auth, resolve sua identidade pela função `mcp_identity` e não recebe `user_id` ou `company_id` no corpo.

```json
{ "label": "Minha integração", "scopes": ["contacts:read", "opportunities:read", "conversations:read"] }
```

Resposta HTTP 201:

```json
{
  "token": "UUID v4 secreto mostrado uma única vez",
  "credential_id": "UUID identificador, diferente do segredo",
  "label": "Minha integração",
  "scopes": ["contacts:read", "opportunities:read", "conversations:read"],
  "created_at": 2000000000,
  "expires_at": 2000000600
}
```

O UUID completo não é persistido. O Redis guarda seu hash e a associação de sessão criptografada com AES-256-GCM. A criptografia usa uma chave exclusiva do backend, IV aleatório e autenticação vinculada à chave de armazenamento, impedindo trocar registros criptografados entre chaves. Todos os registros têm TTL.

**Limitação atual: o UUID expira junto com o access token Supabase usado na emissão, limitado a uma hora. Não há renovação automática.** O backend não recebe nem copia o refresh token da sessão do navegador. Esse caminho serve para integrar emissão e testes de Bearer manual; a conexão duradoura no modo OAuth usa uma sessão Supabase própria do conector; veja o roteiro de produção.

`GET /api/mcp-tokens` lista somente metadados das credenciais do usuário. `DELETE /api/mcp-tokens/:credential_id` revoga a credencial, retornando 204 também para IDs desconhecidos ou de outro usuário. Não expõe a existência de credenciais alheias. O limite é de dez credenciais ativas por usuário, imposto atomicamente no Redis, e 30 chamadas de gestão por minuto/usuário. Antes de validar a sessão no Supabase, há também um limite de 120 chamadas de gestão por minuto/IP.

Na consulta, o MCP revalida o vínculo atual no Supabase. Expiração, mudança de empresa, suspensão ou acesso negado impedem novas chamadas. Revogar o UUID apaga suas associações em Redis imediatamente para chamadas subsequentes; não cancela uma consulta já em andamento. Logout no SaaS não é sinônimo de revogar UUID: tokens JWT podem permanecer válidos até a expiração. A tela de integrações deve usar a rota de revogação ao desconectar.

O frontend pode usar sua instância autenticada de Supabase para obter o access token e chamar estas rotas via HTTPS. Configure sua origem em `ALLOWED_ORIGINS`. Nunca coloque o UUID em query string, argumentos das ferramentas, logs ou armazenamento público.

## API interna

Todas as rotas internas exigem `Authorization: Bearer <SAAS_API_KEY>`. Essa chave nunca deve ter prefixo `VITE_` nem chegar ao navegador.

`POST /internal/mcp/introspect`:

```json
{ "token": "UUID recebido do cliente MCP", "resource": "https://mcp.seudominio.com/mcp" }
```

Uma credencial válida retorna `active`, `credential_id`, `user_id`, `company_id`, `scopes`, `resource` e `expires_at`. Uma credencial inválida retorna `{ "active": false }`. Falhas de dependência retornam 503. Esse é um contrato interno, não um endpoint OAuth de introspecção padronizado.

`POST /internal/mcp/read/{collection}` recebe:

```json
{
  "query": "texto opcional",
  "limit": 25,
  "context": {
    "credential_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "user_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "company_id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
  }
}
```

`collection` só aceita `contacts`, `opportunities` e `conversations`. A API resolve a sessão pela credencial, confere usuário/empresa/permissões e faz a consulta no Supabase com o JWT associado. O UUID MCP não é repassado à API de dados. Não há ferramenta de SQL, tabela ou URL arbitrária.

Resposta: `{ "items": [...], "next_cursor": "... ou null" }`. Envie `cursor` na próxima consulta, preservando a busca. O cursor tem assinatura HMAC, expira em até 15 minutos e é vinculado à credencial, usuário, empresa, recurso, coleção e texto da busca. Preserva a precisão de microssegundos dos timestamps; IDs desempatam a ordenação. O cursor é opaco para o cliente, mas não é criptografado.

## OAuth implementado

O gateway OAuth publica os endpoints de autorização e troca de tokens no próprio MCP. Ele utiliza uma aplicação confidencial Supabase e mantém sessões dedicadas criptografadas no Redis. Inclui DCR com callbacks exatos, PKCE S256, consentimento por cliente, rotação e detecção de replay de refresh tokens e API de gestão por usuário. Consulte [ativação em produção](oauth-production.md).

## Preparar homologação

1. Revisar/aplicar a migração de funções em um Supabase de homologação. As RLS existentes devem estar habilitadas e corretas; as funções não corrigem políticas do SaaS.
2. Configurar URL e publishable/anon key, Redis com TLS e os segredos do backend em `.env` ou na Vercel. Nenhuma chave real foi lida ou instalada nesta tarefa.
3. Gerar `SESSION_ENCRYPTION_KEY` com 32 bytes aleatórios em hexadecimal e um segredo separado para `MCP_CURSOR_SECRET`. Mudanças na chave de sessão exigem reemitir credenciais; perda do Redis também exige reconectar. Não usar cache com política que descarte sessões inesperadamente.
4. Testar com contas reais de homologação de duas empresas e usuários com visibilidades diferentes na mesma empresa.
5. Integrar os componentes de consentimento no SaaS e homologar OAuth antes de publicar a conexão nos apps de IA.

O teste SQL usa dados fictícios e políticas representativas. Ele demonstra que as funções preservam RLS; não confirma quais políticas estão ativas no Supabase real. O usuário confirmou que as políticas amplas identificadas no documento não estão mais ativas.
