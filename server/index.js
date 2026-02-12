import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { createStripeCheckout } from './stripe.js';
import { createPayPalOrder, capturePayPalOrder } from './paypal.js';
import { loadInvoices, saveInvoicesToSupabase } from './invoices.js';
import { isSupabaseConfigured } from './supabase.js';
import { getState, appendEmailLog, getNotes, addNote, getAutomations, addAutomation, updateAutomation, deleteAutomation, getElevenLabsConfigured, getElevenLabsKey, setElevenLabsKey } from './store.js';
import { sendInvoiceEmail } from './email.js';
import { runDueAutomations, setInvoicesRef, startAutomationScheduler } from './automations.js';
import { startOutboundCall } from './elevenlabs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Optional: serve built frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

// Invoices: load from Supabase if configured, else CSV; keep in memory for fast reads
let invoices = [];

async function refreshInvoices() {
  const data = await loadInvoices();
  invoices = data;
  setInvoicesRef(invoices);
  return data;
}

refreshInvoices()
  .then((data) => console.log(`Loaded ${data.length} invoices (source: ${isSupabaseConfigured() ? 'Supabase' : 'CSV'})`))
  .catch((err) => console.warn('Invoice load failed:', err.message));

startAutomationScheduler();

// API: data source (for UI to show "Connected to Supabase")
app.get('/api/invoices/source', (req, res) => {
  res.json({ source: isSupabaseConfigured() ? 'supabase' : 'csv' });
});

// API: list invoices
app.get('/api/invoices', (req, res) => {
  res.json(invoices);
});

// API: single invoice by id
app.get('/api/invoices/:id', (req, res) => {
  const id = req.params.id;
  const invoice = invoices.find((inv) => String(inv.id) === String(id));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

// API: upload CSV – try Supabase if connected; on any DB error fall back to in-memory so upload always works
app.post('/api/invoices/upload', express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }), async (req, res) => {
  try {
    const raw = req.body;
    if (raw === undefined || raw === null) {
      return res.status(400).json({ error: 'Send CSV as plain text in request body' });
    }
    const str = typeof raw === 'string' ? raw : String(raw);
    const records = parse(str, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true,
    });
    const withId = records.map((r, i) => ({ ...r, id: r.id || String(i + 1) }));

    if (isSupabaseConfigured()) {
      try {
        await saveInvoicesToSupabase(withId);
        const data = await refreshInvoices();
        return res.json({ count: data.length, message: 'Invoices synced to Supabase and reloaded', source: 'supabase' });
      } catch (dbErr) {
        // Column mismatch or other DB error: use CSV in memory only, don't block upload
        console.warn('Supabase upload failed, using CSV in memory:', dbErr.message);
        invoices = withId;
        setInvoicesRef(invoices);
        return res.json({ count: invoices.length, message: `Loaded ${invoices.length} invoices (Supabase sync skipped: ${dbErr.message})`, source: 'csv' });
      }
    }
    invoices = withId;
    setInvoicesRef(invoices);
    res.json({ count: invoices.length, message: 'Invoices updated (in-memory only)', source: 'csv' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Stripe: create checkout session
app.post('/api/create-stripe-session', async (req, res) => {
  const { invoiceId, successUrl, cancelUrl } = req.body;
  const invoice = invoices.find((inv) => String(inv.id) === String(invoiceId));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const amount = parseFloat(String(invoice.cust_freight_charges || 0).replace(/[^0-9.]/g, '')) || 0;
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount for this invoice' });
  try {
    const url = await createStripeCheckout({
      amountCents: Math.round(amount * 100),
      invoiceId: invoice.id,
      customerEmail: invoice.email_field || invoice.email_to_send,
      description: `Invoice #${invoice.id} - ${invoice.invoiced_customer_internal_use || invoice.receiver_name || 'Freight'}`,
      successUrl: successUrl || `${req.protocol}://${req.get('host')}/?paid=stripe`,
      cancelUrl: cancelUrl || `${req.protocol}://${req.get('host')}/`,
    });
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Stripe error' });
  }
});

// PayPal: create order
app.post('/api/create-paypal-order', async (req, res) => {
  const { invoiceId } = req.body;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const invoice = invoices.find((inv) => String(inv.id) === String(invoiceId));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const amount = parseFloat(String(invoice.cust_freight_charges || 0).replace(/[^0-9.]/g, '')) || 0;
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount for this invoice' });
  try {
    const { orderId, approvalUrl } = await createPayPalOrder({
      amount,
      invoiceId: invoice.id,
      description: `Invoice #${invoice.id} - ${invoice.invoiced_customer_internal_use || invoice.receiver_name || 'Freight'}`,
      returnUrl: `${baseUrl}/?paypal=return`,
      cancelUrl: `${baseUrl}/`,
    });
    res.json({ orderId, approvalUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'PayPal error' });
  }
});

// PayPal: capture order after client approval
app.post('/api/capture-paypal-order', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });
  try {
    const capture = await capturePayPalOrder(orderId);
    res.json({ success: true, details: capture });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'PayPal capture error' });
  }
});

// Payment demand letter: optional PDF sent with each invoice
const paymentDemandUrl = process.env.PAYMENT_DEMAND_LETTER_URL;
const paymentDemandPath = path.join(__dirname, 'assets', 'payment-demand.pdf');

app.get('/api/payment-demand-letter/available', (req, res) => {
  const available = !!(paymentDemandUrl || existsSync(paymentDemandPath));
  res.json({ available });
});

app.get('/api/payment-demand-letter', (req, res) => {
  if (paymentDemandUrl) {
    return res.redirect(302, paymentDemandUrl);
  }
  if (existsSync(paymentDemandPath)) {
    return res.sendFile(paymentDemandPath, {
      headers: { 'Content-Disposition': 'attachment; filename="Payment_Demand_Letter.pdf"' },
    });
  }
  res.status(404).json({ error: 'Payment demand letter not configured. Set PAYMENT_DEMAND_LETTER_URL or add server/assets/payment-demand.pdf' });
});

// Dashboard: amounts owed and activity (unpaid = status is not exactly "Paid")
app.get('/api/dashboard', (req, res) => {
  const unpaid = invoices.filter((inv) => {
    const status = (inv.payment_status || '').toLowerCase().trim();
    return status !== 'paid';
  });
  let totalOwed = 0;
  const byCustomer = {};
  unpaid.forEach((inv) => {
    const amt = parseFloat(String(inv.cust_freight_charges || 0).replace(/[^0-9.]/g, '')) || 0;
    totalOwed += amt;
    const key = inv.invoiced_customer_internal_use || inv.receiver_name || inv.customer_updated_text || inv.email_field || 'Unknown';
    if (!byCustomer[key]) byCustomer[key] = { total: 0, count: 0 };
    byCustomer[key].total += amt;
    byCustomer[key].count += 1;
  });
  const state = getState();
  const activity = (state.emailsLog || []).slice(0, 50);
  res.json({ totalOwed, byCustomer: Object.entries(byCustomer).map(([name, v]) => ({ name, ...v })), unpaidCount: unpaid.length, activity });
});

// Activity (email log)
app.get('/api/activity', (req, res) => {
  const state = getState();
  res.json(state.emailsLog || []);
});

// Notes per invoice
app.get('/api/notes/:invoiceId', async (req, res) => {
  const notes = await getNotes(req.params.invoiceId);
  res.json(notes);
});

app.post('/api/notes/:invoiceId', async (req, res) => {
  const { body, fromClient } = req.body;
  const note = await addNote(req.params.invoiceId, { body: body || req.body, fromClient: !!fromClient });
  res.json(note);
});

// Send invoice email
app.post('/api/send-invoice-email', async (req, res) => {
  const { invoiceId } = req.body;
  const invoice = invoices.find((inv) => String(inv.id) === String(invoiceId));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  try {
    const result = await sendInvoiceEmail(invoice, appUrl);
    await appendEmailLog({ invoiceId: invoice.id, to: result.to, subject: result.subject });
    res.json({ success: true, to: result.to });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to send email' });
  }
});

// Automations
app.get('/api/automations', (req, res) => {
  res.json(getAutomations());
});

app.post('/api/automations', async (req, res) => {
  const auto = await addAutomation(req.body);
  res.json(auto);
});

app.patch('/api/automations/:id', async (req, res) => {
  const updated = await updateAutomation(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

app.delete('/api/automations/:id', async (req, res) => {
  await deleteAutomation(req.params.id);
  res.json({ ok: true });
});

// Settings: ElevenLabs API key (never expose the key)
app.get('/api/settings/elevenlabs', (req, res) => {
  res.json({ configured: getElevenLabsConfigured() });
});

app.post('/api/settings/elevenlabs', async (req, res) => {
  const apiKey = req.body?.apiKey != null ? String(req.body.apiKey) : '';
  await setElevenLabsKey(apiKey);
  res.json({ ok: true });
});

// ElevenLabs: start AI outbound call to customer
app.post('/api/elevenlabs-call', async (req, res) => {
  const { invoiceId, toNumber } = req.body;
  const invoice = invoices.find((inv) => String(inv.id) === String(invoiceId));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const apiKey = getElevenLabsKey() || process.env.ELEVENLABS_API_KEY;
  try {
    const result = await startOutboundCall({
      apiKey,
      toNumber: toNumber || invoice.phone || invoice.customer_phone,
    });
    res.json({ success: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || 'Failed to start call' });
  }
});

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../client/dist/index.html'), (err) => {
    if (err) res.status(404).send('Build the client first: npm run build');
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
