# Essential Trading Invoice App

Invoice generator and payment app built from your Essential Trading Invoices CSV. View invoices, generate/print them, and collect payments via **Stripe** and **PayPal**.

## Features

- **Data source**: **Supabase** (recommended) – connect once, data stays in sync with no disconnection; or **CSV** (upload or file on disk)
- **Load invoices** from Supabase when configured, else from CSV: upload a CSV in the app, or place `Essential Trading Invoices_rows.csv` in `data/` or Downloads
- **All CSV columns** shown: list includes **BOL/POD** link; detail and print use two tables – **Invoice & shipment** and **Payment & documents** – so every column (POD links, Wise link, PDF attachment, etc.) is visible
- **List** by customer, amount, status, BOL/POD
- **Invoice detail** panel with full freight and customer info (all columns)
- **Generate / Print invoice** – print-friendly view; use “Print / Save as PDF” in the browser
- **Pay with Stripe** – redirects to Stripe Checkout, then back to your success URL
- **Pay with PayPal** – redirects to PayPal to approve and pay; capture is completed on return
- **Payment demand letter** – optional PDF (e.g. your template) attached to each invoice; download link shown when configured
- **Dashboard** – total amount owed, breakdown by customer, recent email activity
- **Send invoice email** – one-click send via Resend (invoice summary + pay link)
- **Notes per invoice** – log internal notes or “message from client” for each invoice
- **Automations** – “Every N days” reminder until paid; “Burst” (e.g. send 10 emails in a row at an interval) for aggressive follow-up

## Setup

### 1. Install dependencies

```bash
cd invoice-app
npm install
cd client && npm install && cd ..
```

### 2. Data source: Supabase (recommended) or CSV

**Option A – Supabase (stays connected)**

Use your **existing** Supabase project and table—no new project or migration required.

1. In your Supabase Dashboard → **Project Settings → API**, copy your **Project URL** and **service_role** key (or anon key).
2. In your app `.env` (see step 3 below), set:
   - `SUPABASE_URL=https://xxxxx.supabase.co`
   - `SUPABASE_SERVICE_KEY=eyJ...`
3. **Table shape:**
   - If your table already has **one column per field** (e.g. `id`, `essential_trading_load`, `pick_up_date`, `cust_freight_charges`, … like your CSV), set **`SUPABASE_INVOICES_WIDE=true`** in `.env`. The app will `SELECT *` and use each row as an invoice.
   - If your table has **`id` + `data` (JSONB)** only, leave that unset (or use the migration in `supabase/migrations/001_invoices.sql` to create that shape).
4. If the table name isn’t `invoices`, set **`SUPABASE_INVOICES_TABLE=your_table_name`**.
5. Restart the app. It will load invoices from your existing table. The header shows a **Supabase** badge when connected.

**Option B – CSV only**

- Copy `Essential Trading Invoices_rows.csv` into `invoice-app/data/invoices.csv`, or leave it in your **Downloads** folder as `Essential Trading Invoices_rows.csv`. The server loads it on startup. No Supabase env vars needed.

### 3. Environment variables

Copy the example env file and add your keys:

```bash
cp .env.example .env
```

Edit `.env`:

- **Stripe**: Get [API keys](https://dashboard.stripe.com/apikeys) (use test keys for dev). Set `STRIPE_SECRET_KEY=sk_test_...`.
- **PayPal**: Create a [Sandbox app](https://developer.paypal.com/dashboard/applications/sandbox) and set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. For live payments set `PAYPAL_SANDBOX=false` and use live credentials.
- **Payment demand letter** (optional): Export your Word template to PDF, then either (a) put `payment-demand.pdf` in `server/assets/`, or (b) upload the PDF to Google Drive, set sharing to “Anyone with the link,” and set `PAYMENT_DEMAND_LETTER_URL` to the link (use the “direct download” style link if you want the browser to download instead of open in Drive).
- **Resend (email)**: Sign up at [resend.com](https://resend.com), create an API key, and set `RESEND_API_KEY`. Set `RESEND_FROM_EMAIL` to a verified sender (e.g. `invoices@yourdomain.com`). For local testing you can use Resend’s sandbox domain.
- **APP_URL** (optional): Set to your public app URL (e.g. `https://your-app.railway.app`) so invoice and automation emails contain the correct pay link. If unset, the server uses the request host.
- **Supabase** (optional): `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` – when set, invoices load from the `invoices` table and CSV upload syncs into Supabase.

### 4. Run the app

**Development** (API on :5000, frontend on :3000 with proxy):

```bash
npm run dev
```

- Backend: http://localhost:5000  
- Frontend: http://localhost:3000 (proxies `/api` to the backend)

**Production** (single server, serve built frontend):

```bash
npm run build
npm start
```

Open http://localhost:5000

## Deploy to Railway

1. Push this repo to **GitHub** (if you haven’t already).
2. Go to [railway.app](https://railway.app) and sign in.
3. **New Project** → **Deploy from GitHub repo** → choose the repo (or the folder that contains `invoice-app`; if the app is in a subfolder, set **Root Directory** to `invoice-app`).
4. Railway will detect Node and use:
   - **Build command**: `npm run build` (installs client deps and builds the frontend)
   - **Start command**: `npm start`
   If not, set them in the service **Settings**.
5. In the service → **Variables**, add:
   - `STRIPE_SECRET_KEY` (Stripe dashboard → API keys)
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` (PayPal Developer → Apps)
   - Optionally `PAYPAL_SANDBOX=false` for live PayPal
   - `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for sending invoice emails
   - `APP_URL` = your Railway public URL (e.g. `https://your-app.railway.app`) so email links work
6. **Settings** → **Networking** → **Generate Domain** to get a public URL.
7. After deploy, open the app and **Upload CSV** to load your invoices (the server starts with no data until you upload or add a CSV in the repo).

**Optional – deploy from CLI:** From the `invoice-app` folder run `npx @railway/cli login` (once), then `npx @railway/cli init` or `npx @railway/cli link` to link the project, and `npx @railway/cli up` to deploy. Set variables in the Railway dashboard or with `railway variables set KEY=value`.

## Deploy to Vercel (frontend only)

To host only the **frontend** on Vercel and keep the API on Railway:

1. Deploy the full app to **Railway** (steps above) and note the public URL (e.g. `https://your-app.railway.app`).
2. In the **client** folder, create `.env.production` with:
   ```
   VITE_API_URL=https://your-app.railway.app
   ```
3. In Vercel: New Project → Import the repo → set **Root Directory** to `invoice-app/client`, **Build Command** to `npm run build`, **Output Directory** to `dist`.
4. Add the env var `VITE_API_URL` in Vercel (same value as above).
5. Update the frontend to use `VITE_API_URL` for API calls (see below).

The app currently uses relative `/api` URLs, so it works when frontend and backend are on the same origin (e.g. both on Railway). For a split deploy (Vercel + Railway), the client would need to call `import.meta.env.VITE_API_URL + '/api/...'` instead of `/api/...`. You can add that and set `VITE_API_URL` only when deploying to Vercel.

## API

- `GET /api/invoices` – list all invoices
- `GET /api/invoices/source` – `{ source: 'supabase' | 'csv' }` (for UI badge)
- `GET /api/invoices/:id` – single invoice
- `POST /api/invoices/upload` – body: raw CSV text; when Supabase is configured, upserts into DB and reloads; otherwise in-memory only
- `POST /api/create-stripe-session` – body: `{ invoiceId, successUrl?, cancelUrl? }` → `{ url }`
- `POST /api/create-paypal-order` – body: `{ invoiceId }` → `{ orderId, approvalUrl }`
- `POST /api/capture-paypal-order` – body: `{ orderId }` → capture after customer approval
- `GET /api/payment-demand-letter/available` – returns `{ available: boolean }` (true if PDF or URL is configured)
- `GET /api/payment-demand-letter` – redirects to `PAYMENT_DEMAND_LETTER_URL` or serves `server/assets/payment-demand.pdf`
- `GET /api/dashboard` – returns `{ totalOwed, byCustomer, unpaidCount, activity }`
- `GET /api/activity` – returns recent email log
- `GET /api/notes/:invoiceId` – list notes for an invoice
- `POST /api/notes/:invoiceId` – add note (body: `{ body, fromClient? }`)
- `POST /api/send-invoice-email` – body: `{ invoiceId }` → send invoice email via Resend
- `GET /api/automations` – list automations
- `POST /api/automations` – add (body: `{ invoiceId, type: 'every_2_days'|'burst', intervalDays?, burstTotal?, intervalHours? }`)
- `PATCH /api/automations/:id` – update (e.g. `{ enabled: false }`)
- `DELETE /api/automations/:id` – remove

## Data source

The app supports **Supabase** as the primary data source. When `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set, it loads invoices from the `invoices` table and keeps them in sync; **Upload CSV** then upserts into Supabase so you can seed or re-import without disconnecting. Without Supabase, the app falls back to CSV (upload or file on disk).

## Tech

- **Backend**: Node, Express, `csv-parse`, Stripe SDK, PayPal Checkout Server SDK
- **Frontend**: React 18, Vite
