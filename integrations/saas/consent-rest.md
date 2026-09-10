# Consentimento via API HTTP com o Supabase atual

O MCP solicita `scope=email` ao Supabase, sem `openid`. Assim, recebe access token e refresh token, sem exigir ID token nem migração da chave HS256. O MCP valida o access token no Auth e resolve usuário/empresa pela RPC `mcp_identity`; o e-mail não substitui a identidade UUID. Os escopos de leitura são controlados na autorização do MCP e a RLS continua valendo nas consultas.

## Ajuste na tela existente `/oauth/consent`

- Preserve login, sessão, renovação, infraestrutura HTTP e retorno seguro após login do SaaS. Não instale SDK nem altere as chaves do projeto para este ajuste.
- Continue lendo `authorization_id` e consultando `GET /auth/v1/oauth/authorizations/{authorization_id}` no projeto `https://htdjkprnspssogcetzhx.supabase.co`.
- Preserve `apikey` publishable/anon e o Bearer da sessão Supabase autenticada. Se a sessão fica no backend, mantenha as chamadas lá e a proteção CSRF atual; não exponha tokens ao navegador.
- Leia a string `scope` retornada pela API, separada por espaços. Não imponha `openid`, não acrescente escopos e não confunda `scope` vazio com ausência de autenticação. Se `scope` estiver ausente ou vazio, apresente a descrição geral da conexão, preservando validação de sessão, cliente e callback.
- Quando o escopo retornado for `email`, exiba **E-mail da conta** e **Permite identificar o e-mail associado à conta conectada.** Remova qualquer cartão fixo “Identidade da Conta (OpenID)” para esses pedidos.
- Preserve a validação do Client ID de MakeCRM MCP e do `redirect_uri` exato `https://mcp.allyson.com.br/oauth/supabase/callback`. Não aprove automaticamente pedidos pendentes.
- Mantenha `POST /auth/v1/oauth/authorizations/{authorization_id}/consent` com `{"action":"approve"}` ou `{"action":"deny"}`. Não envie `scope` nesse POST e não faça troca de tokens no SaaS.
- Continue aceitando respostas diretas com detalhes ou `redirect_url` (autorização já concedida). Valide HTTPS, origem/caminho exatos do callback, ausência de credenciais e fragmento antes de navegar. Preserve todos os parâmetros retornados, incluindo code/state/error.
- Desabilite os botões durante o envio. Preserve tratamento de erros e proteção contra repetição de aprovação após falha de rede com resultado incerto.

Texto geral sugerido: **O MakeCRM MCP manterá uma conexão vinculada à sua conta para consultar informações do CRM, respeitando suas permissões. Na próxima etapa, você confirma o aplicativo de IA e as consultas permitidas.**

O escopo `email` não concede nem restringe sozinho permissões de leitura/escrita nas tabelas. A sessão Supabase mantém as permissões do usuário; o servidor MCP oferece somente as ferramentas de consulta implementadas. Não apresente `email` como uma garantia de banco somente leitura.

## Teste

Publique uma imagem nova do MCP e inicie uma conexão nova no Claude. Pedidos já iniciados podem continuar vinculados a `openid`; não reutilize a URL anterior. Verifique que a solicitação nova enviada ao Supabase contém `scope=email`. O callback deve chegar à aprovação do aplicativo de IA no MCP e depois retornar ao Claude. Teste autorização e recusa na tela do SaaS.

Não é necessário recriar o OAuth App, regenerar seu Client Secret, rotacionar chaves Supabase, alterar tabelas/RLS ou limpar o Redis. Credenciais que já foram emitidas para fluxos antigos não são convertidas por esta mudança; a solicitação nova usa o escopo novo.

Fonte: [escopos e emissão de tokens no Supabase](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows).
