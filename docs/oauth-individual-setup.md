> **Plano histórico, anterior à implementação.** O backend OAuth já foi implementado. Para os nomes reais das variáveis, componentes e passos atuais, use [oauth-production.md](oauth-production.md).

# Conexão individual do MakeCRM no Claude

## Estado e arquitetura proposta

Este é um roteiro de implementação e configuração, não uma funcionalidade já disponível. A versão atual aceita UUID manual, publica metadados de recurso em modo OAuth e consulta o Supabase com RLS. Ainda não tem o servidor de autorização completo, renovação da sessão do conector ou telas de consentimento.

Para preservar o requisito de UUID individual e escopos próprios de leitura, a proposta usa dois papéis diferentes:

| Componente | Responsabilidade |
|---|---|
| Supabase Auth / OAuth Server | Autenticar o usuário e fornecer ao backend uma sessão dedicada e renovável |
| Backend MCP | Autorizar o cliente de IA e emitir seus próprios tokens opacos, vinculados ao usuário, empresa, cliente, permissões e recurso MCP |
| SaaS | Login, apresentação das autorizações e gestão das conexões do usuário |
| Redis | Armazenamento compartilhado das autorizações, sessões criptografadas, tokens e limites |

O Claude recebe uma credencial MCP, não o JWT ou refresh token Supabase. O backend usa a sessão Supabase apenas nas consultas internas à Data API. Todos os usuários configuram **a mesma URL** `https://mcp.allyson.com.br/mcp`; a autenticação identifica a pessoa. Não se cria uma instância, domínio ou aplicação OAuth por usuário.

Supabase também pode ser usado diretamente como emissor para um MCP adaptado a seus JWTs, mas isso mudaria a arquitetura de tokens e escopos. O roteiro abaixo mantém os UUIDs e os escopos próprios já definidos. Não misture as configurações dos dois modelos.

## 1. Confirmar os endereços

| Finalidade | Endereço |
|---|---|
| Endpoint público MCP | `https://mcp.allyson.com.br/mcp` |
| Emissor OAuth do MCP, a implementar | `https://mcp.allyson.com.br` |
| Projeto Supabase informado | `https://htdjkprnspssogcetzhx.supabase.co` |
| SaaS / Site URL | `https://app.usemakecrm.com.br` |
| Login existente | `https://app.usemakecrm.com.br/login` |
| Página de consentimento Supabase, a implementar | `https://app.usemakecrm.com.br/oauth/consent` |
| Callback do Supabase para o backend MCP, a implementar | `https://mcp.allyson.com.br/oauth/supabase/callback` |
| Callback do MCP para o Claude hospedado | `https://claude.ai/api/mcp/auth_callback` |

A página de consentimento e os callbacks não são intercambiáveis. Preserve o retorno para `/oauth/consent` ao passar pelo login existente.

## 2. Configurar o Supabase

1. Em **Authentication → URL Configuration**, confira se **Site URL** é `https://app.usemakecrm.com.br`. Preserve as URLs de login/recuperação existentes; não troque a Site URL pelo endereço do MCP. Caso a configuração atual seja diferente, avalie os fluxos existentes antes de alterá-la.
2. Em **Authentication → OAuth Server**, habilite o servidor OAuth 2.1. Na documentação consultada, essa funcionalidade está em beta; homologue antes da liberação geral.
3. Defina **Authorization Path** como `/oauth/consent`. A combinação Site URL + caminho será a página do SaaS que será desenvolvida no passo 3. Só habilitar esse caminho não cria a página.
4. Preserve as chaves atuais do Auth. O MCP usa `scope=email`, sem solicitar ID token; não exige migração de HS256. Valida o access token na API Auth e resolve a empresa pela RPC `mcp_identity`.
5. Cadastre **uma aplicação OAuth confidencial**, chamada `MakeCRM MCP`, representando o backend. Use o callback exato `https://mcp.allyson.com.br/oauth/supabase/callback` e o fluxo authorization code com PKCE. Use um método de autenticação de cliente suportado, por exemplo `client_secret_basic`.
6. Guarde o client ID e client secret dessa aplicação para o backend. Esse secret é novo e não substitui `SUPABASE_PUBLISHABLE_KEY`, `SAAS_API_KEY` ou a chave de criptografia. Ele não vai para o frontend nem para o Claude.
7. O MCP solicita explicitamente `email`, sem `openid`. Preserve o consentimento via REST descrito em `integrations/saas/consent-rest.md`. Os scopes `contacts:read`, `opportunities:read` e `conversations:read` ficam no OAuth do MCP. Eles não são scopes nativos do Supabase.
8. Confirme a existência das funções `mcp_identity` e `mcp_read_page` da migração. Preserve suas RLS e valide as consultas com sessões reais de usuários de empresas diferentes.

O cadastro do cliente `MakeCRM MCP` é feito uma única vez por ambiente. Cada pessoa autoriza separadamente com sua conta. Não é necessário habilitar cadastro dinâmico público de clientes no Supabase para essa comunicação entre o backend próprio e o Supabase.

Referências: [configuração OAuth Supabase](https://supabase.com/docs/guides/auth/oauth-server/getting-started), [scopes e renovação](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows), [tokens e RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security).

## 3. Desenvolver as telas no SaaS

### Consentimento Supabase

Crie a rota `/oauth/consent` no React/Vite e garanta que abrir essa rota diretamente no navegador carrega a SPA. Use uma versão do `@supabase/supabase-js` com os métodos OAuth documentados.

A página deve receber `authorization_id`, exigir login e preservar esse identificador ao passar pela tela de login. Depois deve carregar os dados reais da autorização:

```ts
await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
```

Mostre qual aplicação solicita autorização, a conta conectada e os dados/permissões envolvidos. Os botões devem chamar:

```ts
await supabase.auth.oauth.approveAuthorization(authorizationId);
await supabase.auth.oauth.denyAuthorization(authorizationId);
```

Essas chamadas são alternativas, conforme a escolha do usuário. Siga o redirecionamento validado devolvido pela API/SDK e trate pedidos expirados, recusados e já autorizados. Não aceite uma URL arbitrária de retorno fornecida na query string.

### Consentimento do cliente de IA

Além da autorização da aplicação `MakeCRM MCP` no Supabase, o fluxo do MCP precisa registrar a aprovação específica de **qual cliente de IA** poderá usar aquela conta e **quais consultas** foram autorizadas. A autorização prévia no Supabase não autoriza automaticamente qualquer cliente que se registre no MCP.

Implemente uma tela/etapa vinculada ao pedido OAuth do MCP validado pelo backend, mostrando o cliente, o usuário, a empresa e as permissões de leitura. A aprovação deve estar vinculada ao pedido, sessão autenticada, cliente, redirect URI, scopes e PKCE, com proteção CSRF. Não derive a empresa de parâmetros enviados pelo navegador.

### Gestão de conexões

Crie **Configurações → Integrações → Inteligência artificial** com a URL MCP para copiar, instruções de conexão no Claude, conexões do usuário, permissões, status e botão **Desconectar**.

As rotas atuais `/api/mcp-tokens` servem para tokens manuais. A gestão de conexões OAuth precisa ser desenvolvida para revogar também a renovação e a sessão dedicada. Mostrar um UUID para o usuário colar nessa tela do Claude não implementa OAuth.

## 4. Desenvolver o servidor OAuth no MCP

Rotas propostas, ainda não implementadas:

| Rota | Função |
|---|---|
| `/.well-known/oauth-authorization-server` | Metadados do emissor MCP |
| `/oauth/authorize` | Validar o pedido do cliente, resource e PKCE, e iniciar login/consentimento |
| `/oauth/supabase/callback` | Receber e trocar o código Supabase pela sessão dedicada do usuário |
| `/oauth/token` | Trocar o código MCP por tokens MCP e renovar tokens |
| `/oauth/revoke` | Revogar a conexão e suas credenciais |
| `/oauth/register`, se houver DCR | Cadastrar clientes dinamicamente com validação e limites |

Os metadados de recurso `/.well-known/oauth-protected-resource/mcp`, já existentes, devem anunciar esse emissor MCP e o recurso exato `https://mcp.allyson.com.br/mcp`. O cliente deve receber o desafio correto em respostas 401.

Para a tela do Claude que recebe somente a URL, implemente um método de identificação de cliente compatível, como CIMD ou DCR. CIMD exige validação do documento remoto e proteções de rede; DCR exige validação de redirect URIs e limites de cadastro. Um registro dinâmico não concede acesso a dados por si só. Não implemente aceitação irrestrita de client ID ou redirecionamentos.

O fluxo deve usar PKCE S256 e state independentes e vinculados em cada lado: cliente de IA → MCP e MCP → Supabase. Os códigos devem ser curtos, de uso único e consumidos atomicamente. O callback do Claude deve ser validado conforme o registro do cliente: `https://claude.ai/api/mcp/auth_callback` para o Claude hospedado.

A comunicação com Supabase usa a aplicação confidencial registrada no passo 2. Adicione um validador específico para a sessão OAuth recebida: assinatura, issuer, audiência esperada do Supabase, expiração, sub, role e client_id correspondente ao cliente próprio. O validador atual de emissão manual rejeita tokens com client_id por desenho; não basta remover essa verificação para aceitar qualquer JWT.

Após validar a sessão, resolva identidade e empresa no Supabase e vincule a credencial MCP ao cliente autorizado e ao recurso MCP. Continue validando vínculo ativo e RLS nas consultas. Nenhuma ferramenta deve aceitar user_id ou company_id fornecidos pelo modelo como autoridade de acesso.

Referência: [autenticação de conectores Claude](https://claude.com/docs/connectors/building/authentication).

## 5. Implementar renovação e revogação no Redis

O armazenamento atual dura até uma hora e não guarda refresh tokens. Precisa ser ampliado antes de oferecer uma conexão persistente:

- Sessão Supabase dedicada ao conector, com refresh token criptografado no backend; não copiar o refresh token da sessão do navegador.
- Tokens MCP próprios, distintos dos tokens Supabase, com expiração e vínculo ao recurso/cliente/usuário/empresa/scopes.
- Rotação atômica dos refresh tokens MCP, detecção de reutilização e bloqueio coordenado de renovação entre réplicas.
- Renovação Supabase também coordenada para que duas requisições concorrentes não disputem o mesmo refresh token.
- Revogação que impeça novas consultas e novas renovações, sem depender apenas da expiração do JWT.
- Separação e TTL de pedidos temporários, códigos, conexões e tokens. Limites atuais de uma hora não podem ser reutilizados cegamente para refresh.

Mantenha o Redis já configurado na stack, atualmente informado como `redis://redis:6379/7`. Confirme capacidade e política de descarte adequada para sessões. Nenhuma necessidade de criar tabelas novas de sessões no banco do CRM é introduzida por este desenho.

## 6. Publicar somente depois de concluir o código

Até os passos anteriores serem implementados, mantenha `AUTH_MODE=personal_token` na imagem em produção.

Na versão OAuth concluída, as configurações seriam:

```yaml
AUTH_MODE: oauth
PUBLIC_URL: https://mcp.allyson.com.br
ALLOWED_HOSTS: mcp.allyson.com.br
OAUTH_ISSUER: https://mcp.allyson.com.br
```

Mantenha Supabase URL/publishable key, Redis e os segredos atuais. Configure `ALLOWED_ORIGINS=https://app.usemakecrm.com.br`, sem `/login`. Os novos client ID/secret do Supabase e a URL da tela de consentimento precisarão de variáveis adicionais **a serem definidas e lidas pela implementação**; cadastrá-las agora não faria o código atual utilizá-las.

Depois, faça build/push com uma tag nova e atualize a imagem no Portainer. O Traefik já encaminha todas as rotas desse domínio para a aplicação; não acrescente `/mcp` à regra Host e não restrinja o roteamento de `/.well-known/*` e `/oauth/*`.

## 7. Validar e liberar para os usuários

1. Em homologação, valide descoberta, login, aprovação, recusa, callback, troca de código e consulta autenticada.
2. Adicione o conector no Claude com nome `MakeCRM` e URL `https://mcp.allyson.com.br/mcp`; complete o login e consentimento.
3. Repita com outro usuário de outra empresa: cada conexão deve receber somente os registros permitidos por suas RLS.
4. Teste usuários da mesma empresa com permissões diferentes.
5. Force expiração em testes controlados e valide renovação, revogação e concorrência; não prolongue a validade do access token apenas para esconder a falta de refresh.
6. Revogue uma conexão e confirme que ela não consulta nem renova; as demais conexões devem continuar funcionando.
7. Teste a meta de 100 chamadas por segundo e os limites de Supabase/Redis/VPS antes da liberação ampla.

O usuário final só precisa da URL compartilhada, da própria conta MakeCRM e da aprovação. Não precisa configurar Supabase, criar OAuth client, receber client secret ou informar manualmente a empresa.
