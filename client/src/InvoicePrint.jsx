import React, { useEffect } from 'react';

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

export function InvoicePrint({ invoice, onClose }) {
  useEffect(() => {
    const title = document.title;
    document.title = `Invoice #${invoice.id} - Essential Trading`;
    return () => { document.title = title; };
  }, [invoice.id]);

  const handlePrint = () => window.print();

  return (
    <div className="print-view">
      <div className="print-toolbar no-print">
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          Print / Save as PDF
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Back to list
        </button>
      </div>

      <div className="invoice-document">
        <header className="inv-header">
          <h1>INVOICE</h1>
          <div className="inv-brand">Essential Trading / Torchline Freight Group</div>
        </header>

        <div className="inv-meta">
          <div>
            <strong>Invoice #</strong> {invoice.id}
          </div>
          <div>
            <strong>Load #</strong> {invoice.essential_trading_load || '—'}
          </div>
          <div>
            <strong>Date</strong> {formatDate(invoice.pick_up_date)}
          </div>
        </div>

        <div className="inv-parties">
          <div className="inv-block">
            <div className="inv-block-label">From / Shipper</div>
            <div className="inv-block-name">{invoice.shipper_name || '—'}</div>
            <div>{invoice.shipper_address}</div>
            <div>{invoice.shipper_city_state}</div>
          </div>
          <div className="inv-block">
            <div className="inv-block-label">Bill To</div>
            <div className="inv-block-name">{invoice.invoiced_customer_internal_use || invoice.receiver_name || '—'}</div>
            <div>{invoice.receiver_address || invoice.street_adress_from_customer_updated_text}</div>
            <div>{invoice.receiver_city_state || invoice.city_state_zip_from_customer_updated_text}</div>
            {(invoice.email_field || invoice.email_to_send) && (
              <div>{invoice.email_field || invoice.email_to_send}</div>
            )}
          </div>
        </div>

        <table className="inv-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Ref</th>
              <th>Weight</th>
              <th>Cubes</th>
              <th>Pieces</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Freight – {invoice.invoiced_to || 'Receiver'} – Load #{invoice.essential_trading_load || invoice.id}
              </td>
              <td>{invoice.customer_ref || '—'}</td>
              <td>{invoice.weight_lbs ?? '—'}</td>
              <td>{invoice.cubes ?? '—'}</td>
              <td>{invoice.pieces ?? '—'}</td>
              <td className="num">{formatAmount(invoice.cust_freight_charges)}</td>
            </tr>
          </tbody>
        </table>

        <div className="inv-total">
          <span>Total</span>
          <span>{formatAmount(invoice.cust_freight_charges)}</span>
        </div>

        {invoice.notes && (
          <div className="inv-notes">
            <strong>Notes</strong>: {invoice.notes}
          </div>
        )}

        <footer className="inv-footer">
          Thank you for your business. Pay via Stripe or PayPal from the app, or use your existing payment link.
        </footer>
      </div>
    </div>
  );
}
