import React, { useState, useEffect, useCallback } from 'react';
import { InvoiceList } from './InvoiceList';
import { InvoiceDetail } from './InvoiceDetail';
import { InvoicePrint } from './InvoicePrint';
import { CsvUpload } from './CsvUpload';
import { Dashboard } from './Dashboard';
import { Automations } from './Automations';
import { Settings } from './Settings';

const API = '/api';

const VIEWS = { dashboard: 'Dashboard', invoices: 'Invoices', automations: 'Automations', settings: 'Settings' };

export default function App() {
  const [view, setView] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  const loadInvoices = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
        fetch(`${API}/invoices`).then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load')))),
        fetch(`${API}/invoices/source`).then((res) => (res.ok ? res.json() : { source: 'csv' })),
      ])
      .then(([invData, src]) => {
        setInvoices(invData);
        setDataSource(src.source || 'csv');
      })
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
          <nav className="main-nav">
            {Object.entries(VIEWS).map(([key, label]) => (
              <button key={key} type="button" className={`nav-btn ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>
                {label}
              </button>
            ))}
          </nav>
          <CsvUpload onUploadSuccess={loadInvoices} />
          {dataSource === 'supabase' && (
            <span className="data-source-badge" title="Invoices loaded from Supabase">Supabase</span>
          )}
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

      {!loading && !error && view === 'dashboard' && (
        <Dashboard invoices={invoices} onSelectInvoice={(id) => { setSelectedId(id); setView('invoices'); }} />
      )}
      {!loading && !error && view === 'automations' && (
        <Automations invoices={invoices} onSelectInvoice={(id) => { setSelectedId(id); setView('invoices'); }} />
      )}
      {!loading && !error && view === 'settings' && <Settings />}
      {!loading && !error && view === 'invoices' && (
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
