# Why don't I see Dashboard, Resend, Settings, or Notes?

The code for these features is in this repo. If you don't see them, it's usually one of these:

## 1. You're running the wrong app or old build

- **Local:** Open the project folder **`invoice-app`** (where this file lives). In a terminal:
  ```bash
  cd path/to/invoice-app
  npm run dev
  ```
  Then open **http://localhost:3000**. You should see four nav buttons: **Dashboard**, **Invoices**, **Automations**, **Settings**. Click **Dashboard** to see the dashboard; click an invoice to see **Send invoice email** and the **Notes** section (the “chat” area).

- **Production (e.g. Railway):** The live site only updates after you **push your latest code to GitHub** and Railway **re-deploys**. If you haven’t pushed since these features were added, the deployed app is still the old version.

## 2. Push and redeploy so the live site gets the new UI

1. In `invoice-app`, commit and push to GitHub:
   ```bash
   cd path/to/invoice-app
   git add -A
   git status
   git commit -m "Add Dashboard, Automations, Settings, Resend, Notes"
   git push origin main
   ```
2. In **Railway**, trigger a new deploy (or wait for auto-deploy). After the build finishes, open your app URL. You should see the same four nav buttons and features.

## 3. Build the frontend before running in “production” mode

If you run `npm start` (without `npm run dev`), the server serves the built frontend from `client/dist`. If you never built, that folder may be missing or old:

```bash
cd path/to/invoice-app
npm run build
npm start
```

Then open http://localhost:5000. You should see the full UI including Dashboard, Resend, and Notes.

## 4. Where each feature lives in the UI

| Feature | Where to find it |
|--------|-------------------|
| **Dashboard** | Top nav → **Dashboard** (amount owed, by customer, recent activity) |
| **Send invoice email (Resend)** | **Invoices** → click one invoice → **Send invoice email** button (needs `RESEND_API_KEY` in .env) |
| **Notes / “chat”** | **Invoices** → click one invoice → scroll down to **Notes** (add note, mark “Message from client”) |
| **Automations** | Top nav → **Automations** (reminder every N days, burst emails) |
| **Settings** | Top nav → **Settings** (ElevenLabs API key, etc.) |

If you run `npm run dev` from `invoice-app` and still don’t see the four nav buttons, say what you do see (e.g. a different app, or only “Invoices”) and we can narrow it down.
