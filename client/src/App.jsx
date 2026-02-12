import React, { useState, useEffect, useCallback } from 'react';
import { InvoiceList } from './InvoiceList';
import { InvoiceDetail } from './InvoiceDetail';
import { InvoicePrint } from './InvoicePrint';
import { CsvUpload } from './CsvUpload';

const API = '/api';

export default function App() {
  const [invoices, setInvoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadInvoices = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/invoices`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load')))
      .then(setInvoices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // PayPal return: capture order if token (PayPal order ID) is in URL
  const [paypalSuccess, setPaypalSuccess] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paypal') === 'return' && params.get('token')) {
      const orderId = params.get('token');
      fetch(`${API}/capture-paypal-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
        .then((res) => res.json())
        .then((data) => {
          setPaypalSuccess(data.success ? 'Payment captured.' : data.error || 'Unknown');
          window.history.replaceState({}, '', window.location.pathname || '/');
        })
        .catch(() => setPaypalSuccess('Capture failed.'));
    }
  }, []);

  const selected = selectedId ? invoices.find((inv) => String(inv.id) === String(selectedId)) : null;

  if (printInvoice) {
    return (
      <InvoicePrint
        invoice={printInvoice}
        onClose={() => setPrintInvoice(null)}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div>
            <h1>Essential Trading Invoices</h1>
            <p className="subtitle">View, generate, and pay freight invoices</p>
          </div>
          <CsvUpload onUploadSuccess={loadInvoices} />
        </div>
      </header>

      {paypalSuccess && (
        <div className="banner success">
          {paypalSuccess}
        </div>
      )}
      {loading && <p className="loading">Loading invoices…</p>}
      {error && (
        <div className="banner error">
          {error}. Upload a CSV above, or place <code>Essential Trading Invoices_rows.csv</code> in <code>invoice-app/data/</code> or Downloads and restart the server.
        </div>
      )}

      {!loading && !error && (
        <>
          <InvoiceList
            invoices={invoices}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {selected && (
            <InvoiceDetail
              invoice={selected}
              onClose={() => setSelectedId(null)}
              onPrint={() => setPrintInvoice(selected)}
            />
          )}
        </>
      )}

      <footer className="footer">
        Stripe &amp; PayPal – configure keys in <code>.env</code>
      </footer>
    </div>
  );
}
