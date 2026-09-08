import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';

if (!__ENV.MCP_URL || !__ENV.TOKENS_FILE) throw new Error('Configure MCP_URL e TOKENS_FILE para homologação.');
const tokens = new SharedArray('credentials', () => JSON.parse(open(__ENV.TOKENS_FILE)));
if (tokens.length < 100 || tokens.some(token => typeof token !== 'string' || !token)) {
  throw new Error('Use pelo menos 100 tokens válidos de usuários de teste.');
}
const toolErrors = new Rate('mcp_tool_errors');
const methods = ['search_contacts', 'search_opportunities', 'search_conversations'];
export const options = {
  scenarios: { reads: { executor: 'constant-arrival-rate', rate: Number(__ENV.RPS || 100), timeUnit: '1s', duration: __ENV.DURATION || '5m', preAllocatedVUs: 100, maxVUs: 250 } },
  thresholds: {
    'http_req_duration{phase:load}': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed{phase:load}': ['rate<0.01'],
    mcp_tool_errors: ['rate<0.01'],
    dropped_iterations: ['count==0'],
  },
};
function params(token, phase) {
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' }, tags: { phase }, timeout: '20s' };
}
export function setup() {
  for (const token of tokens) {
    const init = http.post(__ENV.MCP_URL, JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'makecrm-load-test', version: '1.0.0' } } }), params(token, 'setup'));
    if (init.status !== 200 || !init.json('result.protocolVersion')) throw new Error('Inicialização falhou; confira ambiente e credenciais.');
    const initialized = http.post(__ENV.MCP_URL, JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), params(token, 'setup'));
    if (initialized.status !== 202) throw new Error('Confirmação de inicialização falhou.');
  }
}
export default function () {
  const n = exec.scenario.iterationInTest;
  const response = http.post(__ENV.MCP_URL, JSON.stringify({ jsonrpc: '2.0', id: n + 2, method: 'tools/call', params: { name: methods[n % methods.length], arguments: { limit: 25 } } }), params(tokens[n % tokens.length], 'load'));
  let success = false;
  try { const body = response.json(); success = response.status === 200 && !!body.result && !body.error && !body.result.isError && Array.isArray(body.result.structuredContent?.items); } catch { /* Não logar corpos ou tokens. */ }
  check(response, { 'consulta MCP concluída': () => success });
  toolErrors.add(!success);
}
