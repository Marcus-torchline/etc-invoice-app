import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CSV_PATHS = [
  path.join(__dirname, '../data/invoices.csv'),
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'Essential Trading Invoices_rows.csv'),
  path.join(__dirname, '..', 'Essential Trading Invoices_rows.csv'),
];

export async function loadInvoices() {
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
