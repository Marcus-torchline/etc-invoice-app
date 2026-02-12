import React, { useState, useEffect } from 'react';
import { PaymentButtons } from './PaymentButtons';
import { InvoiceNotes } from './InvoiceNotes';
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
const LINK_KEYS = new Set(['actual_pod_that_link_goes_to', 'pod_link', 'pod_attachment', 'wise_payment_link', 'pdf_generator_attachment', 'payment_receipt']);

function formatValue(key, val) {
  if (val === undefined || val === null || val === '') return '—';
  const s = String(val).trim();
  if (DATE_KEYS.has(key)) return formatDate(val);
  if (AMOUNT_KEYS.has(key)) return formatAmount(val);
  if (LINK_KEYS.has(key) && (s.startsWith('http://') || s.startsWith('https://'))) {
    return <a href={s} target="_blank" rel="noopener noreferrer" className="detail-link">Open link</a>;
  }
  return s;
}

export function InvoiceDetail({ invoice, onClose, onPrint }) {
  const amount = parseFloat(String(invoice.cust_freight_charges || 0).replace(/[^0-9.]/g, '')) || 0;
  const canPay = amount > 0;
  const [paymentLetterAvailable, setPaymentLetterAvailable] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(null);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callPhone, setCallPhone] = useState(invoice.phone || invoice.customer_phone || '');
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState(null);
  const hasEmail = !!(invoice.email_field || invoice.email_to_send) && (invoice.email_field || invoice.email_to_send).includes('@');

  useEffect(() => {
    fetch(`${API}/payment-demand-letter/available`)
      .then((r) => r.json())
      .then((data) => setPaymentLetterAvailable(data.available))
      .catch(() => setPaymentLetterAvailable(false));
  }, []);

  const handleSendEmail = () => {
    setSendingEmail(true);
    setEmailSent(null);
    fetch(`${API}/send-invoice-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: invoice.id }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setEmailSent(data.to); else throw new Error(data.error); })
      .catch((e) => setEmailSent(e.message || 'Failed'))
      .finally(() => setSendingEmail(false));
  };

  const openCallModal = () => {
    setCallPhone(invoice.phone || invoice.customer_phone || '');
    setCallResult(null);
    setCallModalOpen(true);
  };

  const handleStartCall = () => {
    const toNumber = callPhone.trim().replace(/\D/g, '');
    if (toNumber.length < 10) {
      setCallResult('Please enter a valid phone number (e.g. +1 234 567 8900).');
      return;
    }
    setCalling(true);
    setCallResult(null);
    fetch(`${API}/elevenlabs-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: invoice.id, toNumber: callPhone.trim() }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCallResult('Call started. The AI will call the customer shortly.');
      })
      .catch((e) => setCallResult(e.message || 'Failed to start call'))
      .finally(() => setCalling(false));
  };

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <h2>Invoice #{invoice.id}</h2>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="detail-body">
        {(() => {
          const { invoice: invoiceKeys, payment: paymentKeys } = getInvoiceKeys(invoice);
          return (
            <>
              <div className="detail-section">
                <h3 className="detail-section-title">Invoice &amp; shipment</h3>
                <div className="detail-grid">
                  {invoiceKeys.map((key) => (
                    <div key={key} className={`field${key === 'cust_freight_charges' ? ' highlight' : ''}`}>
                      <span className="label">{getFieldLabel(key)}</span>
                      <span className="value">{formatValue(key, invoice[key])}</span>
                    </div>
                  ))}
                </div>
              </div>
              {paymentKeys.length > 0 && (
                <div className="detail-section">
                  <h3 className="detail-section-title">Payment &amp; documents</h3>
                  <div className="detail-grid">
                    {paymentKeys.map((key) => (
                      <div key={key} className={`field${key === 'payment_status' ? ' highlight' : ''}`}>
                        <span className="label">{getFieldLabel(key)}</span>
                        <span className="value">{formatValue(key, invoice[key])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        <div className="detail-actions">
          <button type="button" className="btn btn-secondary" onClick={onPrint}>
            Generate / Print invoice
          </button>
          {hasEmail && (
            <button type="button" className="btn btn-primary" onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? 'Sending…' : 'Send invoice email'}
            </button>
          )}
          {emailSent && (emailSent.includes('@') ? <span className="success-msg">Sent to {emailSent}</span> : <span className="error-msg">{emailSent}</span>)}
          {!hasEmail && <p className="muted small">No email on file; add one to send invoices.</p>}
          {paymentLetterAvailable && (
            <a
              href={`${API}/payment-demand-letter`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary payment-letter-link"
            >
              Download payment demand letter
            </a>
          )}
          <button type="button" className="btn btn-secondary" onClick={openCallModal}>
            Have AI call customer
          </button>
          {callModalOpen && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="call-modal-title">
              <div className="modal">
                <h3 id="call-modal-title">Call customer with AI</h3>
                <p className="muted small">Enter the customer&apos;s phone number. The AI will place an outbound call via ElevenLabs.</p>
                <label>
                  <span className="label">Phone number</span>
                  <input
                    type="tel"
                    value={callPhone}
                    onChange={(e) => setCallPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    disabled={calling}
                  />
                </label>
                {callResult && (
                  <p className={callResult.includes('started') ? 'success-msg' : 'error-msg'}>{callResult}</p>
                )}
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setCallModalOpen(false)} disabled={calling}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleStartCall} disabled={calling}>
                    {calling ? 'Starting…' : 'Start call'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {canPay && <PaymentButtons invoice={invoice} amount={amount} />}
          {!canPay && amount === 0 && (
            <p className="muted small">No amount set; payment buttons hidden.</p>
          )}
        </div>

        <InvoiceNotes invoiceId={invoice.id} />
      </div>
    </aside>
  );
}
