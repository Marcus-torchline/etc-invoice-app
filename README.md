# Essential Trading Invoice App

Invoice generator and payment app built from your Essential Trading Invoices CSV. View invoices, generate/print them, and collect payments via **Stripe** and **PayPal**.

## Features

- **Load invoices** from CSV: **upload a CSV** in the app, or place `Essential Trading Invoices_rows.csv` in `data/` or Downloads
- **List and search** by customer, amount, status
- **Invoice detail** panel with full freight and customer info
- **Generate / Print invoice** – print-friendly view; use “Print / Save as PDF” in the browser
- **Pay with Stripe** – redirects to Stripe Checkout, then back to your success URL
- **Pay with PayPal** – redirects to PayPal to approve and pay; capture is completed on return

## Setup

### 1. Install dependencies

```bash
cd invoice-app
npm install
cd client && npm install && cd ..
```

### 2. Add your CSV

- Copy `Essential Trading Invoices_rows.csv` into `invoice-app/data/invoices.csv`, **or**
- Leave it in your **Downloads** folder as `Essential Trading Invoices_rows.csv` – the server will load it from there.

### 3. Environment variables

Copy the example env file and add your keys:

```bash
cp .env.example .env
```

Edit `.env`:

- **Stripe**: Get [API keys](https://dashboard.stripe.com/apikeys) (use test keys for dev). Set `STRIPE_SECRET_KEY=sk_test_...`.
- **PayPal**: Create a [Sandbox app](https://developer.paypal.com/dashboard/applications/sandbox) and set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. For live payments set `PAYPAL_SANDBOX=false` and use live credentials.

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
- `GET /api/invoices/:id` – single invoice
- `POST /api/invoices/upload` – body: raw CSV text (Content-Type: `text/csv` or `text/plain`) to replace in-memory invoices
- `POST /api/create-stripe-session` – body: `{ invoiceId, successUrl?, cancelUrl? }` → `{ url }`
- `POST /api/create-paypal-order` – body: `{ invoiceId }` → `{ orderId, approvalUrl }`
- `POST /api/capture-paypal-order` – body: `{ orderId }` → capture after customer approval

## Tech

- **Backend**: Node, Express, `csv-parse`, Stripe SDK, PayPal Checkout Server SDK
- **Frontend**: React 18, Vite
