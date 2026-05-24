import React, { useEffect, useMemo, useState } from 'react';
import { CommanderReport, departmentInspectionApi } from '../services/departmentInspectionApi';

export const CommandReportsPage: React.FC = () => {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<CommanderReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setError(null);
    try {
      setReport(await departmentInspectionApi.getReport({ from, to }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינת דוח נכשלה');
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <section className="page-grid">
      <div className="panel wide">
        <div className="section-heading">
          <h2>דוח מפקדים</h2>
          <p>סיכום כמותי עם דגש על חריגים.</p>
        </div>

        <div className="toolbar">
          <label>
            מתאריך
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            עד תאריך
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <button type="button" className="primary-button" onClick={loadReport}>
            הצג דוח
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
      </div>

      {report && (
        <>
          <div className="panel stat-panel horizontal">
            <div className="stat"><span>נבדק</span><strong>{report.totalQuantity}</strong></div>
            <div className="stat"><span>תקין</span><strong>{report.passedQuantity}</strong></div>
            <div className="stat"><span>מושבת</span><strong>{report.disabledQuantity}</strong></div>
            <div className="stat urgent"><span>חריג</span><strong>{report.exceptionalQuantity}</strong></div>
          </div>

          <div className="panel">
            <h3>חלוקה לפי סיבת השבתה</h3>
            <div className="stack">
              {report.disableReasons.map((reason) => (
                <div className="summary-row" key={reason.reason}>
                  <span>{reason.label}</span>
                  <strong>{reason.quantity}</strong>
                </div>
              ))}
              {report.disableReasons.length === 0 && <div className="muted">אין השבתות בטווח.</div>}
            </div>
          </div>

          <div className="panel">
            <h3>מקורות חוזרים</h3>
            <div className="stack">
              {report.repeatedSources.map((source) => (
                <div className="summary-row" key={source.sourceUnit}>
                  <span>{source.sourceUnit}</span>
                  <strong>{source.quantity}</strong>
                </div>
              ))}
              {report.repeatedSources.length === 0 && <div className="muted">אין מקור חוזר מזוהה.</div>}
            </div>
          </div>

          <div className="panel wide">
            <h3>חריגים לתשומת לב פיקודית</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>מק"ט</th>
                    <th>שם</th>
                    <th>כמות</th>
                    <th>מקור</th>
                    <th>הערה</th>
                  </tr>
                </thead>
                <tbody>
                  {report.exceptionalItems.map((item, index) => (
                    <tr key={`${item.inspectedAt}-${index}`} className="row-alert">
                      <td>{new Date(item.inspectedAt).toLocaleString('he-IL')}</td>
                      <td>{item.makat || '-'}</td>
                      <td>{item.itemName || '-'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.sourceUnit || '-'}</td>
                      <td>{item.notes || '-'}</td>
                    </tr>
                  ))}
                  {report.exceptionalItems.length === 0 && (
                    <tr>
                      <td colSpan={6}>אין חריגים בטווח.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
