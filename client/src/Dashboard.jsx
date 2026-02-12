import React, { useState, useEffect } from 'react';

const API = '/api';

function formatAmount(n) {
  return typeof n === 'number' && !isNaN(n) ? `$${n.toFixed(2)}` : '—';
}

export function Dashboard({ invoices, onSelectInvoice }) {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard`).then((r) => r.json()),
      fetch(`${API}/activity`).then((r) => r.json()),
    ])
      .then(([d, a]) => {
        setData(d);
        setActivity(a);
      })
      .catch(() => setData({ totalOwed: 0, byCustomer: [], unpaidCount: 0, activity: [] }))
      .finally(() => setLoading(false));
  }, [invoices?.length]);

  if (loading || !data) return <div className="dashboard"><p className="loading">Loading dashboard…</p></div>;

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <p className="dashboard-intro">Summary of unpaid invoices. Only invoices with payment status <strong>Paid</strong> are excluded from the total.</p>

      <div className="dashboard-cards">
        <div className="card card-owed">
          <div className="card-label">Total amount owed</div>
          <div className="card-value">{formatAmount(data.totalOwed)}</div>
          <div className="card-meta">{data.unpaidCount} unpaid invoice{data.unpaidCount !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {data.byCustomer && data.byCustomer.length > 0 && (
        <section className="dashboard-section">
          <h3>Amount owed by customer</h3>
          <p className="muted small">Breakdown of unpaid totals per customer. Use Invoices to open individual invoices.</p>
          <div className="table-wrap">
            <table className="invoice-table dashboard-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Invoices</th>
                  <th className="num">Total owed</th>
                </tr>
              </thead>
              <tbody>
                {data.byCustomer.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.count}</td>
                    <td className="num">{formatAmount(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h3>Recent activity (emails sent)</h3>
        {activity.length === 0 ? (
          <p className="muted">No emails sent yet. Use “Send invoice email” on an invoice.</p>
        ) : (
          <ul className="activity-list">
            {activity.slice(0, 20).map((entry) => (
              <li key={entry.id} className="activity-item">
                <span className="activity-time">{entry.at ? new Date(entry.at).toLocaleString() : ''}</span>
                <span className="activity-detail">Invoice #{entry.invoiceId} → {entry.to}</span>
                {entry.subject && <span className="activity-subject">{entry.subject}</span>}
                {onSelectInvoice && (
                  <button type="button" className="link-btn" onClick={() => onSelectInvoice(entry.invoiceId)}>Open</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
