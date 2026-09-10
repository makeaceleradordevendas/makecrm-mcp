import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';
import { AccessDenied, type Principal, type SaasGateway } from '../contracts.js';
import { readTool, readToolNames } from './read-catalog.js';
import { DEFAULT_TIME_ZONE } from './date-time.js';

export function registerReadTools(server: McpServer, principal: Principal, gateway: SaasGateway, challenge: string, oauth: boolean, timeZone = DEFAULT_TIME_ZONE) {
  if (!gateway.executeRead) return;
  for (const name of readToolNames) {
    const tool = readTool(name);
    const securitySchemes = [{ type: 'oauth2', scopes: [tool.scope] }];
    server.registerTool(name, {
      title: tool.title, description: `${tool.description} Respeita as permissões do usuário conectado.${name === 'get_pipeline_deals_page_v7' || name === 'get_pipeline_deals_totals_v7' ? ` Fuso para dias: ${timeZone}. created_on calcula início e fim no MCP; não some/subtraia horas. date_filter informa o intervalo real consultado. Recebidas significa criadas (created_at), não a data de atribuição ao responsável.` : ''}`, inputSchema: tool.schema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      ...(oauth ? { _meta: { securitySchemes } } : {}),
    }, async (args: unknown, extra: { signal: AbortSignal }): Promise<CallToolResult> => {
      if (!principal.scopes.includes(tool.scope)) return {
        isError: true, content: [{ type: 'text', text: 'A conexão não tem permissão para esta consulta. Autorize uma nova conexão com a permissão solicitada.' }],
        ...(oauth ? { _meta: { 'mcp/www_authenticate': [`${challenge}, error="insufficient_scope", scope="${tool.scope}"`] } } : {}),
      };
      try {
        const result = await gateway.executeRead!(name, principal, args, extra.signal);
        return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: error instanceof AccessDenied ? 'Você não tem acesso aos registros solicitados.'
          : error instanceof ZodError ? 'Filtros inválidos. Confira os campos, limites e intervalos informados.'
          : 'A consulta está temporariamente indisponível. Tente novamente.' }] };
      }
    });
  }
}
