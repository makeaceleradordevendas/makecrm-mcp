# Ativar conexões individuais em produção

**Domínio atualizado em 09/09/2026:** para a implantação atual, use `mcp.usemakecrm.com.br` conforme [o roteiro de mudança de domínio](domain-migration.md). Os exemplos abaixo com `mcp.allyson.com.br` documentam o endereço anterior e devem ser adaptados ao domínio oficial, incluindo o callback validado na tela do SaaS.

O backend implementa OAuth authorization code + PKCE S256, registro dinâmico de clientes com callbacks permitidos, consentimento por aplicativo de IA, tokens MCP individuais, rotação e detecção de reutilização de refresh tokens, sessões Supabase criptografadas, gestão de conexões e consultas de leitura com RLS. Não há emissão de JWT administrativo ou acesso por service_role.

**O código não ativa sozinho seu Supabase, SaaS ou Portainer.** Execute os passos abaixo e homologue com contas reais antes de disponibilizar a integração. Os testes locais não comprovam o funcionamento das políticas atuais do seu banco nem capacidade de 100 chamadas por segundo.

## 1. Supabase: aplicação OAuth do backend

No projeto `htdjkprnspssogcetzhx`:

1. Em **Authentication → URL Configuration**, confira **Site URL** = `https://app.usemakecrm.com.br`. Preserve redirects de login, recuperação e demais integrações existentes. Se a Site URL atual divergir, revise os fluxos que dependem dela antes de alterar.
2. Em **Authentication → OAuth Server**, habilite OAuth Server. O recurso está em beta na documentação consultada.
3. Configure **Authorization Path** = `/oauth/consent`. A URL resultante será `https://app.usemakecrm.com.br/oauth/consent`; o componente do passo 2 precisa ser publicado lá.
4. Preserve as chaves de assinatura atuais do projeto. O MCP solicita `email`, sem `openid`, e usa access token e refresh token. Não exige ID token nem migração de HS256 para ES256/RS256. A identidade é verificada pelo Auth e pela RPC, sem confiar apenas no e-mail ou na decodificação local do JWT.
5. No menu **Authentication**, vá à seção **Manage → OAuth Apps** e clique em **Add a new client**. Este cadastro fica separado da tela **OAuth Server**, que habilita o recurso. Preencha **Client name** = `MakeCRM MCP`, **Client type** = `Confidential` e **Redirect URIs** com o callback exato abaixo. Depois clique em **Create**:

   ```text
   https://mcp.allyson.com.br/oauth/supabase/callback
   ```

6. Use **authorization code**, PKCE S256 e autenticação de cliente **client_secret_basic**. O backend solicita explicitamente `scope=email`; não cadastre `contacts:read` etc. no Supabase. As permissões de consulta pertencem ao OAuth do MCP.
7. Copie o Client ID para `SUPABASE_OAUTH_CLIENT_ID` e o Client Secret para `SUPABASE_OAUTH_CLIENT_SECRET` no Portainer. O Client ID também pode ser usado no frontend como configuração pública. O Client Secret fica apenas no MCP.
8. **Não é necessário habilitar Dynamic Client Registration no Supabase.** O MCP usa esta única aplicação confidencial. O cadastro dos clientes de IA é atendido por `/oauth/register` no MCP.
9. Confirme que a migração `supabase/migrations/202609080001_mcp_read_api.sql` já foi aplicada. Caso não tenha sido, revise e teste em homologação antes de executar no SQL Editor. Ela cria as funções `mcp_identity` e `mcp_read_page`, com execução no contexto do usuário; o deploy Docker não aplica SQL automaticamente.

Não substitua as RLS atuais. O MCP resolve o usuário e a empresa em consultas autenticadas. Os escopos do MCP limitam quais ferramentas podem executar; a RLS decide quais registros são visíveis dentro da ferramenta. A sessão Supabase mantém as permissões do usuário, mas suas credenciais nunca são entregues ao cliente de IA. O MCP só oferece as três consultas previstas.

Fontes: [Configuração OAuth Supabase](https://supabase.com/docs/guides/auth/oauth-server/getting-started), [fluxos e scopes](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows).

## 2. SaaS: integração manual

O SaaS atual usa REST: siga [o ajuste da tela de consentimento via API HTTP](../integrations/saas/consent-rest.md). Mantenha a sessão e a infraestrutura HTTP existentes. A tela deve exibir o escopo `email` retornado pela API, sem impor `openid` ou modificar o pedido de autorização.

Os componentes opcionais para aplicações que já usam SDK estão em `integrations/saas/`:

- `OAuthConsent.tsx`: montar na rota `/oauth/consent` com o cliente Supabase já utilizado no SaaS e o Client ID público de MakeCRM MCP.
- `McpConnections.tsx`: montar em Configurações → Integrações para listar e desconectar as autorizações individuais.

Leia `integrations/saas/README.md` para a configuração do roteador e retorno do login. Não crie um segundo cliente Supabase com armazenamento de sessão diferente. Nenhum dos componentes recebe o refresh token para enviar ao MCP; a sessão renovável é obtida pelo backend no callback OAuth.

Existem duas aprovações com finalidades diferentes: a página do SaaS autoriza o backend MakeCRM MCP no Supabase; a página `/oauth/consent` do domínio MCP identifica o cliente de IA e pede aprovação das consultas. Uma autorização anterior do backend não dispensa o consentimento do cliente de IA.

## 3. Portainer: valores obrigatórios

Use o `portainer-stack.yml` atualizado. O domínio vigente é **mcp.allyson.com.br**, conforme a stack que você está utilizando.

| Variável no Portainer | Valor/origem |
|---|---|
| `MCP_IMAGE` | Tag nova da imagem que você construir e publicar |
| `SUPABASE_URL` | `https://htdjkprnspssogcetzhx.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key ou anon key desse projeto; nunca service_role |
| `SUPABASE_OAUTH_CLIENT_ID` | Client ID da aplicação confidencial do passo 1 |
| `SUPABASE_OAUTH_CLIENT_SECRET` | Client Secret dessa aplicação |
| `REDIS_URL` | Redis atual, por exemplo `redis://redis:6379/7`, se esse serviço estiver acessível na rede da stack |
| `SESSION_ENCRYPTION_KEY` | Segredo atual de 64 caracteres hexadecimais |
| `MCP_CURSOR_SECRET` | Segredo atual, pelo menos 32 caracteres |
| `SAAS_API_KEY` | Segredo de backend atual, pelo menos 32 caracteres; não é chave Supabase |

O YAML já configura:

```yaml
AUTH_MODE: oauth
PUBLIC_URL: https://mcp.allyson.com.br
OAUTH_ISSUER: https://mcp.allyson.com.br
ALLOWED_HOSTS: mcp.allyson.com.br
ALLOWED_ORIGINS: https://app.usemakecrm.com.br
OAUTH_ACCESS_TOKEN_SECONDS: '900'
OAUTH_CONNECTION_SECONDS: '2592000'
```

Access tokens duram 15 minutos. A autorização tem validade absoluta de 30 dias; renovar não amplia esse prazo. Depois dele, o usuário reconecta. É possível configurar até 90 dias. Logout/revogação/limites de sessão definidos no Supabase podem exigir nova autorização antes desse prazo.

Todos os nós devem usar os mesmos segredos e Redis. Não substitua a chave de criptografia a cada build. Para trocar a chave, planeje a invalidação das conexões e nova autorização.

## 4. Redis persistente e implantação

O Redis armazena autorizações, sessões e índices de tokens, além dos limites. Precisa de persistência e política de descarte adequada. Não execute `FLUSHDB`/`FLUSHALL` nem altere a configuração de um Redis compartilhado sem avaliar as outras aplicações. O código usa prefixos `mcp:oauth:`; a perda desses registros exige reconexão. Banco lógico `/7` separa chaves, mas não isola memória, falhas ou políticas de eviction do mesmo Redis.

Faça build e push com uma tag nova, substituindo `vXXX` pelo número que você escolher:

```bash
docker build --platform linux/amd64 -t allysonassuncao/makecrm-mcp:vXXX .
docker push allysonassuncao/makecrm-mcp:vXXX
```

Defina `MCP_IMAGE=allysonassuncao/makecrm-mcp:vXXX` e atualize a stack. Mantenha a rede `allyson-desenv`, o resolver e o entrypoint existentes. O roteamento deve alcançar `/mcp`, `/oauth/*`, `/api/mcp-connections` e `/.well-known/*`. Nenhuma porta é publicada no host.

Não use a imagem antiga com `AUTH_MODE=oauth`: ela não contém o fluxo novo. Tokens manuais não são aceitos pelo gateway OAuth; os usuários precisam autorizar suas conexões nesta versão. Para rollback, restaure conjuntamente a imagem anterior e suas variáveis `AUTH_MODE=personal_token`.

## 5. Claude e ChatGPT

Adicione um conector chamado **MakeCRM** com URL `https://mcp.allyson.com.br/mcp`. O cliente registra sua aplicação no MCP, abre o login/consentimento e recebe os tokens automaticamente.

A lista padrão de callbacks permitidos é:

```text
https://claude.ai/api/mcp/auth_callback
https://chatgpt.com/connector_platform_oauth_redirect
```

O MCP anuncia e retorna `iss` nas respostas de autorização. Para o ChatGPT, confira o callback exato exibido na tela de configuração. Caso seja diferente, inclua-o em `OAUTH_ALLOWED_REDIRECT_URIS` no Portainer, separado por vírgula, preservando o callback Claude. Não use wildcard, prefixos ou domínios genéricos. Se a interface oferecer escolha de cadastro, selecione **DCR**. A implementação não anuncia CIMD nem OIDC próprio do MCP.

Claude/ChatGPT identificam o aplicativo pelo registro, e a credencial MCP determina o usuário. O nome informado no registro não comprova por si só a identidade comercial do cliente; o consentimento exibe também o domínio de retorno permitido.

Fontes: [Claude OAuth](https://claude.com/docs/connectors/building/authentication), [OpenAI OAuth e callbacks](https://developers.openai.com/plugins/build/auth).

## Logotipo do conector

O MCP anuncia o nome de exibição `MakeCRM` e a URL pública do logotipo em `serverInfo.icons` na resposta `initialize`. O arquivo PNG permanece no Storage do Supabase; não é copiado para a imagem Docker. Após publicar uma imagem nova, conecte/reconecte o cliente para que ele possa consultar os metadados atualizados.

O ícone do protocolo não garante a substituição da inicial na tela de conectores personalizados do Claude, especialmente antes da autenticação, pois `/mcp` exige credenciais para inicializar. Não há motivo para liberar acesso anônimo ao MCP para mudar a aparência. O logo do OAuth App no Supabase pertence àquela aplicação e não configura automaticamente o cartão do Claude.

A documentação do Claude descreve cartões com logotipo para conectores do diretório e apresentação como “Custom” para conectores personalizados. Se o cartão continuar mostrando a inicial, confirme os metadados recebidos e o suporte do cliente; para a apresentação pelo diretório, é necessário submeter o conector à Anthropic. Não recrie credenciais ou altere RLS por causa do ícone.

Fontes: [ícones no protocolo MCP](https://modelcontextprotocol.io/specification/2025-11-25/basic), [diretório e conectores personalizados no Claude](https://claude.com/docs/connectors/building/directory-vs-custom).

## 6. Validação antes de liberar

1. `/healthz` e `/readyz` devem responder 200. Readiness verifica Redis; não testa credenciais OAuth nem RLS.
2. `/.well-known/oauth-authorization-server` deve informar o issuer `https://mcp.allyson.com.br`, PKCE S256 e os endpoints do MCP.
3. `/mcp` sem Bearer deve responder 401 com `WWW-Authenticate` apontando para os metadados do recurso.
4. Conecte no Claude com usuário A e consulte dados conhecidos. Repita com B de outra empresa e depois com usuários da mesma empresa com permissões diferentes.
5. Confirme que as ferramentas disponíveis só leem contatos, oportunidades e conversas. Pedidos de escrita não têm ferramenta correspondente.
6. Deixe o access token expirar e repita a consulta. Teste também após expiração da sessão Supabase, para exercitar as duas renovações.
7. Desconecte uma autorização pela tela do SaaS. Novas consultas e renovações dessa conexão devem falhar; outra conexão deve continuar funcionando.
8. Teste carga progressivamente até a meta de 100 chamadas por segundo com dados e quotas representativos. O limite inicial de 0,50 CPU e 512 MB por réplica ainda precisa ser dimensionado na VPS real.

A revogação remove a credencial e a sessão local do conector no Redis. Não altera a sessão de login do SaaS nem revoga globalmente a aplicação confidencial Supabase para todas as conexões daquele usuário. Requisições já autorizadas e em execução podem terminar; as próximas serão recusadas.

## Comportamento em falhas

### Formulário do MCP retorna `invalid_origin`

A página HTML de consentimento usa `Referrer-Policy: strict-origin`: preserva o `Origin` nos formulários POST, sem enviar caminho ou query no `Referer`. As outras respostas continuam usando `no-referrer`. Com a política antiga `no-referrer` nessa página, o Chrome enviava `Origin: null`, corretamente recusado pela validação de origem.

A política CSP da página também permite em `form-action` a própria origem e a origem do callback validado para aquela autorização. Isso permite ao navegador seguir o redirecionamento do POST até o aplicativo de IA. O destino completo continua sendo validado pela allowlist do backend. Não acrescente `null` ou `*` a `ALLOWED_ORIGINS` nem desabilite a verificação de Origin/CSRF para contornar este erro.

Publique uma imagem nova e abra uma nova conexão: uma aba já carregada mantém os cabeçalhos antigos. Preserve `PUBLIC_URL=https://mcp.allyson.com.br`, `OAUTH_ISSUER=https://mcp.allyson.com.br` e a configuração do SaaS/Supabase. Caso o erro persista, confira se o Traefik sobrescreve `Referrer-Policy` ou CSP.

Regressão opcional com navegador: após `npm run build`, execute `node test/oauth-browser.mjs`, definindo `PLAYWRIGHT_MODULE` como o caminho absoluto do módulo `playwright/index.mjs` instalado e `CHROME_EXECUTABLE` como o executável Chrome/Chromium. Requer OpenSSL para criar um certificado temporário de teste. Usa dados sintéticos e dois servidores locais, incluindo o callback HTTPS; verifica o 403 antigo com `Origin: null` e os fluxos corrigidos de aprovação e recusa até o retorno ao cliente. Não usa credenciais de produção.

### Callback retorna `temporarily_unavailable`

Se o log do Supabase indicar `HS256 is not supported for ID token signing`, verifique se a imagem instalada já solicita `scope=email` e inicie uma nova conexão. Pedidos antigos com `openid` continuam exigindo ID token. Este fluxo não requer rotação de chaves do SaaS.

Esse retorno é genérico. Não permite concluir que o Client Secret está errado ou que a migração está ausente. No código com diagnóstico, procure `event=oauth_failure` (ou o campo JSON equivalente) com o mesmo `request_id` da requisição HTTP. O evento registra somente a etapa, a categoria e o status HTTP do serviço, sem tokens, códigos, dados pessoais ou respostas brutas.

| `operation` no log | Verificar |
|---|---|
| `supabase_oauth_token` | Troca do código no Supabase. Status 400/401 exige conferir cliente confidencial, secret, callback e erro no Auth; 429/5xx indica limite ou falha do serviço. `invalid_response` indica resposta inesperada. |
| `supabase_user` | Validação da sessão na API Auth do projeto. |
| `supabase_identity` | RPC `mcp_identity`. Status 404 exige conferir existência/exposição da função e cache PostgREST. Status 401/403 exige conferir sessão, grants, RLS e vínculo ativo do usuário/empresa. |
| `oauth_request_read`, `oauth_request_consume`, `oauth_consent_save`, `oauth_rate_limit` | Redis e, na leitura de registros, chave de criptografia compartilhada entre réplicas. |

Para conferir a existência das funções, execute apenas esta consulta no SQL Editor do projeto correto (não modifica dados):

```sql
select
  to_regprocedure('public.mcp_identity()') is not null as mcp_identity_existe,
  to_regprocedure('public.mcp_read_page(text,uuid,text,integer,timestamp with time zone,uuid)') is not null as mcp_read_page_existe;
```

`true` confirma existência, mas não comprova grants, exposição via API nem acesso com RLS do usuário. Não chame `mcp_identity()` diretamente como administrador no SQL Editor para simular uma sessão do SaaS: ela depende de `auth.uid()`.

Se faltarem funções, siga a etapa de migração deste guia; não reaplique o arquivo inteiro indiscriminadamente, pois ele usa `CREATE FUNCTION`. Se já existirem, use os logs para localizar a falha antes de modificar o banco.

Depois de corrigir a causa, inicie uma nova conexão no Claude. Não recarregue nem reutilize a URL do callback: a solicitação é consumida antes da troca do código. Para obter os novos eventos de diagnóstico, é necessário construir/publicar uma imagem nova e atualizar `MCP_IMAGE` no Portainer; alterações locais não atualizam a VPS.

- Falha Redis bloqueia acesso; não existe fallback sem autenticação ou sem limites.
- Renovação é serializada por conexão entre réplicas. Requisições concorrentes durante a renovação podem receber 503 e repetir depois.
- Se a resposta de renovação for perdida, ou o processo morrer enquanto usa o refresh token, o sistema exige reconexão em vez de arriscar reutilização. Um bloqueio abandonado é invalidado após 60 segundos quando a conexão é consultada novamente.
- Reutilização de um refresh token antigo revoga a conexão inteira. Os clientes precisam salvar o novo par de tokens e serializar a própria renovação.
- Máximo de 10 conexões ativas por usuário. Cadastros OAuth têm limites independentes das consultas. Registros de clientes têm TTL de um ano; uma conexão que dependa de registro expirado precisará ser cadastrada novamente.
- Não habilite logs de cabeçalhos, corpos ou query strings de autenticação no proxy. O log da aplicação omite esses dados.
