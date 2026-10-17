import { logger } from './logger';

export function requireDatabaseResult(error: unknown, context: string): void {
  if (error) {
    logger.error(context, error);
    throw new Error('Catalog operation unavailable. Please try again.');
  }
}

export function catalogPage(page = 1, limit = 20) {
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1) {
    throw new Error('Invalid pagination.');
  }
  limit = Math.min(limit, 100);
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
}

export function catalogSearch(value: string): string {
  return value.trim().replace(/[(),.%_*\\]/g, ' ').slice(0, 200);
}

export function isCatalogId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

type PageQuery<T> = PromiseLike<{ data: T[] | null; error: unknown }>;
/** Bounded ID batches avoid long REST URLs and default row truncation. */
export async function readCatalogRowsByIds<T>(ids: string[], query: (batch: string[], from: number, to: number) => PageQuery<T>): Promise<T[]> {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100));
  const rows: T[] = [];
  for (let i = 0; i < batches.length; i += 5) {
    const results = await Promise.all(batches.slice(i, i + 5).map(batch => readCatalogRows((from, to) => query(batch, from, to))));
    rows.push(...results.flat());
  }
  return rows;
}
export async function readCatalogRows<T>(query: (from: number, to: number) => PageQuery<T>, maximum = 100000): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < maximum; offset += 200) {
    const { data, error } = await query(offset, offset + 199);
    requireDatabaseResult(error, 'Catalog batch read');
    if (!Array.isArray(data)) throw new Error('Catalog returned an invalid result.');
    rows.push(...data);
    if (data.length < 200) return rows;
  }
  throw new Error('Catalog inspection limit exceeded; narrow the query.');
}
