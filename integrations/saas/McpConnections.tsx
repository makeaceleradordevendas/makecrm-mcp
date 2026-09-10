import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type Connection = { id: string; client_name: string; scopes: string[]; expires_at: number };
export function McpConnections({ supabase, mcpOrigin = 'https://mcp.allyson.com.br' }: { supabase: SupabaseClient; mcpOrigin?: string }) {
  const [items, setItems] = useState<Connection[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function request(path = '', method = 'GET') {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('Faça login novamente para gerenciar suas conexões.');
    const response = await fetch(`${mcpOrigin}/api/mcp-connections${path}`, { method, credentials: 'omit',
      headers: { Authorization: `Bearer ${data.session.access_token}` } });
    if (!response.ok) throw new Error('Não foi possível acessar as conexões. Tente novamente.');
    return response;
  }
  async function load() { const response = await request(); const data = await response.json(); setItems(data.items); }
  useEffect(() => { void load().catch(e => setError(e.message)); }, [supabase, mcpOrigin]);
  async function disconnect(id: string) {
    setBusy(true); setError('');
    try { await request('/' + encodeURIComponent(id), 'DELETE'); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível desconectar.'); }
    finally { setBusy(false); }
  }
  return <section>
    <h1>Integrações com inteligência artificial</h1>
    <p>Adicione um conector no seu aplicativo de IA com o endereço:</p><code>{mcpOrigin}/mcp</code>
    <p>Entre com sua conta MakeCRM e aprove as consultas. Nenhum token precisa ser copiado.</p>
    {error && <p role="alert">{error}</p>}
    <ul>{items.map(item => <li key={item.id}>
      <strong>{item.client_name}</strong> — autorização válida até {new Date(item.expires_at * 1000).toLocaleDateString('pt-BR')}
      <button disabled={busy} onClick={() => void disconnect(item.id)}>Desconectar</button>
    </li>)}</ul>
  </section>;
}
