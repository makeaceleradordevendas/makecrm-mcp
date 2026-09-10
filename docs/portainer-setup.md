> **A stack agora usa OAuth.** Siga [oauth-production.md](oauth-production.md) para configurar Supabase e SaaS antes do deploy.

# VPS com Portainer, Docker Swarm e Traefik

A stack `portainer-stack.yml` usa o domínio **mcp.allyson.com.br**, a rede externa **allyson-desenv**, o entrypoint **websecure** e o resolver **letsencryptresolver** informados para o ambiente. Use o Redis já configurado na sua infraestrutura. Nenhuma política ou tabela do Supabase é alterada por esse deploy.

## 1. Preparar a imagem no computador

Na raiz deste repositório, onde está o Dockerfile:

```sh
docker build --platform linux/amd64 -t allysonassuncao/makecrm-mcp:v1 .
docker push allysonassuncao/makecrm-mcp:v1
```

Use uma tag nova a cada versão, substituindo `v1` nos dois comandos e em `MCP_IMAGE` na stack. Se necessário, autentique-se antes com `docker login`. O Swarm baixa a imagem pronta; ele não faz build a partir de `build: .`.

O Dockerfile compila TypeScript com Node 22, instala somente dependências de produção na imagem final e executa como usuário `node`, sem privilégios de root. O processo escuta na porta 3000 em `0.0.0.0` e recebe SIGTERM diretamente. Credenciais, arquivos `.env`, Git e o documento de schema não entram no contexto da imagem.

## 2. Conferir a VPS

- A stack é para **Docker Swarm**, com nó Linux amd64/x86_64. A imagem criada pelos comandos acima não é ARM.
- A rede `allyson-desenv` precisa existir como rede overlay e estar conectada ao Traefik.
- O Traefik deve ler labels de serviços Swarm, ter o entrypoint `websecure` e o resolver `letsencryptresolver` já configurados.
- Aponte o registro DNS de `mcp.allyson.com.br` para a VPS/entrada pública do Traefik. Caso exista AAAA, ele também precisa apontar para um endereço válido do ambiente.
- Mantenha as portas públicas necessárias ao HTTPS e ao desafio ACME já usado pelo seu Traefik. A stack não publica a porta 3000 da aplicação no host.

## 3. Criar a stack no Portainer

Selecione o ambiente Swarm → **Stacks → Add stack → Web editor**. Dê um nome como `makecrm-mcp` e cole o conteúdo de `portainer-stack.yml`.

Em **Environment variables** da stack, preencha:

| Variável | Valor |
|---|---|
| `MCP_IMAGE` | `allysonassuncao/makecrm-mcp:v1`, usando a tag que você publicou |
| `SUPABASE_URL` | URL HTTPS do projeto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publishable/anon do projeto, nunca service_role/secret |
| `REDIS_URL` | Conexão Redis existente, por exemplo `redis://redis:6379/7`; não usar uma URL REST |
| `SESSION_ENCRYPTION_KEY` | Segredo com exatamente 64 caracteres hexadecimais |
| `MCP_CURSOR_SECRET` | Outro segredo aleatório com pelo menos 32 caracteres |
| `SAAS_API_KEY` | Outro segredo aleatório com pelo menos 32 caracteres, exclusivo do backend |
| `SUPABASE_OAUTH_CLIENT_ID` | Client ID da aplicação confidencial MakeCRM MCP |
| `SUPABASE_OAUTH_CLIENT_SECRET` | Client Secret da aplicação, somente no backend |
| `ALLOWED_ORIGINS` | Origem HTTPS do SaaS, sem caminho/barra final; pode ficar vazio para clientes sem Origin |

Você pode reutilizar os três segredos já gerados para o MCP, mantendo seus valores iguais entre réplicas. Se ainda não os tem, execute `openssl rand -hex 32` três vezes e use um resultado diferente para cada um. Não cole os segredos no YAML versionado nem publique arquivos de ambiente no Git.

As variáveis da Vercel **não são transferidas automaticamente** para o Portainer. Aqui não é necessário escolher visibilidade Config para `PUBLIC_URL`: a stack já define a URL pública, `ALLOWED_HOSTS`, porta, host, modo `oauth`, issuer do próprio MCP e proxy. Configure também os dois parâmetros da aplicação confidencial Supabase. Não cadastre variáveis opcionais vazias. Os campos obrigatórios são recusados antes do deploy se não tiverem valor.

Se a imagem for privada, configure a autenticação do Docker Hub em **Registries** no Portainer e use esse registro ao implantar. Os nós Swarm precisam conseguir baixar a imagem.

Clique em **Deploy the stack**.

## 4. Validar o deploy

1. O serviço deve ter `1/1` réplica em execução. Veja o log `server_started` na porta 3000.
2. O healthcheck do container usa `/healthz` com o Host público correto. A checagem do Traefik usa `/readyz`, que exige conexão Redis.
3. Acesse `https://mcp.allyson.com.br/`: deverá retornar a identificação MakeCRM MCP e `auth_mode: oauth`.
4. Acesse `https://mcp.allyson.com.br/readyz`: deverá retornar `{"status":"ready"}`. Isso não valida as RLS nem as funções SQL.
5. As funções `mcp_identity` e `mcp_read_page` da migração do repositório precisam existir no Supabase antes das consultas. Elas preservam as RLS atuais.
6. Confira `/.well-known/oauth-authorization-server` e o desafio 401 em `/mcp` sem Bearer.
7. Conecte Claude/ChatGPT a `https://mcp.allyson.com.br/mcp`, faça login e aprove a autorização. Não é necessário copiar UUID manualmente.
8. Valide consultas, renovação e revogação com usuários reais conforme [OAuth em produção](oauth-production.md).

## 5. Atualização e capacidade

Publique uma nova tag de imagem, altere `MCP_IMAGE` no Portainer e atualize a stack. A configuração de atualização inicia uma tarefa nova antes de encerrar a anterior, com rollback em falhas detectadas pelo Swarm. A VPS precisa de recursos para manter as duas temporariamente.

Começamos com os limites do seu exemplo: **0,50 CPU, 512 MB e uma réplica**. Isso não é uma garantia de 100 chamadas por segundo. Valide o teste de carga, latências do Redis/Supabase e recursos da VPS antes de ampliar o uso. As sessões e limites continuam compartilhados em Redis; é possível aumentar `replicas` sem exigir afinidade de sessão. Duas réplicas na mesma VPS não protegem contra a queda da VPS.

`TRUST_PROXY_HOPS=1` pressupõe o Traefik como único proxy até a aplicação; confirme o caminho se também utilizar CDN ou outro balanceador. CORS continua restrito às origens configuradas.

O vínculo do Git com a Vercel pode continuar disparando builds até você desconectá-lo. Esse procedimento não exclui automaticamente o deployment antigo nem altera o Supabase ou o Upstash.

## Validação realizada

A imagem foi construída localmente para `linux/amd64`, e o YAML foi validado com `docker stack config` usando valores fictícios. Com containers temporários, foram verificados: execução sem root; ausência de `.env`, Git, schema e ferramentas de desenvolvimento na imagem; respostas da página inicial, healthcheck e prontidão Redis; recusa de chamadas sem autenticação; rejeição de Host inválido; indisponibilidade de `/readyz` quando Redis para; e encerramento por SIGTERM com código zero. Os containers e a rede temporária foram removidos. A imagem de teste local se chama `makecrm-mcp:portainer-test`.

O teste não acessou Supabase real e não implantou Traefik/Swarm na VPS. A publicação no Docker Hub, DNS, certificado, credenciais do Portainer e consultas reais precisam ser executados conforme os passos acima.

Referências: [Stacks no Swarm](https://docs.docker.com/engine/swarm/stack-deploy/), [criar stack no Portainer](https://docs.portainer.io/2.33-lts/user/docker/stacks/add), [Traefik Swarm](https://doc.traefik.io/traefik/reference/install-configuration/providers/swarm/).
