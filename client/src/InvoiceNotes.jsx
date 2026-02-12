import React, { useState, useEffect } from 'react';

const API = '/api';

export function InvoiceNotes({ invoiceId }) {
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState('');
  const [fromClient, setFromClient] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () => {
    if (!invoiceId) return;
    fetch(`${API}/notes/${invoiceId}`)
      .then((r) => r.json())
      .then(setNotes)
      .catch(() => setNotes([]));
  };

  useEffect(() => load(), [invoiceId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    fetch(`${API}/notes/${invoiceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body.trim(), fromClient }),
    })
      .then((r) => r.json())
      .then(() => { setBody(''); load(); })
      .catch(console.error)
      .finally(() => setSending(false));
  };

  if (!invoiceId) return null;

  return (
    <div className="invoice-notes">
      <h4>Notes & messages</h4>
      <p className="muted small">Log internal notes or record messages from the client.</p>
      <form onSubmit={handleSubmit} className="notes-form">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note or paste what the client said…"
          rows={2}
          disabled={sending}
        />
        <label className="notes-from-client">
          <input type="checkbox" checked={fromClient} onChange={(e) => setFromClient(e.target.checked)} />
          Message from client
        </label>
        <button type="submit" className="btn btn-secondary" disabled={sending || !body.trim()}>
          {sending ? 'Adding…' : 'Add note'}
        </button>
      </form>
      <ul className="notes-list">
        {notes.length === 0 ? <li className="muted">No notes yet.</li> : notes.map((n) => (
          <li key={n.id} className={n.fromClient ? 'note-from-client' : ''}>
            <span className="note-time">{new Date(n.at).toLocaleString()}</span>
            {n.fromClient && <span className="note-badge">From client</span>}
            <div className="note-body">{n.body}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
