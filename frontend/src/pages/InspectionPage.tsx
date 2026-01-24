import React, { useState, useEffect } from 'react';
import { eventApi, inspectionApi } from '../services/apiClient';
import '../styles/inspection.css';

interface Alert {
  type: 'success' | 'error' | 'warning';
  message: string;
  id: string;
}

const InspectionPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const showAlert = (type: Alert['type'], message: string) => {
    const id = Date.now().toString();
    setAlerts(prev => [...prev, { type, message, id }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 4000);
  };

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const result = await eventApi.listEvents('Pending');
      setEvents(result || []);
      if (!result || result.length === 0) {
        showAlert('warning', 'אין אירועים ממתינים לבחינה');
      }
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בטעינת אירועים');
    } finally {
      setIsLoading(false);
    }
  };

  const selectEvent = (event: any) => {
    // Put pending items first so the inspector always starts with the next item to handle
    const orderedItems = [...(event.items || [])].sort((a, b) => {
      const weight = (status: number) => {
        if (status === 0) return 0; // Pending
        if (status === 1) return 2; // Pass
        return 1; // Fail/Disabled
      };
      return weight(a.inspectionStatus) - weight(b.inspectionStatus);
    });

    setCurrentEvent({ ...event, items: orderedItems });
    const pendingIndex = orderedItems.findIndex(i => i.inspectionStatus === 0);
    setCurrentItemIndex(pendingIndex >= 0 ? pendingIndex : 0);
    showAlert('success', `אירוע ${event.number} נבחר`);
  };

  const currentItem = currentEvent?.items?.[currentItemIndex];

  const recalcProgress = (items: any[] = []) => {
    const total = items.length;
    const completed = items.filter(i => i.inspectionStatus !== 0).length;
    const failed = items.filter(i => i.inspectionStatus === 2).length;
    const passed = items.filter(i => i.inspectionStatus === 1).length;
    return { total, completed, failed, passed, pending: total - completed };
  };

  const { total, completed, pending } = recalcProgress(currentEvent?.items || []);

  const handlePassDecision = async () => {
    if (!currentItem) return;

    try {
      setIsPrinting(true);
      await inspectionApi.makeDecision(currentItem.id, 'Pass', undefined, notes || undefined);
      showAlert('success', `✅ ${currentItem.itemName} סומן כתקין`);
      advanceAfterDecision('Pass');
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בהקלטת החלטה');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDisableDecision = async () => {
    if (!selectedReason) {
      showAlert('warning', 'בחר סיבה להשבתה');
      return;
    }

    if (!currentItem) return;

    try {
      setIsPrinting(true);
      await inspectionApi.makeDecision(currentItem.id, 'Disabled', selectedReason, notes || undefined);
      advanceAfterDecision('Disabled');
      
      // Try to print label
      try {
        const pdfBlob = await inspectionApi.printLabel(currentItem.id, 1);
        downloadPdf(pdfBlob, `label-${currentItem.itemMakat}-${Date.now()}.pdf`);
        showAlert('success', `❌ ${currentItem.itemName} הושבת וקובץ הדפסה נוצר`);
      } catch (printError) {
        showAlert('warning', `${currentItem.itemName} הושבת (לא הצליח ליצור קובץ הדפסה)`);
      }

      setShowDisableModal(false);
      setSelectedReason(null);
      setNotes('');
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בהקלטת החלטה');
    } finally {
      setIsPrinting(false);
    }
  };

  const advanceAfterDecision = (decision: 'Pass' | 'Disabled') => {
    setCurrentEvent((prev: any) => {
      if (!prev) return prev;

      const updatedItems = prev.items.map((item: any) =>
        item.id === currentItem.id
          ? {
              ...item,
              inspectionStatus: decision === 'Pass' ? 1 : 2,
              disableReason: decision === 'Disabled' ? selectedReason : null,
            }
          : item
      );

      const nextPendingIndex = updatedItems.findIndex((i: any) => i.inspectionStatus === 0);

      if (nextPendingIndex >= 0) {
        setCurrentItemIndex(nextPendingIndex);
      } else {
        showAlert('success', '🎉 סיימת לבחון את כל הפריטים!');
        setTimeout(() => {
          setCurrentEvent(null);
          loadEvents();
        }, 1200);
      }

      return { ...prev, items: updatedItems };
    });
  };

  const downloadPdf = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const goBack = () => {
    if (currentEvent) {
      const confirmed = window.confirm('סגור בחינה וחזור לרשימה?');
      if (confirmed) {
        setCurrentEvent(null);
        loadEvents();
      }
    }
  };

  // Events list view
  if (!currentEvent) {
    return (
      <div className="inspection-page">
        <div className="inspection-header">
          <h1>🔍 מעבדת בחינה</h1>
          <p>בחר אירוע לבדיקה</p>
        </div>

        {alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.type}`}>
            {alert.message}
          </div>
        ))}

        <div className="inspection-container">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>טוען אירועים...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h2>אין אירועים לבחינה</h2>
              <p>כל האירועים בחונו כבר או אין אירועים בהמתנה</p>
            </div>
          ) : (
            <div className="events-list-container">
              <div className="events-list-header">
                <h2>🎯 אירועים בהמתנה: {events.length}</h2>
              </div>
              <div className="events-list">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="event-card"
                    onClick={() => selectEvent(event)}
                  >
                    <div className="event-card-header">
                      <span className="event-card-number">{event.number}</span>
                      <span className="event-card-status">ממתין</span>
                    </div>

                    <div className="event-card-info">
                      <p>
                        <strong>יחידה:</strong> {event.sourceUnit}
                      </p>
                      <p>
                        <strong>מקבל:</strong> {event.receiver}
                      </p>
                      <p>
                        <strong>תאריך:</strong>{' '}
                        {new Date(event.createdAt).toLocaleDateString('he-IL')}
                      </p>
                    </div>

                    <div className="event-card-footer">
                      <span className="event-item-count">
                        <strong>{event.items?.length || 0}</strong> פריטים
                      </span>
                      <span className="inspect-badge">🔍 בחן</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inspection flow view
  const totalItems = currentEvent?.items?.length || 0;
  const completedItems = completed;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="inspection-page">
      <div className="inspection-header">
        <h1>🔍 מעבדת בחינה</h1>
        <p>אירוע {currentEvent?.number}</p>
      </div>

      {alerts.map(alert => (
        <div key={alert.id} className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      ))}

      <div className="inspection-container">
        <button className="back-btn" onClick={goBack} disabled={isPrinting}>
          ⬅️ חזור
        </button>

        {/* Progress Bar */}
        <div className="inspection-progress">
          <div style={{ marginBottom: '0.75rem' }}>
            <strong>התקדמות:</strong> פריט {currentItemIndex + 1} מתוך {totalItems}
          </div>
          <div className="progress-bar">
            {Array.from({ length: totalItems }).map((_, i) => (
              <div
                key={i}
                className={`progress-item ${
                  i < completedItems ? 'completed' : i === currentItemIndex ? 'current' : ''
                }`}
              ></div>
            ))}
          </div>
          <div className="progress-text">
            {progressPercent}% הושלם - <strong>{completedItems}</strong> מתוך{' '}
            <strong>{totalItems}</strong> פריטים
            {pending > 0 ? ` | ${pending} ממתינים` : ' | אין פריטים ממתינים'}
          </div>
        </div>

        {/* Inspection Item */}
        {currentItem && (
          <div className="inspection-item">
            <div className="item-header">
              <h2>{currentItem.itemName}</h2>
              <span className="item-status-badge">בבדיקה</span>
            </div>

            <div className="item-details">
              <div className="detail-row">
                <div className="detail-label">📦 מק״ט</div>
                <div className="detail-value makat">{currentItem.itemMakat}</div>
              </div>

              <div className="detail-row">
                <div className="detail-label">📝 שם פריט</div>
                <div className="detail-value">{currentItem.itemName}</div>
              </div>

              <div className="detail-row">
                <div className="detail-label">🔢 כמות</div>
                <div className="detail-value">{currentItem.quantity}</div>
              </div>

              {currentItem.inspectionStatus !== 0 && (
                <div className="detail-row">
                  <div className="detail-label">⚡ סטטוס בדיקה</div>
                  <div className="detail-value">
                    {currentItem.inspectionStatus === 1 ? '✅ תקין' : '❌ הושבת'}
                  </div>
                </div>
              )}

              {currentItem.addedAt && (
                <div className="detail-row">
                  <div className="detail-label">🕐 זמן הוספה</div>
                  <div className="detail-value">
                    {new Date(currentItem.addedAt).toLocaleTimeString('he-IL')}
                  </div>
                </div>
              )}
            </div>

            <div className="decision-section">
              <h3>👉 החלטת בדיקה</h3>
              <div className="decision-buttons">
                <button
                  className="pass-btn"
                  onClick={handlePassDecision}
                  disabled={isPrinting || showDisableModal}
                >
                  <span>✅</span>
                  <span>תקין</span>
                </button>

                <button
                  className="fail-btn"
                  onClick={() => setShowDisableModal(true)}
                  disabled={isPrinting || showDisableModal}
                >
                  <span>❌</span>
                  <span>משהו לא בסדר</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disable Reason Modal */}
      {showDisableModal && (
        <div className="modal-overlay" onClick={() => !isPrinting && setShowDisableModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🤔 בחר סיבת השבתה</h3>

            <textarea
              placeholder="הערות נוספות (לא חובה)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', minHeight: '80px', marginBottom: '0.75rem' }}
              disabled={isPrinting}
            />

            <div className="reason-buttons">
              <button
                className="reason-btn"
                onClick={() => setSelectedReason('VisualDamage')}
                style={{
                  borderColor: selectedReason === 'VisualDamage' ? '#ef4444' : undefined,
                  background: selectedReason === 'VisualDamage' ? '#fee2e2' : undefined,
                }}
                disabled={isPrinting}
              >
                🔴 נזק ויזואלי (שריטות, שברים וכו׳)
              </button>

              <button
                className="reason-btn"
                onClick={() => setSelectedReason('Scrap')}
                style={{
                  borderColor: selectedReason === 'Scrap' ? '#ef4444' : undefined,
                  background: selectedReason === 'Scrap' ? '#fee2e2' : undefined,
                }}
                disabled={isPrinting}
              >
                🗑️ גרוטאות (לא ניתן לתיקון)
              </button>

              <button
                className="reason-btn"
                onClick={() => setSelectedReason('Other')}
                style={{
                  borderColor: selectedReason === 'Other' ? '#ef4444' : undefined,
                  background: selectedReason === 'Other' ? '#fee2e2' : undefined,
                }}
                disabled={isPrinting}
              >
                ❓ סיבה אחרת
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="reason-btn"
                style={{
                  background: '#10b981',
                  color: 'white',
                  borderColor: '#10b981',
                  flex: 1,
                }}
                onClick={handleDisableDecision}
                disabled={!selectedReason || isPrinting}
              >
                {isPrinting ? '⏳ הדפסה...' : '✅ אישור'}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowDisableModal(false);
                  setSelectedReason(null);
                }}
                disabled={isPrinting}
              >
                ❌ ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionPage;
