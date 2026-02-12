import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

function formatAmount(val) {
  if (val == null || val === '') return '—';
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? String(val) : `$${n.toFixed(2)}`;
}

export function buildInvoiceEmailHtml(invoice, appUrl) {
  const customer = invoice.invoiced_customer_internal_use || invoice.receiver_name || invoice.customer_updated_text || 'Customer';
  const amount = formatAmount(invoice.cust_freight_charges);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice #${invoice.id}</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Invoice #${invoice.id} – ${customer}</h2>
  <p>Please find your freight invoice below. You can view details and pay online.</p>
  <p><strong>Amount due:</strong> ${amount}</p>
  <p><strong>Load #:</strong> ${invoice.essential_trading_load || '—'}</p>
  <p><strong>Reference:</strong> ${invoice.customer_ref || '—'}</p>
  <p><a href="${appUrl}" style="display: inline-block; background: #22d3ee; color: #0f0f12; padding: 10px 20px; text-decoration: none; border-radius: 8px;">View invoice & pay online</a></p>
  <p style="color: #666; font-size: 14px;">Thank you,<br>Essential Trading / Torchline Freight Group</p>
</body>
</html>`;
}

export async function sendInvoiceEmail(invoice, appUrl) {
  if (!resend) throw new Error('RESEND_API_KEY not set in .env');
  const to = invoice.email_field || invoice.email_to_send;
  if (!to || !to.includes('@')) throw new Error('No valid email for this invoice');
  const customer = invoice.invoiced_customer_internal_use || invoice.receiver_name || 'Customer';
  const subject = `Invoice #${invoice.id} – ${customer} – Payment due`;
  const html = buildInvoiceEmailHtml(invoice, appUrl);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
  });
  if (error) throw new Error(error.message || 'Resend error');
  return { id: data?.id, to, subject };
}
