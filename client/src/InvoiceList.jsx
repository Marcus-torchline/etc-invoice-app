import React from 'react';

function formatAmount(val) {
  if (val == null || val === '') return '—';
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? String(val) : `$${n.toFixed(2)}`;
}

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString();
}

export function InvoiceList({ invoices, selectedId, onSelect }) {
  if (!invoices.length) {
    return (
      <section className="section">
        <p className="muted">No invoices loaded. Add a CSV to <code>data/invoices.csv</code> or your Downloads folder.</p>
      </section>
    );
  }

  return (
    <section className="section list-section">
      <h2>Invoices ({invoices.length})</h2>
      <div className="table-wrap">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Load #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>BOL/POD</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const podUrl = inv.actual_pod_that_link_goes_to || inv.pod_link;
              return (
                <tr
                  key={inv.id}
                  className={selectedId === String(inv.id) ? 'selected' : ''}
                  onClick={() => onSelect(inv.id)}
                >
                  <td>{inv.id}</td>
                  <td>{inv.essential_trading_load || '—'}</td>
                  <td>{formatDate(inv.pick_up_date)}</td>
                  <td>{inv.invoiced_customer_internal_use || inv.receiver_name || inv.customer_updated_text || '—'}</td>
                  <td>{formatAmount(inv.cust_freight_charges)}</td>
                  <td>
                    {podUrl ? (
                      <a href={podUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="link-pod">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={`status status-${(inv.payment_status || '').toLowerCase().replace(/\s/g, '-')}`}>
                      {inv.payment_status || '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
