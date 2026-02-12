import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, isSupabaseConfigured, invoicesTable, isWideTable } from './supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CSV_PATHS = [
  path.join(__dirname, '../data/invoices.csv'),
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'Essential Trading Invoices_rows.csv'),
  path.join(__dirname, '..', 'Essential Trading Invoices_rows.csv'),
];

/**
 * Load invoices from Supabase.
 * - Wide table (SUPABASE_INVOICES_WIDE=true): select * → each row is the invoice (columns match CSV).
 * - Default: select id, data → { id, ...data } (table has id + data jsonb).
 */
async function loadFromSupabase() {
  if (!supabase) return null;
  const table = invoicesTable();
  const wide = isWideTable();
  const select = wide ? '*' : 'id, data';
  const { data: rows, error } = await supabase
    .from(table)
    .select(select)
    .order('id');
  if (error) {
    console.warn('Supabase load error:', error.message);
    return null;
  }
  if (!rows?.length) return [];
  if (wide) {
    return rows.map((r) => ({ ...r, id: r.id != null ? String(r.id) : '' }));
  }
  return rows.map((r) => ({ id: r.id, ...(r.data || {}) }));
}

/**
 * Load invoices from CSV files (existing behavior).
 */
async function loadFromCsv() {
  for (const csvPath of CSV_PATHS) {
    try {
      const raw = await readFile(csvPath, 'utf-8');
      const records = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
        trim: true,
      });
      return records.map((r, i) => ({ ...r, id: r.id || String(i + 1) }));
    } catch {
      continue;
    }
  }
  return [];
}

/**
 * Load invoices: Supabase if configured, otherwise CSV.
 */
export async function loadInvoices() {
  if (isSupabaseConfigured()) {
    const data = await loadFromSupabase();
    if (data !== null) return data;
  }
  return loadFromCsv();
}

/**
 * Normalize invoice for storage: ensure id and flatten to { id, ...rest } with rest as data.
 */
function normalizeForStorage(record) {
  const id = String(record.id ?? record.essential_trading_load ?? '').trim() || null;
  if (!id) return null;
  const { id: _id, ...rest } = record;
  return { id, data: rest };
}

/**
 * Upsert invoices into Supabase. Used when CSV is uploaded so data stays in sync.
 * - Wide table: upsert full rows (id + all columns).
 * - Default: upsert id + data jsonb.
 */
export async function saveInvoicesToSupabase(records) {
  if (!supabase) throw new Error('Supabase not configured');
  const table = invoicesTable();
  const wide = isWideTable();

  if (wide) {
    const rows = records.map((r, i) => ({ ...r, id: r.id || String(i + 1) })).filter((r) => r.id);
    if (!rows.length) return { count: 0 };
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(error.message);
    return { count: rows.length };
  }

  const rows = records
    .map((r, i) => normalizeForStorage({ ...r, id: r.id || String(i + 1) }))
    .filter(Boolean);
  if (!rows.length) return { count: 0 };
  const { error } = await supabase.from(table).upsert(
    rows.map((r) => ({
      id: r.id,
      data: r.data,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
  return { count: rows.length };
}
