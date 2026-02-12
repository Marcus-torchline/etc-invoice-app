import { getState, updateAutomation, appendEmailLog } from './store.js';
import { sendInvoiceEmail } from './email.js';

let invoicesRef = [];
export function setInvoicesRef(ref) {
  invoicesRef = ref;
}

function getAppUrl() {
  return process.env.APP_URL || 'http://localhost:3000';
}

export async function runDueAutomations() {
  const state = getState();
  const now = new Date();
  const invoices = invoicesRef;

  for (const auto of state.automations) {
    if (!auto.enabled) continue;
    const nextRun = auto.nextRun ? new Date(auto.nextRun) : null;
    if (!nextRun || nextRun > now) continue;

    const invoice = invoices.find((inv) => String(inv.id) === auto.invoiceId);
    if (!invoice) {
      await updateAutomation(auto.id, { enabled: false });
      continue;
    }

    const paid = (invoice.payment_status || '').toLowerCase().includes('paid');
    if (paid) {
      await updateAutomation(auto.id, { enabled: false });
      continue;
    }

    const to = invoice.email_field || invoice.email_to_send;
    if (!to || !to.includes('@')) {
      await updateAutomation(auto.id, { nextRun: null, enabled: false });
      continue;
    }

    try {
      await sendInvoiceEmail(invoice, getAppUrl());
      await appendEmailLog({ invoiceId: auto.invoiceId, to, subject: `Invoice #${auto.invoiceId} (reminder)`, automationId: auto.id });
    } catch (err) {
      console.error('Automation send failed:', auto.id, err.message);
      await updateAutomation(auto.id, { nextRun: new Date(now.getTime() + 60 * 60 * 1000).toISOString() });
      continue;
    }

    const count = (auto.count || 0) + 1;

    if (auto.type === 'every_2_days') {
      const intervalMs = (auto.intervalDays || 2) * 24 * 60 * 60 * 1000;
      await updateAutomation(auto.id, { lastRun: now.toISOString(), nextRun: new Date(now.getTime() + intervalMs).toISOString(), count });
    } else if (auto.type === 'burst') {
      const total = auto.burstTotal || 10;
      if (count >= total) {
        await updateAutomation(auto.id, { lastRun: now.toISOString(), nextRun: null, count, enabled: false });
      } else {
        const intervalMs = (auto.intervalHours || 1) * 60 * 60 * 1000;
        await updateAutomation(auto.id, { lastRun: now.toISOString(), nextRun: new Date(now.getTime() + intervalMs).toISOString(), count });
      }
    }
  }
}

let intervalId;
export function startAutomationScheduler() {
  if (intervalId) return;
  intervalId = setInterval(() => runDueAutomations(), 60 * 1000);
  runDueAutomations();
}
