import React, { useState } from 'react';

const API = '/api';

export function PaymentButtons({ invoice, amount }) {
  const [loading, setLoading] = useState(null); // 'stripe' | 'paypal'
  const [error, setError] = useState(null);

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const successUrl = `${baseUrl}?paid=ok&invoice=${invoice.id}`;
  const cancelUrl = baseUrl;

  async function handleStripe() {
    setError(null);
    setLoading('stripe');
    try {
      const res = await fetch(`${API}/create-stripe-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          successUrl,
          cancelUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Stripe error');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handlePayPal() {
    setError(null);
    setLoading('paypal');
    try {
      const res = await fetch(`${API}/create-paypal-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PayPal error');
      const url = data.approvalUrl || (data.orderId && `https://www.sandbox.paypal.com/checkoutnow?token=${data.orderId}`);
      if (url) window.location.href = url;
      else throw new Error('No approval URL from PayPal');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="payment-buttons">
      {error && <p className="payment-error">{error}</p>}
      <div className="payment-row">
        <button
          type="button"
          className="btn btn-stripe"
          onClick={handleStripe}
          disabled={!!loading}
        >
          {loading === 'stripe' ? 'Redirecting…' : 'Pay with Stripe'}
        </button>
        <button
          type="button"
          className="btn btn-paypal"
          onClick={handlePayPal}
          disabled={!!loading}
        >
          {loading === 'paypal' ? 'Redirecting…' : 'Pay with PayPal'}
        </button>
      </div>
      <p className="muted small">Amount: ${amount.toFixed(2)} USD</p>
    </div>
  );
}
