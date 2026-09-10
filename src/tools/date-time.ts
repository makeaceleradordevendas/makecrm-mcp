import { z } from 'zod';

export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';
// Compatibility with the two v7 pipeline RPC definitions supplied on 2026-09-10:
// v_created_at_start/end := p_pipeline_deal_created_at_start/end + interval '3 hours'.
export const DEFAULT_PIPELINE_RPC_DATE_SHIFT_MINUTES = 180;
export const timestampSchema = z.string().datetime({ offset: true }).refine(value =>
  Number.isFinite(Date.parse(value)) && (value.match(/\.(\d+)/)?.[1]?.length ?? 0) <= 6,
{ message: 'Informe um instante ISO 8601 com fuso e até seis casas decimais.' });
export const calendarDaySchema = z.string().date();
export const createdOnSchema = z.union([calendarDaySchema, z.enum(['today', 'yesterday'])])
  .describe('Dia de criação: YYYY-MM-DD, today (hoje) ou yesterday (ontem). O MCP calcula o intervalo no fuso configurado; não calcule offsets manualmente. Não combine com created_at_start/end.');

export function timestampMicros(value: string): bigint {
  const valid = timestampSchema.parse(value);
  const fraction = valid.match(/\.(\d+)/)?.[1] ?? '';
  return BigInt(Math.floor(Date.parse(valid) / 1000)) * 1000000n + BigInt(fraction.padEnd(6, '0'));
}
export function utcTimestamp(value: string): string {
  const valid = timestampSchema.parse(value);
  const fraction = valid.match(/\.(\d+)/)?.[1];
  // Date has millisecond precision; preserve the original fractional seconds separately.
  return new Date(Date.parse(valid)).toISOString().slice(0, 19) + (fraction ? `.${fraction}` : '') + 'Z';
}
export function microsToUtc(micros: bigint): string {
  const fraction = ((micros % 1000000n) + 1000000n) % 1000000n;
  const seconds = (micros - fraction) / 1000000n;
  return `${new Date(Number(seconds) * 1000).toISOString().slice(0, 19)}.${String(fraction).padStart(6, '0')}Z`;
}

export function validTimeZone(value: string): boolean {
  if (value !== 'UTC' && !value.includes('/')) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(0); return true; } catch { return false; }
}
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let result = formatters.get(timeZone);
  if (!result) {
    if (!validTimeZone(timeZone)) throw new Error('Invalid IANA time zone');
    result = new Intl.DateTimeFormat('en-CA', { timeZone, calendar: 'iso8601', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit' });
    if (formatters.size >= 16) formatters.clear();
    formatters.set(timeZone, result);
  }
  return result;
}
function localDay(epoch: number, fmt: Intl.DateTimeFormat): string {
  const parts = fmt.formatToParts(epoch);
  const get = (name: string) => parts.find(part => part.type === name)!.value;
  return `${get('year').padStart(4, '0')}-${get('month')}-${get('day')}`;
}
function shiftedDay(day: string, shift: number): string {
  const value = new Date(`${calendarDaySchema.parse(day)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + shift);
  return calendarDaySchema.parse(value.toISOString().slice(0, 10));
}
const dayStarts = new Map<string, number>();
function startOfDay(day: string, timeZone: string, fmt: Intl.DateTimeFormat): number {
  const key = `${timeZone}:${day}`;
  const cached = dayStarts.get(key);
  if (cached !== undefined) return cached;
  const utcMidnight = Date.parse(`${calendarDaySchema.parse(day)}T00:00:00Z`);
  let low = utcMidnight - 36 * 3600000;
  let high = utcMidnight + 36 * 3600000;
  // Find the first real instant of the calendar day. This also handles a local
  // midnight skipped by DST (e.g. São Paulo 2018-11-04 starts at 01:00).
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (localDay(middle, fmt) < day) low = middle + 1;
    else high = middle;
  }
  if (localDay(low, fmt) !== day) throw new z.ZodError([{ code: 'custom', path: ['created_on'], message: 'Este dia não existe no fuso configurado.' }]);
  if (dayStarts.size >= 512) dayStarts.clear();
  dayStarts.set(key, low);
  return low;
}
export type CalendarRange = { time_zone: string; local_date: string; start_utc: string; end_exclusive_utc: string };
export function calendarRange(input: string, timeZone = DEFAULT_TIME_ZONE, now = new Date()): CalendarRange {
  const selected = createdOnSchema.parse(input);
  const fmt = formatter(timeZone);
  const today = localDay(now.getTime(), fmt);
  const day = selected === 'today' ? today : selected === 'yesterday' ? shiftedDay(today, -1) : selected;
  return { time_zone: timeZone, local_date: day,
    start_utc: new Date(startOfDay(day, timeZone, fmt)).toISOString(),
    end_exclusive_utc: new Date(startOfDay(shiftedDay(day, 1), timeZone, fmt)).toISOString() };
}
