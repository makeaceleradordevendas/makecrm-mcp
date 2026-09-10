import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type Props = { supabase: SupabaseClient; mcpClientId: string; mcpOrigin?: string };
// Mount at /oauth/consent. Reuse the SaaS Supabase client; never instantiate an admin client.
export function OAuthConsent({ supabase, mcpClientId, mcpOrigin = 'https://mcp.allyson.com.br' }: Props) {
  const [request, setRequest] = useState<{ id: string; name: string; email: string } | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const returnToMcp = (target: string) => {
    const url = new URL(target);
    if (url.origin !== mcpOrigin || url.pathname !== '/oauth/supabase/callback' || url.username || url.password || url.hash) throw new Error('Destino da autorização inválido.');
    window.location.assign(url.href);
  };
  useEffect(() => {
    let active = true;
    async function load() {
      const values = new URLSearchParams(window.location.search).getAll('authorization_id');
      const id = values[0];
      if (values.length !== 1 || !id || !/^[A-Za-z0-9_-]{1,256}$/.test(id)) throw new Error('Pedido de autorização inválido.');
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (!user.user || userError) {
        // The login handler must accept only this local return path (see README).
        const returnTo = '/oauth/consent?authorization_id=' + encodeURIComponent(id);
        window.location.assign('/login?returnTo=' + encodeURIComponent(returnTo)); return;
      }
      const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(id);
      if (detailsError || !data) throw new Error('Não foi possível carregar a autorização. Reinicie a conexão pelo aplicativo de IA.');
      if (!active) return;
      if ('redirect_url' in data) { returnToMcp(data.redirect_url); return; }
      if (data.client.id !== mcpClientId) throw new Error('Esta aplicação não está habilitada para conectar ao MakeCRM MCP.');
      setRequest({ id, name: data.client.name ?? 'MakeCRM MCP', email: user.user.email ?? user.user.id });
    }
    void load().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar a autorização.'); });
    return () => { active = false; };
  }, [supabase, mcpClientId, mcpOrigin]);
  async function decide(approve: boolean) {
    if (!request || busy) return;
    setBusy(true); setError('');
    try {
      const result = approve
        ? await supabase.auth.oauth.approveAuthorization(request.id, { skipBrowserRedirect: true })
        : await supabase.auth.oauth.denyAuthorization(request.id, { skipBrowserRedirect: true });
      if (result.error || !result.data) throw new Error('A autorização expirou ou não pôde ser concluída. Reinicie a conexão.');
      returnToMcp(result.data.redirect_url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível concluir a autorização.'); setBusy(false); }
  }
  return <main>
    <h1>Conectar ao MakeCRM</h1>
    {error && <p role="alert">{error}</p>}
    {!request && !error && <p>Carregando autorização…</p>}
    {request && <>
      <p>Você está conectado como <strong>{request.email}</strong>.</p>
      <p>Autorize <strong>{request.name}</strong> a manter uma sessão para consultar o CRM com suas permissões.</p>
      <p>Na próxima tela você confirma qual aplicativo de IA terá acesso e quais consultas permite.</p>
      <button disabled={busy} onClick={() => void decide(true)}>Autorizar</button>
      <button disabled={busy} onClick={() => void decide(false)}>Recusar</button>
    </>}
  </main>;
}
