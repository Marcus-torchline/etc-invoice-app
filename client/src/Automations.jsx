import React, { useState, useEffect } from 'react';

const API = '/api';

export function Automations({ invoices, onSelectInvoice }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ invoiceId: '', type: 'every_2_days', intervalDays: 2, burstTotal: 10, intervalHours: 1 });

  const load = () => fetch(`${API}/automations`).then((r) => r.json()).then(setList).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.invoiceId) return;
    setAdding(true);
    fetch(`${API}/automations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: form.invoiceId,
        type: form.type,
        intervalDays: form.type === 'every_2_days' ? Number(form.intervalDays) || 2 : undefined,
        burstTotal: form.type === 'burst' ? Number(form.burstTotal) || 10 : undefined,
        intervalHours: form.type === 'burst' ? Number(form.intervalHours) || 1 : undefined,
      }),
    })
      .then((r) => r.json())
      .then(() => { setForm({ ...form, invoiceId: '' }); load(); })
      .catch(console.error)
      .finally(() => setAdding(false));
  };

  const toggleEnabled = (id, enabled) => {
    fetch(`${API}/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
      .then((r) => r.json())
      .then(load)
      .catch(console.error);
  };

  const remove = (id) => {
    if (!confirm('Remove this automation?')) return;
    fetch(`${API}/automations/${id}`, { method: 'DELETE' }).then(load).catch(console.error);
  };

  const unpaid = invoices.filter((inv) => !(inv.payment_status || '').toLowerCase().includes('paid'));

  return (
    <div className="automations-panel">
      <h2>Automations</h2>
      <p className="muted small">Send reminder emails automatically. “Every N days” runs until paid. “Burst” sends a set number of emails at an interval.</p>

      <form className="automation-form" onSubmit={handleAdd}>
        <label>
          Invoice
          <select
            value={form.invoiceId}
            onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
            required
          >
            <option value="">Select invoice</option>
            {unpaid.map((inv) => (
              <option key={inv.id} value={inv.id}>
                #{inv.id} – {inv.invoiced_customer_internal_use || inv.receiver_name || '—'} – ${parseFloat(String(inv.cust_freight_charges || 0).replace(/[^0-9.]/g, '')) || 0}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="every_2_days">Every N days (until paid)</option>
            <option value="burst">Burst (send N times in a row)</option>
          </select>
        </label>
        {form.type === 'every_2_days' && (
          <label>
            Interval (days)
            <input type="number" min={1} value={form.intervalDays} onChange={(e) => setForm({ ...form, intervalDays: e.target.value })} />
          </label>
        )}
        {form.type === 'burst' && (
          <>
            <label>
              How many emails
              <input type="number" min={1} max={20} value={form.burstTotal} onChange={(e) => setForm({ ...form, burstTotal: e.target.value })} />
            </label>
            <label>
              Interval (hours between each)
              <input type="number" min={1} value={form.intervalHours} onChange={(e) => setForm({ ...form, intervalHours: e.target.value })} />
            </label>
          </>
        )}
        <button type="submit" className="btn btn-primary" disabled={adding || !form.invoiceId}>
          {adding ? 'Adding…' : 'Add automation'}
        </button>
      </form>

      <h3>Active automations</h3>
      {loading ? <p className="muted">Loading…</p> : list.length === 0 ? (
        <p className="muted">None yet. Add one above.</p>
      ) : (
        <ul className="automation-list">
          {list.map((a) => {
            const inv = invoices.find((i) => String(i.id) === a.invoiceId);
            return (
              <li key={a.id} className="automation-item">
                <div>
                  <strong>Invoice #{a.invoiceId}</strong> {inv ? ` – ${inv.invoiced_customer_internal_use || inv.receiver_name || ''}` : ''}
                </div>
                <div className="automation-meta">
                  {a.type === 'every_2_days' ? `Every ${a.intervalDays} days` : `Burst: ${a.count || 0}/${a.burstTotal} sent, every ${a.intervalHours}h`}
                  {a.lastRun && ` · Last: ${new Date(a.lastRun).toLocaleString()}`}
                </div>
                <div className="automation-actions">
                  <button type="button" className="link-btn" onClick={() => toggleEnabled(a.id, !a.enabled)}>
                    {a.enabled ? 'Pause' : 'Resume'}
                  </button>
                  {onSelectInvoice && <button type="button" className="link-btn" onClick={() => onSelectInvoice(a.invoiceId)}>Open</button>}
                  <button type="button" className="link-btn danger" onClick={() => remove(a.id)}>Remove</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
