import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { departmentInspectionApi, InspectionRecord } from '../services/departmentInspectionApi';

type HatFault = 'microphone' | 'clip' | 'audio' | 'electrical';

const faultLabels: Record<HatFault, string> = {
  microphone: 'מיקרופון',
  clip: 'חסר קליפס',
  audio: 'שמע',
  electrical: 'חשמלית',
};

const HAT_ITEM_NAME = "כובע דור ב'";

export const HatsPage: React.FC = () => {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [isFaulty, setIsFaulty] = useState(false);
  const [faults, setFaults] = useState<HatFault[]>([]);
  const [batchName, setBatchName] = useState('');
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const batchRef = useRef<HTMLInputElement>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadRecords = async () => {
    const data = await departmentInspectionApi.listRecords({ from: today, to: today, decision: 'Disabled' });
    setRecords(data.filter((record) => record.itemName === HAT_ITEM_NAME));
  };

  useEffect(() => {
    loadRecords().catch((err) => setError(err instanceof Error ? err.message : 'טעינת רשומות כובעים נכשלה'));
  }, []);

  const toggleFault = (fault: HatFault) => {
    setFaults((current) => (current.includes(fault) ? current.filter((item) => item !== fault) : [...current, fault]));
  };

  const reset = () => {
    setQuantity(1);
    setIsFaulty(false);
    setFaults([]);
    setBatchName('');
    setTimeout(() => batchRef.current?.focus(), 0);
  };

  const createHatLabel = async () => {
    setError(null);
    setMessage(null);

    if (quantity < 1) {
      setError('כמות חייבת להיות גדולה מאפס');
      return;
    }

    const faultText = isFaulty && faults.length > 0 ? faults.map((fault) => faultLabels[fault]).join(' + ') : '';
    const statusText = isFaulty ? `ניקיון + ${faultText || 'ליקוי נוסף לא סומן'}` : 'ניקיון לאחר בדיקה תקינה';
    const printWindow = window.open('', '_blank', 'width=420,height=640');
    if (printWindow) {
      printWindow.document.write('<!doctype html><title>מכין פתק</title><body dir="rtl" style="font-family:Arial;padding:24px">מכין פתק כובעים...</body>');
    }

    setIsSaving(true);
    try {
      const record = await departmentInspectionApi.createRecord({
        itemName: HAT_ITEM_NAME,
        quantity,
        decision: 'Disabled',
        disableReason: 'Cleaning',
        notes: batchName.trim() ? `${statusText} | נגלה: ${batchName.trim()}` : statusText,
        inspectedBy: user?.username ?? 'admin',
        sourceUnit: 'כובעים',
      });

      await departmentInspectionApi.printLabels({ recordIds: [record.id], mode: 'Quantity', inspectedBy: user?.username }, printWindow);
      setMessage('פתק כובע נשלח להדפסה');
      reset();
      await loadRecords();
    } catch (err) {
      printWindow?.close();
      setError(err instanceof Error ? err.message : 'שמירת כובע נכשלה');
    } finally {
      setIsSaving(false);
    }
  };

  const todayQuantity = records.reduce((sum, record) => sum + record.quantity, 0);
  const faultyQuantity = records
    .filter((record) => record.notes?.includes('+'))
    .reduce((sum, record) => sum + record.quantity, 0);

  return (
    <section className="hats-screen">
      <div className="hats-command">
        <div className="hats-title">
          <span>תת מחלקה</span>
          <h2>כובעים</h2>
          <p>בדיקת אוזנייה לקסדה, פתק ניקיון קבוע, ותוספות ליקוי כשצריך.</p>
        </div>

        <div className="hat-product">
          <div className="helmet-mark">
            <span />
          </div>
          <div>
            <strong>{HAT_ITEM_NAME}</strong>
            <p>נוהל קבוע: כל כובע עובר ניקיון ומקבל פתק השבתה.</p>
          </div>
        </div>

        <div className="hat-controls">
          <div className="quantity-stepper hat-qty">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={isSaving}>
              -
            </button>
            <label>
              כמות
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                disabled={isSaving}
              />
            </label>
            <button type="button" onClick={() => setQuantity((value) => value + 1)} disabled={isSaving}>
              +
            </button>
          </div>

          <label className="batch-field">
            נגלה / מקור
            <input
              ref={batchRef}
              value={batchName}
              onChange={(event) => setBatchName(event.target.value)}
              placeholder="אופציונלי"
              disabled={isSaving}
            />
          </label>
        </div>

        <div className="hat-status-toggle">
          <button type="button" className={!isFaulty ? 'active' : ''} onClick={() => setIsFaulty(false)} disabled={isSaving}>
            תקין בבדיקה
            <span>יודפס ניקיון בלבד</span>
          </button>
          <button type="button" className={isFaulty ? 'active danger' : ''} onClick={() => setIsFaulty(true)} disabled={isSaving}>
            יש ליקוי
            <span>יודפס ניקיון + ליקוי</span>
          </button>
        </div>

        {isFaulty && (
          <div className="hat-fault-grid">
            {(Object.keys(faultLabels) as HatFault[]).map((fault) => (
              <button
                key={fault}
                type="button"
                className={faults.includes(fault) ? 'active' : ''}
                onClick={() => toggleFault(fault)}
                disabled={isSaving}
              >
                {faultLabels[fault]}
              </button>
            ))}
          </div>
        )}

        <button type="button" className="hat-print-button" onClick={createHatLabel} disabled={isSaving}>
          {isSaving ? 'מדפיס...' : 'הדפס פתק כובע'}
          <span>ניקיון{isFaulty && faults.length > 0 ? ` + ${faults.map((fault) => faultLabels[fault]).join(' + ')}` : ''}</span>
        </button>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
      </div>

      <aside className="hats-board">
        <div className="board-card primary">
          <span>כובעים היום</span>
          <strong>{todayQuantity}</strong>
        </div>
        <div className="board-card alert-card">
          <span>עם ליקוי נוסף</span>
          <strong>{faultyQuantity}</strong>
        </div>
        <div className="printer-card">
          <span>פתק קבוע</span>
          <strong>ניקיון</strong>
          <p>גם כובע תקין טכנית יוצא לניקיון לפי נוהל.</p>
        </div>
      </aside>

      <section className="inspection-ledger hats-ledger">
        <div className="ledger-header">
          <h2>יומן כובעים</h2>
          <span>{records.length} נגלות היום</span>
        </div>
        <div className="ledger-list">
          {records.map((record) => (
            <article key={record.id} className="ledger-row">
              <time>{new Date(record.inspectedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</time>
              <div className="ledger-main">
                <strong>{record.itemName}</strong>
                <span>{record.notes || 'ניקיון'}</span>
              </div>
              <div className="ledger-meta">
                <span>{record.quantity} יח׳</span>
                <b className="disabled-tag">ניקיון</b>
              </div>
              <div className="ledger-note">{record.inspectedBy}</div>
            </article>
          ))}
          {records.length === 0 && <div className="empty-ledger">אין כובעים שנרשמו היום.</div>}
        </div>
      </section>
    </section>
  );
};
