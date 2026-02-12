# Set up Supabase from your SQL exports

Use your existing **Essential Trading Invoices_rows.sql** and this app’s migration so the app reads the correct data and the dashboard shows the right total.

## 1. Create the invoices table in Supabase

In **Supabase Dashboard → SQL Editor**:

1. Run **`migrations/002_essential_trading_invoices.sql`** (creates the table `"Essential Trading Invoices"` with all columns matching your export).

## 2. Load your data

- Either run your **Essential Trading Invoices_rows.sql** in the SQL Editor (the long `INSERT INTO "public"."Essential Trading Invoices" ...` script),  
- Or use **Table Editor → Import data from CSV** if you have a CSV version of the same data.

## 3. Point the app at this table

In your app **.env** (and in Railway Variables for production):

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_INVOICES_TABLE=Essential Trading Invoices
SUPABASE_INVOICES_WIDE=true
```

Use the exact table name, including the space. Restart the app (or redeploy). The app will `SELECT *` from that table and use each row as an invoice.

## 4. Dashboard total

The dashboard **total amount owed** includes every invoice whose **payment_status** is **not** exactly `"Paid"`. So "Not yet paid", "Customer replied", "Sent", etc. all count as unpaid. Only status `Paid` is excluded. If you had seen a much lower total before, it was because "Not yet paid" was wrongly treated as paid; that’s fixed.

## Customer List

Your **Customer List_rows.sql** uses the table `"Customer List"`. The app does not read that table today; it only uses the invoices table. You can still create and use that table in Supabase for your own reference or for future features.
