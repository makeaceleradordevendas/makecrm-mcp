# Integração manual no SaaS React/Vite

O SaaS atual usa a API HTTP do Supabase. Preserve essa integração e siga [o ajuste de consentimento via REST](consent-rest.md), sem instalar o SDK ou modificar o login existente.

`OAuthConsent.tsx` e `McpConnections.tsx` são exemplos opcionais para aplicações que já utilizam o SDK. Nesses casos, reutilize a instância `supabase` existente. O diretório tem um pacote separado somente para verificar os exemplos; ele não faz parte da imagem MCP.

## Rotas

Exemplo com React Router, adaptando o caminho do seu cliente Supabase:

```tsx
<Route path="/oauth/consent" element={
  <OAuthConsent
    supabase={supabase}
    mcpClientId={import.meta.env.VITE_MCP_SUPABASE_OAUTH_CLIENT_ID}
  />
} />
<Route path="/settings/integrations/ai" element={<McpConnections supabase={supabase} />} />
```

`VITE_MCP_SUPABASE_OAUTH_CLIENT_ID` é o Client ID público da aplicação confidencial MakeCRM MCP. **Não coloque seu Client Secret, SESSION_ENCRYPTION_KEY ou SAAS_API_KEY no frontend.** Use uma versão de `@supabase/supabase-js` que inclua `auth.oauth`; a versão verificada está no lockfile deste diretório.

A rota `/oauth/consent` precisa carregar diretamente pela URL (fallback da SPA) e não pode perder `authorization_id` ao passar por guards de autenticação. O componente manda o usuário sem sessão para `/login?returnTo=...`.

Depois do login, aceite somente o retorno local previsto, nunca uma URL arbitrária:

```ts
const requested = new URLSearchParams(window.location.search).get('returnTo');
let destination = '/';
if (requested) {
  const target = new URL(requested, window.location.origin);
  const ids = target.searchParams.getAll('authorization_id');
  if (target.origin === window.location.origin && target.pathname === '/oauth/consent' &&
      ids.length === 1 && /^[A-Za-z0-9_-]{1,256}$/.test(ids[0] ?? '')) {
    destination = '/oauth/consent?authorization_id=' + encodeURIComponent(ids[0]!);
  }
}
// Execute depois de concluir seu login e eventuais desafios MFA.
window.location.assign(destination);
```

Se já existe um mecanismo de retorno seguro no SaaS, adapte o componente a ele. Mantenha o pedido durante login por senha, SSO, magic link e MFA que você disponibiliza. Nunca conclua consentimento antes da autenticação/MFA exigida pela sua aplicação.

## Consentimento

O componente consulta os detalhes no Supabase, verifica se a aplicação é o Client ID configurado, mostra a conta e permite autorizar ou recusar. Ele só segue redirects devolvidos pela API que apontem para o callback exato do MCP. Não aprova automaticamente aplicações desconhecidas.

Este componente atende exclusivamente o backend MakeCRM MCP. Se seu SaaS já tem outras integrações OAuth, incorpore a verificação à sua tela existente em vez de substituir um handler que atende outros clientes.

Depois desta etapa, o próprio MCP exibe a aprovação específica do aplicativo de IA. A tela do SaaS não precisa receber nem armazenar os tokens emitidos para o Claude/ChatGPT.

## Gestão das conexões

O componente de gestão chama:

- `GET https://mcp.allyson.com.br/api/mcp-connections`
- `DELETE https://mcp.allyson.com.br/api/mcp-connections/{id}`

Envia o access token da sessão do usuário no SaaS em `Authorization: Bearer ...`. O backend verifica o token no Supabase Auth e só permite listar/revogar conexões desse usuário. Não envie `user_id`, `company_id`, refresh token nem segredo de backend.

Configure `ALLOWED_ORIGINS=https://app.usemakecrm.com.br` no MCP. Essa API não usa cookies entre os domínios.

Adapte estilos e o menu à interface do seu SaaS. A integração e o teste no SaaS real ficam sob sua responsabilidade, conforme solicitado.
