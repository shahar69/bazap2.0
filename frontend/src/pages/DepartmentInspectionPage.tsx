import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import {
  Decision,
  DisableReason,
  decisionLabels,
  departmentInspectionApi,
  disableReasonLabels,
  InspectionRecord,
} from '../services/departmentInspectionApi';

const reasonOrder: DisableReason[] = ['VisualDefect', 'Scrap', 'Exceptional'];

const isLikelyMakat = (value: string) => {
  const normalized = value.trim();
  const digits = normalized.replace(/\D/g, '').length;
  const hasHebrew = /[\u0590-\u05FF]/.test(normalized);
  return digits >= 3 && !hasHebrew;
};

export const DepartmentInspectionPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [itemText, setItemText] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sourceUnit, setSourceUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [isDisabledOpen, setIsDisabledOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastPrintStatus, setLastPrintStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const itemRef = useRef<HTMLInputElement>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadRecords = async () => {
    const data = await departmentInspectionApi.listRecords({ from: today, to: today });
    setRecords(data);
  };

  useEffect(() => {
    loadRecords().catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת רשומות'));
  }, []);

  const resetEntry = () => {
    setItemText('');
    setQuantity(1);
    setNotes('');
    setIsDisabledOpen(false);
    setTimeout(() => itemRef.current?.focus(), 0);
  };

  const createRecord = async (decision: Decision, disableReason?: DisableReason) => {
    const value = itemText.trim();
    setError(null);
    setLastPrintStatus(null);

    if (!value) {
      setError('צריך להזין מק"ט או שם פריט');
      itemRef.current?.focus();
      return;
    }

    if (quantity < 1) {
      setError('כמות חייבת להיות גדולה מאפס');
      return;
    }

    const printWindow = decision === 'Disabled' ? window.open('', '_blank', 'width=420,height=640') : null;
    if (printWindow) {
      printWindow.document.write('<!doctype html><title>מכין פתק</title><body dir="rtl" style="font-family:Arial;padding:24px">מכין פתק השבתה...</body>');
    }

    setIsSaving(true);
    try {
      const saved = await departmentInspectionApi.createRecord({
        makat: isLikelyMakat(value) ? value : undefined,
        itemName: isLikelyMakat(value) ? undefined : value,
        quantity,
        decision,
        disableReason,
        notes: notes.trim() || undefined,
        inspectedBy: user?.username ?? 'admin',
        sourceUnit: sourceUnit.trim() || undefined,
      });

      if (decision === 'Disabled') {
        await departmentInspectionApi.printLabels(
          { recordIds: [saved.id], mode: 'Quantity', inspectedBy: user?.username },
          printWindow
        );
        setLastPrintStatus('פתק השבתה נשלח להדפסה');
      }

      resetEntry();
      await loadRecords();
    } catch (err) {
      printWindow?.close();
      setError(err instanceof Error ? err.message : 'שמירת הרשומה נכשלה');
    } finally {
      setIsSaving(false);
    }
  };

  const total = records.reduce((sum, record) => sum + record.quantity, 0);
  const disabled = records.filter((record) => record.decision === 'Disabled').reduce((sum, record) => sum + record.quantity, 0);
  const exceptional = records
    .filter((record) => record.disableReason === 'Exceptional')
    .reduce((sum, record) => sum + record.quantity, 0);
  const latestDisabled = records.find((record) => record.decision === 'Disabled');

  return (
    <section className="workstation-screen">
      <div className="command-surface">
        <div className="station-title">
          <span>עמדת בחינה</span>
          <strong>{new Date().toLocaleDateString('he-IL')}</strong>
        </div>

        <div className="entry-panel">
          <label className="scan-field">
            <span>סרוק או הקלד פריט</span>
            <input
              ref={itemRef}
              value={itemText}
              onChange={(event) => setItemText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  createRecord('Pass');
                }
              }}
              placeholder="מק״ט או שם פריט"
              disabled={isSaving}
              autoFocus
            />
          </label>

          <div className="quantity-stepper" aria-label="כמות">
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

          <div className="decision-grid">
            <button type="button" className="decision-pass" onClick={() => createRecord('Pass')} disabled={isSaving}>
              תקין
              <span>שמירה וחזרה לקלט הבא</span>
            </button>
            <button
              type="button"
              className="decision-disabled"
              onClick={() => setIsDisabledOpen((value) => !value)}
              disabled={isSaving}
            >
              מושבת
              <span>בחירת סיבה תדפיס פתק מיד</span>
            </button>
          </div>

          {isDisabledOpen && (
            <div className="reason-strip">
              {reasonOrder.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={reason === 'Exceptional' ? 'reason-exceptional' : ''}
                  onClick={() => createRecord('Disabled', reason)}
                  disabled={isSaving}
                >
                  {disableReasonLabels[reason]}
                </button>
              ))}
            </div>
          )}

          <div className="secondary-fields">
            <label>
              מקור
              <input value={sourceUnit} onChange={(event) => setSourceUnit(event.target.value)} disabled={isSaving} />
            </label>
            <label>
              הערה
              <input value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isSaving} />
            </label>
          </div>

          {error && <div className="alert error">{error}</div>}
          {lastPrintStatus && <div className="alert success">{lastPrintStatus}</div>}
        </div>
      </div>

      <aside className="daily-board">
        <div className="board-card primary">
          <span>נבדק היום</span>
          <strong>{total}</strong>
        </div>
        <div className="board-card">
          <span>מושבת</span>
          <strong>{disabled}</strong>
        </div>
        <div className="board-card alert-card">
          <span>חריג</span>
          <strong>{exceptional}</strong>
        </div>
        <div className="printer-card">
          <span>מדפסת מדבקות</span>
          <strong>{latestDisabled ? 'מוכנה לפתק הבא' : 'ממתינה להשבתה'}</strong>
          <p>בחירת סיבת השבתה פותחת מיד חלון הדפסה למדבקה.</p>
        </div>
      </aside>

      <section className="inspection-ledger">
        <div className="ledger-header">
          <h2>יומן בחינה</h2>
          <span>{records.length} רשומות היום</span>
        </div>
        <div className="ledger-list">
          {records.map((record) => (
            <article key={record.id} className={`ledger-row ${record.disableReason === 'Exceptional' ? 'exceptional' : ''}`}>
              <time>{new Date(record.inspectedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</time>
              <div className="ledger-main">
                <strong>{record.makat || record.itemName || '-'}</strong>
                {record.makat && record.itemName && <span>{record.itemName}</span>}
                {!record.makat && record.itemName && <span>שם פריט ללא מק"ט</span>}
                {record.makat && !record.itemName && <span>מק"ט ללא שם פריט</span>}
              </div>
              <div className="ledger-meta">
                <span>{record.quantity} יח׳</span>
                <b className={record.decision === 'Disabled' ? 'disabled-tag' : 'pass-tag'}>{decisionLabels[record.decision]}</b>
                {record.disableReason && <b className="reason-tag">{disableReasonLabels[record.disableReason]}</b>}
              </div>
              <div className="ledger-note">{record.notes || record.sourceUnit || '-'}</div>
            </article>
          ))}
          {records.length === 0 && <div className="empty-ledger">אין רשומות היום.</div>}
        </div>
      </section>
    </section>
  );
};
