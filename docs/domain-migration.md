# Domínio oficial: mcp.usemakecrm.com.br

O domínio confirmado para esta implantação é `mcp.usemakecrm.com.br`. Este roteiro atualiza os endereços `mcp.allyson.com.br` usados nas instruções anteriores. O servidor lê seu domínio pelo ambiente; não é necessário reconstruir a imagem para alterar apenas estes valores.

## DNS

Em 9 de setembro de 2026, a consulta ao resolvedor público Google retornou:

```text
mcp.usemakecrm.com.br → CNAME mcp.maso.app.br
mcp.maso.app.br → CNAME maso.app.br
maso.app.br → A 178.156.219.16
```

A cadeia CNAME é válida desde que esse seja o IP público do Traefik pretendido. CNAME não redireciona o navegador: ele continua enviando `Host: mcp.usemakecrm.com.br`, e o certificado HTTPS e o roteador devem atender esse nome. O resolvedor local ainda retornava erro, embora o Google já encontrasse o registro; aguarde a atualização do DNS/cache local e confira o resultado novamente antes de concluir que o registro está ausente.

## Portainer

O arquivo `portainer-stack.yml` foi alinhado em cinco pontos:

- `PUBLIC_URL: https://mcp.usemakecrm.com.br`
- `OAUTH_ISSUER: https://mcp.usemakecrm.com.br`
- `ALLOWED_HOSTS: mcp.usemakecrm.com.br,mcp.maso.app.br`
- Dois roteadores Traefik: `makecrm-mcp` atende `mcp.usemakecrm.com.br` e `makecrm-mcp-maso` atende `mcp.maso.app.br`. Ambos usam HTTPS, o resolver `letsencryptresolver` e o serviço `makecrm-mcp` na porta 3000.
- Host do healthcheck Traefik: `mcp.usemakecrm.com.br`.

Atualize a mesma stack no Portainer usando o arquivo corrigido. O serviço continua na rede externa `maso-app-desenv`, na porta interna 3000 e com a imagem/variáveis já configuradas pelo usuário. Confirme que o Traefik compartilha essa rede e que o Redis indicado por `REDIS_URL` é alcançável pelo serviço. Não desabilite o healthcheck ou a validação de Host.

A configuração anterior misturava três domínios. O healthcheck enviava `Host: mcp.maso.com.br`, recusado com 403 pela aplicação antes de verificar o Redis. O Traefik pode excluir destinos não saudáveis e responder 503. Corrigir esse Host elimina o conflito, mas não comprova que Redis/rede/replicas estão saudáveis no ambiente real.

## OAuth e SaaS

No OAuth App MakeCRM MCP do Supabase, confirme este Redirect URI exato:

```text
https://mcp.usemakecrm.com.br/oauth/supabase/callback
```

Não recrie a aplicação nem regenere o Client Secret. A página de consentimento do SaaS precisa aceitar e validar esse novo callback. Caso ainda use o domínio antigo fixo, ajuste somente a configuração do MCP nessa página, preservando sessão, endpoints REST, login e RLS. Atualize também o endereço de gestão `/api/mcp-connections` se o SaaS o utiliza.

`ALLOWED_ORIGINS` continua sendo `https://app.usemakecrm.com.br`, a origem do SaaS. Os callbacks Claude/ChatGPT em `OAUTH_ALLOWED_REDIRECT_URIS` continuam sendo os endereços do aplicativo de IA, não o callback Supabase.

## Verificação

1. Confirme tarefa em execução no Portainer e emissão dos certificados HTTPS para os dois domínios.
2. Abra `/healthz` e `/readyz` em `https://mcp.usemakecrm.com.br` e `https://mcp.maso.app.br`: devem retornar 200. `/readyz` também verifica Redis.
3. Os metadados em `/.well-known/oauth-authorization-server` devem anunciar o domínio oficial como issuer.
4. No Claude, configure `https://mcp.usemakecrm.com.br/mcp` e inicie uma nova autorização. Conexões antigas estão vinculadas à URL/recurso anterior e não migram automaticamente.
5. Caso continue 503, confira os logs do serviço MCP e do Traefik, a rede compartilhada, o hostname do healthcheck e a conexão Redis.

Os dois domínios dão acesso HTTP ao mesmo serviço, sem redirecionamento entre eles. Para cadastrar a conexão no Claude/ChatGPT e iniciar o consentimento, use `https://mcp.usemakecrm.com.br/mcp`: esse continua sendo o domínio oficial de `PUBLIC_URL`, `OAUTH_ISSUER`, callbacks e validação de origem do consentimento. O domínio adicional não cria uma segunda identidade OAuth; iniciar o fluxo manualmente por ele pode causar falhas de cookie ou origem.

Referência: [healthchecks do Traefik](https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/#health-check).
