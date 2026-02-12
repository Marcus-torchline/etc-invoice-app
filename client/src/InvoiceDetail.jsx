import React, { useState } from 'react';
import { PaymentButtons } from './PaymentButtons';

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

export function InvoiceDetail({ invoice, onClose, onPrint }) {
  const amount = parseFloat(String(invoice.cust_freight_charges || 0).replace(/[^0-9.]/g, '')) || 0;
  const canPay = amount > 0;

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <h2>Invoice #{invoice.id}</h2>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="detail-body">
        <div className="detail-grid">
          <div className="field">
            <span className="label">Load #</span>
            <span className="value">{invoice.essential_trading_load || '—'}</span>
          </div>
          <div className="field">
            <span className="label">Pick-up date</span>
            <span className="value">{formatDate(invoice.pick_up_date)}</span>
          </div>
          <div className="field">
            <span className="label">Invoiced to</span>
            <span className="value">{invoice.invoiced_to || '—'}</span>
          </div>
          <div className="field">
            <span className="label">Customer</span>
            <span className="value">{invoice.invoiced_customer_internal_use || invoice.receiver_name || invoice.customer_updated_text || '—'}</span>
          </div>
          <div className="field">
            <span className="label">Customer ref</span>
            <span className="value">{invoice.customer_ref || '—'}</span>
          </div>
          <div className="field">
            <span className="label">Shipper</span>
            <span className="value">{invoice.shipper_name || '—'}</span>
          </div>
          <div className="field">
            <span className="label">Shipper address</span>
            <span className="value">{[invoice.shipper_address, invoice.shipper_city_state].filter(Boolean).join(', ') || '—'}</span>
          </div>
          <div className="field">
            <span className="label">Receiver</span>
            <span className="value">{invoice.receiver_name || '—'}</span>
          </div>
          <div className="field">
            <span className="label">Receiver address</span>
            <span className="value">{[invoice.receiver_address, invoice.receiver_city_state].filter(Boolean).join(', ') || '—'}</span>
          </div>
          <div className="field">
            <span className="label">Weight (lbs)</span>
            <span className="value">{invoice.weight_lbs ?? '—'}</span>
          </div>
          <div className="field">
            <span className="label">Cubes</span>
            <span className="value">{invoice.cubes ?? '—'}</span>
          </div>
          <div className="field">
            <span className="label">Pieces</span>
            <span className="value">{invoice.pieces ?? '—'}</span>
          </div>
          <div className="field highlight">
            <span className="label">Amount</span>
            <span className="value amount">{formatAmount(invoice.cust_freight_charges)}</span>
          </div>
          <div className="field">
            <span className="label">Payment status</span>
            <span className="value">{invoice.payment_status || '—'}</span>
          </div>
          <div className="field">
            <span className="label">Email</span>
            <span className="value">{invoice.email_field || invoice.email_to_send || '—'}</span>
          </div>
          {invoice.notes && (
            <div className="field full">
              <span className="label">Notes</span>
              <span className="value notes">{invoice.notes}</span>
            </div>
          )}
        </div>

        <div className="detail-actions">
          <button type="button" className="btn btn-secondary" onClick={onPrint}>
            Generate / Print invoice
          </button>
          {canPay && <PaymentButtons invoice={invoice} amount={amount} />}
          {!canPay && amount === 0 && (
            <p className="muted small">No amount set; payment buttons hidden.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
