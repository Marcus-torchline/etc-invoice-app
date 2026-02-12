import React, { useRef, useState } from 'react';

const API = '/api';

export function CsvUpload({ onUploadSuccess }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessage({ type: 'error', text: 'Please choose a .csv file.' });
      return;
    }
    setMessage(null);
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      fetch(`${API}/invoices/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setMessage({ type: 'success', text: data.message || `Loaded ${data.count} invoices.` });
          onUploadSuccess?.();
          if (inputRef.current) inputRef.current.value = '';
        })
        .catch((err) => setMessage({ type: 'error', text: err.message || 'Upload failed' }))
        .finally(() => setUploading(false));
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'Could not read file' });
      setUploading(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="csv-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="csv-upload-input"
        id="csv-upload-input"
        disabled={uploading}
      />
      <label htmlFor="csv-upload-input" className="csv-upload-label">
        {uploading ? 'Uploading…' : 'Upload CSV'}
      </label>
      {message && (
        <span className={`csv-upload-msg ${message.type}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
