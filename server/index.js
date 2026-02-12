import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { createStripeCheckout } from './stripe.js';
import { createPayPalOrder, capturePayPalOrder } from './paypal.js';
import { loadInvoices } from './invoices.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Optional: serve built frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

// Load invoices from CSV (from project root or Downloads)
let invoices = [];
loadInvoices()
  .then((data) => {
    invoices = data;
    console.log(`Loaded ${invoices.length} invoices`);
  })
  .catch((err) => console.warn('No CSV loaded yet:', err.message));

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

// API: upload/reload CSV (send CSV text in body)
app.post('/api/invoices/upload', express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }), (req, res) => {
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
    invoices = records.map((r) => ({ ...r, id: r.id || invoices.length + 1 }));
    res.json({ count: invoices.length, message: 'Invoices updated' });
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

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../client/dist/index.html'), (err) => {
    if (err) res.status(404).send('Build the client first: npm run build');
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
