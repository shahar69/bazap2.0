import React, { useMemo, useState } from 'react';
import { departmentInspectionApi } from '../services/departmentInspectionApi';

export const SapFileExportPage: React.FC = () => {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadCsv = async () => {
    setError(null);
    setMessage(null);
    try {
      await departmentInspectionApi.downloadSapCsv({ from, to });
      setMessage('הקובץ הופק להורדה.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ייצוא הקובץ נכשל');
    }
  };

  return (
    <section className="panel narrow">
      <div className="section-heading">
        <h2>ייצוא SAP</h2>
        <p>ייצוא קובץ בלבד. אין חיבור חי למערכת SAP בגרסה זו.</p>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="form-row two">
        <label>
          מתאריך
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          עד תאריך
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>

      <button type="button" className="primary-button" onClick={downloadCsv}>
        הורד CSV
      </button>
    </section>
  );
};
