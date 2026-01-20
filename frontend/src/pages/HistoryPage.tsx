import React, { useState, useEffect } from 'react';
import { receiptsApi } from '../services/api';
import { Receipt } from '../types';

interface ReceiptDetails extends Receipt {
  isCancelled?: boolean;
  cancellationReason?: string;
  cancelledAt?: string;
}

export const HistoryPage: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async (filters?: any) => {
    try {
      const data = await receiptsApi.getAll(filters);
      setReceipts(data as ReceiptDetails[]);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת ההיסטוריה');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    const filters: any = {};
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;
    if (searchTerm) filters.search = searchTerm;
    
    setIsLoading(true);
    loadReceipts(filters);
  };

  const handleReset = () => {
    setFromDate('');
    setToDate('');
    setSearchTerm('');
    setIsLoading(true);
    loadReceipts();
  };

  const handleViewDetails = (receipt: ReceiptDetails) => {
    setSelectedReceipt(receipt);
    setShowDetailsModal(true);
  };

  const handleCancelClick = (receipt: ReceiptDetails) => {
    setSelectedReceipt(receipt);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedReceipt || !cancelReason.trim()) {
      setError('יש להזין סיבה לביטול');
      return;
    }

    try {
      await receiptsApi.cancelReceipt(selectedReceipt.id, { reason: cancelReason });
      setError('');
      setShowCancelModal(false);
      setShowDetailsModal(false);
      setCancelReason('');
      loadReceipts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בביטול הקבלה');
    }
  };

  if (isLoading && receipts.length === 0) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">היסטוריית קבלות</h2>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-row">
          <div>
            <label htmlFor="fromDate">מתאריך:</label>
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="toDate">עד תאריך:</label>
            <input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="search">חיפוש (שם מקבל / שם פריט):</label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="הזן מילת חיפוש"
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleFilter}>
            סנן
          </button>
          <button className="btn btn-secondary" onClick={handleReset}>
            איפוס
          </button>
        </div>
      </div>

      <div className="card">
        {receipts.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>לא נמצאו קבלות</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>מס' קבלה</th>
                <th>שם מקבל</th>
                <th>תאריך</th>
                <th>פריטים</th>
                <th>עשוי על ידי</th>
                <th>סטטוס</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(receipt => (
                <tr key={receipt.id} style={{ opacity: receipt.isCancelled ? 0.6 : 1 }}>
                  <td>{receipt.id}</td>
                  <td>{receipt.recipientName}</td>
                  <td>{new Date(receipt.receiptDate).toLocaleDateString('he-IL')}</td>
                  <td>
                    <details>
                      <summary>{receipt.items.length} פריטים</summary>
                      <ul style={{ margin: '10px 0', paddingRight: '20px' }}>
                        {receipt.items.map(item => (
                          <li key={item.id}>
                            {item.itemName} x {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td>{receipt.createdByUsername || '-'}</td>
                  <td>
                    {receipt.isCancelled ? (
                      <span style={{ color: 'red', fontWeight: 'bold' }}>מבוטלת</span>
                    ) : (
                      <span style={{ color: 'green' }}>פעילה</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="btn btn-small btn-info"
                      onClick={() => handleViewDetails(receipt)}
                    >
                      צפה בפרטים
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal - פרטי קבלה */}
      {showDetailsModal && selectedReceipt && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>פרטי קבלה מס' {selectedReceipt.id}</h2>
              <button 
                className="btn btn-small"
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '20px' }}>
              <p><strong>שם מקבל:</strong> {selectedReceipt.recipientName}</p>
              <p><strong>תאריך קבלה:</strong> {new Date(selectedReceipt.receiptDate).toLocaleString('he-IL')}</p>
              <p><strong>עשוי על ידי:</strong> {selectedReceipt.createdByUsername || '-'}</p>
              <p><strong>סטטוס:</strong> {selectedReceipt.isCancelled ? <span style={{ color: 'red' }}>מבוטלת</span> : <span style={{ color: 'green' }}>פעילה</span>}</p>
              {selectedReceipt.isCancelled && (
                <>
                  <p><strong>סיבת ביטול:</strong> {selectedReceipt.cancellationReason}</p>
                  <p><strong>בוטלה בתאריך:</strong> {selectedReceipt.cancelledAt ? new Date(selectedReceipt.cancelledAt).toLocaleString('he-IL') : '-'}</p>
                </>
              )}
            </div>

            <h3>פריטים</h3>
            <table>
              <thead>
                <tr>
                  <th>שם הפריט</th>
                  <th>כמות</th>
                </tr>
              </thead>
              <tbody>
                {selectedReceipt.items.map(item => (
                  <tr key={item.id}>
                    <td>{item.itemName}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {!selectedReceipt.isCancelled && (
                <button 
                  className="btn btn-danger"
                  onClick={() => handleCancelClick(selectedReceipt)}
                >
                  בטל קבלה
                </button>
              )}
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - ביטול קבלה */}
      {showCancelModal && selectedReceipt && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '400px' }}>
            <h2>בטל קבלה מס' {selectedReceipt.id}</h2>
            <p>שם מקבל: <strong>{selectedReceipt.recipientName}</strong></p>
            
            <div className="form-group">
              <label htmlFor="cancelReason">סיבת הביטול:</label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="הזן סיבה לביטול הקבלה"
                rows={4}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                className="btn btn-danger"
                onClick={handleConfirmCancel}
              >
                אישור ביטול
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCancelModal(false)}
              >
                ביטול פעולה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles for modals
const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '8px',
  maxWidth: '600px',
  maxHeight: '90vh',
  overflowY: 'auto',
  direction: 'rtl',
};
