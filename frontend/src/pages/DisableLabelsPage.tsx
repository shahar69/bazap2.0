import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { departmentInspectionApi, disableReasonLabels, InspectionRecord } from '../services/departmentInspectionApi';

export const DisableLabelsPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [mode, setMode] = useState<'Quantity' | 'Single'>('Quantity');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadRecords = async () => {
    const data = await departmentInspectionApi.listRecords({ from: today, to: today, decision: 'Disabled' });
    setRecords(data);
  };

  useEffect(() => {
    loadRecords().catch((err) => setError(err instanceof Error ? err.message : 'טעינת רשומות נכשלה'));
  }, [today]);

  const recordIds = records.map((record) => record.id);
  const totalLabels = records.reduce((sum, record) => sum + (mode === 'Single' ? record.quantity : 1), 0);

  const printAll = async () => {
    if (recordIds.length === 0) {
      setError('אין פריטים מושבתים להדפסה');
      return;
    }

    setError(null);
    setMessage(null);
    await departmentInspectionApi.printLabels({ recordIds, mode, inspectedBy: user?.username });
    setMessage('חלון הדפסה נפתח למדבקות היום');
  };

  return (
    <section className="labels-workbench">
      <div className="label-hero">
        <div>
          <h2>מדפסת מדבקות</h2>
          <p>ברירת המחדל היא הדפסת כל הפריטים המושבתים מהיום. בחירה ידנית נשארת מחוץ לזרימה הראשית.</p>
        </div>
        <button type="button" className="print-action" onClick={printAll}>
          הדפס הכל
          <span>{totalLabels} מדבקות</span>
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="label-mode-panel">
        <button type="button" className={mode === 'Quantity' ? 'active' : ''} onClick={() => setMode('Quantity')}>
          פתק כמותי לנגלה
        </button>
        <button type="button" className={mode === 'Single' ? 'active' : ''} onClick={() => setMode('Single')}>
          פתק יחידני לכל מכשיר
        </button>
      </div>

      <div className="label-batch-list">
        {records.map((record) => (
          <article key={record.id} className={record.disableReason === 'Exceptional' ? 'exceptional' : ''}>
            <strong>{record.makat || record.itemName || '-'}</strong>
            <span>{record.itemName && record.makat ? record.itemName : record.notes || record.sourceUnit || 'ללא הערה'}</span>
            <b>{record.quantity} יח׳</b>
            <em>{record.disableReason ? disableReasonLabels[record.disableReason] : '-'}</em>
          </article>
        ))}
        {records.length === 0 && <div className="empty-ledger">אין מושבתים מהיום.</div>}
      </div>
    </section>
  );
};
