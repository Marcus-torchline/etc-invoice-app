import React, { useEffect, useState } from 'react';
import { getFieldLabel, getInvoiceKeys } from './invoiceFields';

const API = '/api';

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

const DATE_KEYS = new Set(['pick_up_date', 'expected_payment_date']);
const AMOUNT_KEYS = new Set(['cust_freight_charges']);

function formatPrintValue(key, val) {
  if (val === undefined || val === null || val === '') return '—';
  const s = String(val).trim();
  if (DATE_KEYS.has(key)) return formatDate(val);
  if (AMOUNT_KEYS.has(key)) return formatAmount(val);
  if ((s.startsWith('http://') || s.startsWith('https://')) && s.length < 80) return s;
  if (s.startsWith('http')) return '[Link]';
  return s;
}

export function InvoicePrint({ invoice, onClose }) {
  const [paymentLetterAvailable, setPaymentLetterAvailable] = useState(false);

  useEffect(() => {
    const title = document.title;
    document.title = `Invoice #${invoice.id} - Essential Trading`;
    return () => { document.title = title; };
  }, [invoice.id]);

  useEffect(() => {
    fetch(`${API}/payment-demand-letter/available`)
      .then((r) => r.json())
      .then((data) => setPaymentLetterAvailable(data.available))
      .catch(() => setPaymentLetterAvailable(false));
  }, []);

  const handlePrint = () => window.print();

  return (
    <div className="print-view">
      <div className="print-toolbar no-print">
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          Print / Save as PDF
        </button>
        {paymentLetterAvailable && (
          <a
            href={`${API}/payment-demand-letter`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Download payment demand letter
          </a>
        )}
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

        {(() => {
          const { invoice: invoiceKeys, payment: paymentKeys } = getInvoiceKeys(invoice);
          return (
            <>
              <h3 className="inv-table-section">Invoice &amp; shipment</h3>
              <table className="inv-table inv-table-full">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceKeys.map((key) => (
                    <tr key={key}>
                      <td className="inv-table-label">{getFieldLabel(key)}</td>
                      <td>{formatPrintValue(key, invoice[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {paymentKeys.length > 0 && (
                <>
                  <h3 className="inv-table-section">Payment &amp; documents</h3>
                  <table className="inv-table inv-table-full">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentKeys.map((key) => (
                        <tr key={key}>
                          <td className="inv-table-label">{getFieldLabel(key)}</td>
                          <td>{formatPrintValue(key, invoice[key])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <div className="inv-total">
                <span>Total</span>
                <span>{formatAmount(invoice.cust_freight_charges)}</span>
              </div>
            </>
          );
        })()}

        <footer className="inv-footer">
          Thank you for your business. Pay via Stripe or PayPal from the app, or use your existing payment link.
          {paymentLetterAvailable && (
            <p className="inv-footer-link no-print">
              <a href={`${API}/payment-demand-letter`} target="_blank" rel="noopener noreferrer">
                Download payment demand letter
              </a>
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
