import React, { useState, useEffect } from 'react';

const API = '/api';

export function Settings() {
  const [configured, setConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${API}/settings/elevenlabs`)
      .then((r) => r.json())
      .then((data) => setConfigured(!!data.configured))
      .catch(() => setConfigured(false));
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    fetch(`${API}/settings/elevenlabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    })
      .then((r) => r.ok ? r.json() : r.json().then((d) => Promise.reject(new Error(d.error || 'Failed'))))
      .then(() => {
        setConfigured(!!apiKey.trim());
        setMessage('ElevenLabs API key saved.');
        setApiKey('');
      })
      .catch((err) => setMessage(err.message || 'Failed to save'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>API keys</h3>
        <p className="muted small">Store API keys here so the app can use them (e.g. for AI calls). Keys are saved on the server only and never sent to the browser after saving.</p>

        <div className="settings-block">
          <h4>ElevenLabs</h4>
          <p className="muted small">Used to have the AI call customers on the spot. Get your key at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">elevenlabs.io</a>. You can also set <code>ELEVENLABS_API_KEY</code> in <code>.env</code>.</p>
          {configured && <p className="success-msg">ElevenLabs API key is configured.</p>}
          <form onSubmit={handleSave} className="settings-form">
            <label>
              <span className="label">API key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={configured ? 'Enter new key to replace' : 'Paste your ElevenLabs API key'}
                autoComplete="off"
                className="input-api-key"
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : configured ? 'Update key' : 'Save key'}
            </button>
          </form>
          <p className="muted small mt">
            For outbound calls you also need an <strong>Agent</strong> and a <strong>Phone number</strong> in the ElevenLabs dashboard (Conv AI + Twilio). Set <code>ELEVENLABS_AGENT_ID</code> and <code>ELEVENLABS_PHONE_NUMBER_ID</code> in <code>.env</code>.
          </p>
        </div>
      </section>
      {message && (
        <p className={message.startsWith('ElevenLabs') ? 'success-msg' : 'error-msg'}>
          {message}
        </p>
      )}
    </div>
  );
}
