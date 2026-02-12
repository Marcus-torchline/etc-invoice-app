import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

/** Supabase client when SUPABASE_URL and key are set; otherwise null. */
export const supabase = url && key ? createClient(url, key) : null;

/** Table name for invoices (default: invoices). Set SUPABASE_INVOICES_TABLE if yours is different. */
export const invoicesTable = () => process.env.SUPABASE_INVOICES_TABLE?.trim() || 'invoices';

/** True if your table has one column per field (wide), not id + data jsonb. */
export const isWideTable = () => process.env.SUPABASE_INVOICES_WIDE === 'true' || process.env.SUPABASE_INVOICES_WIDE === '1';

export function isSupabaseConfigured() {
  return !!supabase;
}
