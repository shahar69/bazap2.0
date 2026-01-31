import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { eventApi } from '../services/apiClient';
import { exportEventsToExcel, exportInspectionsToExcel } from '../utils/excelExport';
import '../styles/history.css';

interface EventItem {
  id: number;
  makat: string;
  name: string;
  quantity: number;
  inspectionAction?: number;
}

interface Event {
  id: number;
  eventNumber: string;
  eventType: number;
  sourceUnit: string;
  receiver: string;
  status: number;
  createdDate: string;
  items?: EventItem[];
}

interface Filters {
  eventType?: number;
  status?: number;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
}

export const HistoryPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'items' | 'event'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load events on mount and when filters change
  useEffect(() => {
    loadEvents();
  }, [filters]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await eventApi.getAllEvents();
      setEvents(allEvents || []);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת ההיסטוריה');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (filters.eventType !== undefined && filters.eventType !== -1) {
      result = result.filter((e) => e.eventType === filters.eventType);
    }

    if (filters.status !== undefined && filters.status !== -1) {
      result = result.filter((e) => e.status === filters.status);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.eventNumber.toLowerCase().includes(term) ||
          e.receiver.toLowerCase().includes(term) ||
          e.sourceUnit.toLowerCase().includes(term) ||
          e.items?.some((item) => item.name.toLowerCase().includes(term))
      );
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      result = result.filter((e) => new Date(e.createdDate) >= fromDate);
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((e) => new Date(e.createdDate) <= toDate);
    }

    // Sort results
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
          break;
        case 'items':
          comparison = (b.items?.length || 0) - (a.items?.length || 0);
          break;
        case 'event':
          comparison = (a.eventNumber || '').localeCompare(b.eventNumber || '', 'he');
          break;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [events, filters, sortBy, sortOrder]);

  const handleFilterChange = useCallback((newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters({});
    setSortBy('date');
    setSortOrder('desc');
  }, []);

  const handleExportAll = useCallback(() => {
    const timestamp = new Date().toLocaleDateString('he-IL');
    exportEventsToExcel(filteredEvents, `אירועים_${timestamp}.xlsx`);
  }, [filteredEvents]);

  const handleExportInspections = useCallback(() => {
    const timestamp = new Date().toLocaleDateString('he-IL');
    exportInspectionsToExcel(filteredEvents, `בדיקות_${timestamp}.xlsx`);
  }, [filteredEvents]);

  const stats = useMemo(
    () => ({
      total: filteredEvents.length,
      active: filteredEvents.filter((e) => e.status === 0).length,
      completed: filteredEvents.filter((e) => e.status === 1).length,
      totalItems: filteredEvents.reduce((sum, e) => sum + (e.items?.length || 0), 0),
    }),
    [filteredEvents]
  );

  if (loading && events.length === 0) {
    return <div className="history-loading">⏳ טוען רישומים...</div>;
  }

  return (
    <div className="history-container">
      {/* Header */}
      <div className="history-header">
        <div className="header-title">
          <h1>📜 רישומים וההיסטוריה</h1>
          <p>ניהול וניטור כל האירועים והבדיקות</p>
        </div>
        <button
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
          title="הצג/הסתר סננים"
        >
          {showFilters ? '⊟' : '⊞'} סננים
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      {showFilters && (
        <div className="filters-section">
          <div className="filter-grid">
            <div className="filter-group">
              <label>סוג אירוע:</label>
              <select
                value={filters.eventType ?? -1}
                onChange={(e) =>
                  handleFilterChange({
                    eventType: e.target.value === '-1' ? undefined : parseInt(e.target.value),
                  })
                }
              >
                <option value="-1">הכל</option>
                <option value="0">קבלת ציוד</option>
                <option value="1">החזרת ציוד</option>
                <option value="2">ניפוק ציוד</option>
                <option value="3">בדיקת ציוד</option>
              </select>
            </div>

            <div className="filter-group">
              <label>סטטוס:</label>
              <select
                value={filters.status ?? -1}
                onChange={(e) =>
                  handleFilterChange({ status: e.target.value === '-1' ? undefined : parseInt(e.target.value) })
                }
              >
                <option value="-1">הכל</option>
                <option value="0">פעיל</option>
                <option value="1">הושלם</option>
              </select>
            </div>

            <div className="filter-group">
              <label>מתאריך:</label>
              <input
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) => handleFilterChange({ fromDate: e.target.value || undefined })}
              />
            </div>

            <div className="filter-group">
              <label>עד תאריך:</label>
              <input
                type="date"
                value={filters.toDate || ''}
                onChange={(e) => handleFilterChange({ toDate: e.target.value || undefined })}
              />
            </div>

            <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
              <label>חיפוש:</label>
              <input
                type="text"
                placeholder="חפש לפי מס׳ אירוע, מקבל, פריט..."
                value={filters.searchTerm || ''}
                onChange={(e) => handleFilterChange({ searchTerm: e.target.value || undefined })}
              />
            </div>
          </div>

          <div className="filters-actions">
            <button className="btn-secondary" onClick={handleReset}>
              🔄 איפוס סננים
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-label">סה״כ אירועים</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat">
          <span className="stat-label">פעילים</span>
          <span className="stat-value" style={{ color: '#f59e0b' }}>{stats.active}</span>
        </div>
        <div className="stat">
          <span className="stat-label">הושלמו</span>
          <span className="stat-value" style={{ color: '#10b981' }}>{stats.completed}</span>
        </div>
        <div className="stat">
          <span className="stat-label">סה״כ פריטים</span>
          <span className="stat-value" style={{ color: '#3b82f6' }}>{stats.totalItems}</span>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="export-section">
        <button className="btn-export" onClick={handleExportAll} title="ייצא את כל האירועים">
          📊 ייצוא אירועים (Excel)
        </button>
        <button className="btn-export" onClick={handleExportInspections} title="ייצא תוצאות בדיקה">
          ✓ ייצוא בדיקות (Excel)
        </button>
      </div>

      {/* Sort Controls */}
      <div className="sort-section">
        <label>מיון:</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="date">לפי תאריך</option>
          <option value="items">לפי מספר פריטים</option>
          <option value="event">לפי מספר אירוע</option>
        </select>
        <button
          className="sort-order-btn"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          title="שנה כיוון מיון"
        >
          {sortOrder === 'desc' ? '⬇️' : '⬆️'}
        </button>
      </div>

      {/* Events Table */}
      <div className="table-section">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <p>📭 לא נמצאו אירועים התואמים לסננים שנבחרו</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>מס׳ אירוע</th>
                  <th>סוג</th>
                  <th>יחידה/מקבל</th>
                  <th>פריטים</th>
                  <th>תאריך</th>
                  <th>סטטוס</th>
                  <th>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className={`status-${event.status === 0 ? 'active' : 'completed'}`}>
                    <td className="event-number">{event.eventNumber}</td>
                    <td className="event-type">{getEventTypeIcon(event.eventType)} {getEventTypeName(event.eventType)}</td>
                    <td className="event-details">
                      <strong>{event.receiver}</strong>
                      <br />
                      <small>{event.sourceUnit}</small>
                    </td>
                    <td className="event-items">{event.items?.length || 0}</td>
                    <td className="event-date">{new Date(event.createdDate).toLocaleDateString('he-IL')}</td>
                    <td className="event-status">
                      {event.status === 0 ? (
                        <span className="badge badge-active">⚡ פעיל</span>
                      ) : (
                        <span className="badge badge-completed">✓ הושלם</span>
                      )}
                    </td>
                    <td className="event-action">
                      <button
                        className="btn-details"
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowDetailsModal(true);
                        }}
                      >
                        📋 פרטים
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>פרטי אירוע {selectedEvent.eventNumber}</h2>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="event-info-grid">
                <div className="info-item">
                  <label>סוג אירוע:</label>
                  <p>{getEventTypeIcon(selectedEvent.eventType)} {getEventTypeName(selectedEvent.eventType)}</p>
                </div>
                <div className="info-item">
                  <label>סטטוס:</label>
                  <p>
                    {selectedEvent.status === 0 ? (
                      <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⚡ פעיל</span>
                    ) : (
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ הושלם</span>
                    )}
                  </p>
                </div>
                <div className="info-item">
                  <label>יחידה מקור:</label>
                  <p>{selectedEvent.sourceUnit}</p>
                </div>
                <div className="info-item">
                  <label>שם מקבל:</label>
                  <p>{selectedEvent.receiver}</p>
                </div>
                <div className="info-item">
                  <label>תאריך יצירה:</label>
                  <p>{new Date(selectedEvent.createdDate).toLocaleString('he-IL')}</p>
                </div>
                <div className="info-item">
                  <label>סה״כ פריטים:</label>
                  <p className="highlight">{selectedEvent.items?.length || 0}</p>
                </div>
              </div>

              {selectedEvent.items && selectedEvent.items.length > 0 && (
                <div className="items-section">
                  <h3>פריטים</h3>
                  <div className="items-grid">
                    {selectedEvent.items.map((item) => (
                      <div key={item.id} className="item-card">
                        <div className="item-code">{item.makat}</div>
                        <div className="item-name">{item.name}</div>
                        <div className="item-qty">
                          <strong>{item.quantity}</strong> יחידות
                        </div>
                        {item.inspectionAction && (
                          <div className={`item-status inspection-${item.inspectionAction}`}>
                            {getInspectionActionName(item.inspectionAction)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function getEventTypeName(type: number): string {
  const types: { [key: number]: string } = {
    0: 'קבלת ציוד',
    1: 'החזרת ציוד',
    2: 'ניפוק ציוד',
    3: 'בדיקת ציוד',
  };
  return types[type] || 'לא ידוע';
}

function getEventTypeIcon(type: number): string {
  const icons: { [key: number]: string } = {
    0: '📦',
    1: '↩️',
    2: '📤',
    3: '🔍',
  };
  return icons[type] || '❓';
}

function getInspectionActionName(action: number): string {
  const actions: { [key: number]: string } = {
    0: 'ממתין',
    1: 'עבר ✓',
    2: 'נכשל ✗',
  };
  return actions[action] || 'לא ידוע';
}

export default HistoryPage;

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
