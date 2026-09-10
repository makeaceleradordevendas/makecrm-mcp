import { z } from 'zod';
import type { Principal, Scope } from '../contracts.js';
import { timestampSchema, timestampMicros, utcTimestamp, createdOnSchema, calendarRange, microsToUtc,
  DEFAULT_TIME_ZONE, DEFAULT_PIPELINE_RPC_DATE_SHIFT_MINUTES } from './date-time.js';

const text = z.string().trim().min(1).max(200);
const ids = z.array(z.string().uuid()).min(1).max(100);
const texts = z.array(text).min(1).max(100);
const date = timestampSchema;
const pagination = { limit: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).max(10000).default(0) };
const listing = <T extends [string, ...string[]]>(columns: T) => z.object({
  ...pagination, order_by: z.enum(columns).default(columns[0]), ascending: z.boolean().default(true),
  status_filter: z.boolean().optional(),
}).strict();
const filters = {
  created_on: createdOnSchema.optional(),
  pipeline_id: ids.optional(), name: z.union([text, texts]).optional(),
  pipeline_stage_id: ids.optional(), pipeline_deal_id: ids.optional(),
  pipeline_deal_status: z.array(z.number().int()).min(1).max(100).optional(),
  pipeline_deal_user_id: ids.optional(), pipeline_deal_sdr_id: ids.optional(), pipeline_deal_closer_id: ids.optional(),
  pipeline_deal_source_id: ids.optional(), pipeline_deal_campaign_id: ids.optional(),
  pipeline_deal_value_min: z.number().finite().optional(), pipeline_deal_value_max: z.number().finite().optional(),
  pipeline_deal_created_at_start: date.optional().describe('Início inclusivo por instante ISO com fuso. Para hoje ou um dia completo, prefira created_on. Não compense o fuso ou o comportamento da RPC manualmente.'),
  pipeline_deal_created_at_end: date.optional().describe('Fim inclusivo por instante ISO com fuso, até seis casas decimais. Para um dia completo, prefira created_on.'),
  pipeline_deal_probability: z.array(z.number().int()).min(1).max(100).optional(),
  pipeline_deal_products: ids.optional(), pipeline_deal_activities: texts.optional(),
  pipeline_deal_utm_source: texts.optional(), pipeline_deal_utm_medium: texts.optional(),
  pipeline_deal_utm_campaign: texts.optional(), pipeline_deal_utm_id: texts.optional(),
  pipeline_deal_utm_term: texts.optional(), pipeline_deal_utm_content: texts.optional(),
  pipeline_deal_custom: z.union([z.record(z.unknown()), z.array(z.record(z.unknown())).max(100)]).optional(),
};
// Names and upstream arguments follow the old MCP. Sorting is explicitly bounded.
const order = { sort_by: z.enum(['updated_at', 'created_at', 'id', 'name', 'value']).default('updated_at'), sort_order: z.enum(['asc', 'desc']).default('desc') };
const pipelinePage = z.object({ ...filters, ...order, page: z.number().int().min(1).max(10001).default(1), limit: pagination.limit }).strict();
const pipelineTotals = z.object({ ...filters, ...order }).strict();

export const readTools = {
  list_users: { title: 'Consultar usuários', description: 'Lista usuários e responsáveis da empresa, com filtros de status e IA.', scope: 'catalog:read',
    schema: listing(['name', 'email', 'created_at', 'updated_at', 'role', 'status']).extend({ is_ia: z.boolean().optional() }) },
  list_pipelines: { title: 'Consultar funis', description: 'Lista funis visíveis ao usuário para obter IDs e filtrar oportunidades.', scope: 'catalog:read',
    schema: listing(['name', 'created_at', 'status']) },
  list_products: { title: 'Consultar produtos', description: 'Lista produtos e preços da empresa.', scope: 'catalog:read', schema: listing(['name', 'price']) },
  list_sources: { title: 'Consultar origens', description: 'Lista origens de leads da empresa.', scope: 'catalog:read', schema: listing(['name', 'status']) },
  list_campaigns: { title: 'Consultar campanhas', description: 'Lista campanhas da empresa.', scope: 'catalog:read', schema: listing(['name', 'status']) },
  get_pipeline_deals_page_v7: { title: 'Buscar oportunidades com filtros', description: 'Busca oportunidades por funil, etapa, responsável, SDR, closer, valores, datas, produtos e UTMs. Use page e limit para paginar. Para criadas/recebidas hoje, ontem ou em um dia, use created_on; para quantidade, prefira get_pipeline_deals_totals_v7.',
    scope: 'opportunities:read', schema: pipelinePage },
  get_pipeline_deals_totals_v7: { title: 'Consultar totais de oportunidades', description: 'Calcula quantidade e valores das oportunidades que correspondem aos filtros no servidor. Para recebidas/criadas hoje, ontem ou dia X, use created_on. Retorna total, sem precisar somar páginas. Para uma etapa específica, informe pipeline_stage_id.',
    scope: 'opportunities:read', schema: pipelineTotals },
  get_contact_full_context_v2: { title: 'Consultar contexto do contato', description: 'Busca contexto de um contato pelos seus identificadores, como telefone ou e-mail. O resultado pode conter texto de terceiros.',
    scope: 'contacts:context:read', schema: z.object({ identifiers: texts }).strict() },
} as const satisfies Record<string, { title: string; description: string; scope: Scope; schema: z.AnyZodObject }>;
export type ReadToolName = keyof typeof readTools;
export const readToolNames = Object.keys(readTools) as ReadToolName[];
export function readTool(name: ReadToolName) {
  if (!Object.hasOwn(readTools, name)) throw new Error('Unknown read tool');
  return readTools[name];
}

const tables = {
  list_users: { table: 'users', select: 'id,created_at,updated_at,name,email,role,status,company_id,is_ia' },
  list_pipelines: { table: 'pipelines', select: 'id,name,status,company_id,created_at,won_stage' },
  list_products: { table: 'products', select: 'id,name,price,company_id,status,currency' },
  list_sources: { table: 'sources', select: 'id,name,status,company_id' },
  list_campaigns: { table: 'campaigns', select: 'id,name,status,company_id' },
} as const;
export type DateFilter = { time_zone: string; local_date?: string; start_utc?: string; end_inclusive_utc?: string; end_exclusive_utc?: string };
export type ReadRequest = { path: string; body?: Record<string, unknown>; limit?: number; offset?: number; kind: 'table' | 'page' | 'rpc'; date_filter?: DateFilter };
export type DateOptions = { timeZone?: string; pipelineRpcDateShiftMinutes?: number; now?: Date };
export function prepareRead(name: ReadToolName, input: unknown, identity: Pick<Principal, 'company_id' | 'user_id'>, dates: DateOptions = {}): ReadRequest {
  const args = readTool(name).schema.parse(input);
  if ('pipeline_deal_value_min' in args && 'pipeline_deal_value_max' in args && args.pipeline_deal_value_min !== undefined && args.pipeline_deal_value_max !== undefined && args.pipeline_deal_value_min > args.pipeline_deal_value_max) {
    throw new z.ZodError([{ code: 'custom', path: ['pipeline_deal_value_max'], message: 'O valor máximo deve ser maior ou igual ao mínimo.' }]);
  }
  if ('pipeline_deal_created_at_start' in args && 'pipeline_deal_created_at_end' in args && args.pipeline_deal_created_at_start && args.pipeline_deal_created_at_end && timestampMicros(args.pipeline_deal_created_at_start) > timestampMicros(args.pipeline_deal_created_at_end)) {
    throw new z.ZodError([{ code: 'custom', path: ['pipeline_deal_created_at_end'], message: 'A data final deve ser posterior à inicial.' }]);
  }
  if (Object.hasOwn(tables, name) && 'offset' in args) {
    const spec = tables[name as keyof typeof tables];
    const direction = args.ascending ? 'asc' : 'desc';
    const query = new URLSearchParams({ select: spec.select, company_id: `eq.${identity.company_id}`,
      order: `${args.order_by}.${direction},id.${direction}`, limit: String(args.limit + 1), offset: String(args.offset) });
    if (args.status_filter !== undefined) query.set('status', `eq.${args.status_filter}`);
    if ('is_ia' in args && args.is_ia !== undefined) query.set('is_ia', `eq.${args.is_ia}`);
    return { path: `/rest/v1/${spec.table}?${query}`, kind: 'table', limit: args.limit, offset: args.offset };
  }
  if (name === 'get_contact_full_context_v2' && 'identifiers' in args) {
    return { path: `/rest/v1/rpc/${name}`, kind: 'rpc', body: {
      p_identifiers: args.identifiers, p_company_id: identity.company_id, p_user_id: identity.user_id,
    } };
  }
  // These two existing RPCs derive identity from the JWT; do not invent company/user arguments.
  if (name !== 'get_pipeline_deals_page_v7' && name !== 'get_pipeline_deals_totals_v7') throw new Error('Missing read adapter');
  const body = Object.fromEntries(Object.entries(args).filter(([key, value]) => key !== 'created_on' && value !== undefined).map(([key, value]) => [`p_${key}`, value]));
  const timeZone = dates.timeZone ?? DEFAULT_TIME_ZONE;
  let dateFilter: DateFilter | undefined;
  if ('created_on' in args && args.created_on !== undefined) {
    if (args.pipeline_deal_created_at_start !== undefined || args.pipeline_deal_created_at_end !== undefined) {
      throw new z.ZodError([{ code: 'custom', path: ['created_on'], message: 'Use created_on ou os instantes explícitos, nunca os dois juntos.' }]);
    }
    const range = calendarRange(args.created_on, timeZone, dates.now);
    const endInclusive = microsToUtc(timestampMicros(range.end_exclusive_utc) - 1n);
    body.p_pipeline_deal_created_at_start = range.start_utc;
    body.p_pipeline_deal_created_at_end = endInclusive;
    dateFilter = { ...range, end_inclusive_utc: endInclusive };
  }
  // Undo only the documented legacy adjustment of these two RPCs. The timezone
  // calculation above is independent: a São Paulo calendar day may have 23/25h.
  const shift = BigInt(dates.pipelineRpcDateShiftMinutes ?? DEFAULT_PIPELINE_RPC_DATE_SHIFT_MINUTES) * 60000000n;
  for (const [key, boundary] of [['p_pipeline_deal_created_at_start', 'start_utc'], ['p_pipeline_deal_created_at_end', 'end_inclusive_utc']] as const) {
    const value = body[key];
    if (typeof value === 'string') {
      dateFilter ??= { time_zone: timeZone };
      dateFilter[boundary] = utcTimestamp(value);
      body[key] = microsToUtc(timestampMicros(value) - shift);
    }
  }
  return { path: `/rest/v1/rpc/${name}`, body, kind: name === 'get_pipeline_deals_page_v7' ? 'page' : 'rpc',
    ...(dateFilter ? { date_filter: dateFilter } : {}),
    ...('limit' in args ? { limit: args.limit } : {}) };
}
