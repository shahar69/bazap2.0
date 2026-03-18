import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { eventApi, smartIntegrationApi } from '../services/apiClient';
import { exportEventsToExcel, exportInspectionsToExcel } from '../utils/excelExport';
import '../styles/history.css';
import { getErrorMessage } from '../utils/errors';

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
  orderNumber?: string;
  eventType: number;
  sourceUnit: string;
  receiver: string;
  status: number;
  statusLabel?: string;
  sapReady?: boolean;
  sapSyncStatus?: string;
  sapSyncMessage?: string;
  sapDocumentType?: string;
  sapDocEntry?: number | null;
  sapDocNum?: number | null;
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
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'items' | 'event'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sapActionLoadingId, setSapActionLoadingId] = useState<number | null>(null);

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
      setError(getErrorMessage(err, 'שגיאה בטעינת ההיסטוריה'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          (e.orderNumber || e.eventNumber).toLowerCase().includes(term) ||
          e.receiver.toLowerCase().includes(term) ||
          e.sourceUnit.toLowerCase().includes(term) ||
          e.items?.some((item) => item.name.toLowerCase().includes(term) || item.makat.toLowerCase().includes(term))
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
          comparison = (a.orderNumber || a.eventNumber || '').localeCompare(b.orderNumber || b.eventNumber || '', 'he');
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

  const handleExportAll = useCallback(async () => {
    const timestamp = new Date().toLocaleDateString('he-IL');
    await exportEventsToExcel(filteredEvents, `אירועים_${timestamp}.xlsx`);
  }, [filteredEvents]);

  const handleExportInspections = useCallback(async () => {
    const timestamp = new Date().toLocaleDateString('he-IL');
    await exportInspectionsToExcel(filteredEvents, `בדיקות_${timestamp}.xlsx`);
  }, [filteredEvents]);

  const handleExportSap = useCallback(async () => {
    try {
      setError('');
      setSuccess('');
      if (filteredEvents.length === 0) {
        setError('אין הזמנות מתאימות לייצוא');
        return;
      }

      const { blob, fileName } = await smartIntegrationApi.exportSap(filteredEvents.map((event) => event.id));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `sap_export_${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSuccess(`ייצוא SAP הוכן בהצלחה עבור ${filteredEvents.length} הזמנות`);
    } catch (err) {
      setError(getErrorMessage(err, 'שגיאה בייצוא חכם ל-SAP'));
    }
  }, [filteredEvents]);

  const handlePushSap = useCallback(async (eventId: number) => {
    try {
      setSapActionLoadingId(eventId);
      setError('');
      setSuccess('');
      const eventToExport = events.find((event) => event.id === eventId);
      const { blob, fileName } = await smartIntegrationApi.exportSap([eventId]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `sap_export_${eventId}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSuccess(`חבילת SAP עבור ${eventToExport?.orderNumber || eventToExport?.eventNumber || `הזמנה ${eventId}`} הוכנה והורדה`);
      await loadEvents();
    } catch (err) {
      setError(getErrorMessage(err, 'שגיאה בהכנת חבילת SAP'));
    } finally {
      setSapActionLoadingId(null);
    }
  }, [events]);

  const handleRetrySap = useCallback(async (eventId: number) => {
    try {
      setSapActionLoadingId(eventId);
      setError('');
      setSuccess('');
      const eventToExport = events.find((event) => event.id === eventId);
      const { blob, fileName } = await smartIntegrationApi.exportSap([eventId]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `sap_export_${eventId}_retry.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSuccess(`חבילת SAP חדשה הוכנה עבור ${eventToExport?.orderNumber || eventToExport?.eventNumber || `הזמנה ${eventId}`}`);
      await loadEvents();
    } catch (err) {
      setError(getErrorMessage(err, 'שגיאה בהכנת חבילת SAP חדשה'));
    } finally {
      setSapActionLoadingId(null);
    }
  }, [events]);

  const stats = useMemo(
    () => ({
      total: filteredEvents.length,
      active: filteredEvents.filter((e) => !isCompletedStatus(e.status)).length,
      completed: filteredEvents.filter((e) => isCompletedStatus(e.status)).length,
      totalItems: filteredEvents.reduce((sum, e) => sum + (e.items?.length || 0), 0),
    }),
    [filteredEvents]
  );

  if (loading && events.length === 0) {
    return <div className="history-loading">⏳ טוען רישומים...</div>;
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="header-title">
          <h1>📜 רישומים והיסטוריית פריטים</h1>
          <p>מעקב מלא אחרי הזמנות, מק״טים, תוצאות בדיקה וחבילות ייצוא ל-SAP</p>
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
      {success && <div className="alert alert-success">{success}</div>}
      <div className="alert alert-info">
        SAP Stage 1 פעיל: המערכת מכינה חבילות ייצוא מסודרות ל-SAP, לא מבצעת סנכרון ישיר.
      </div>

      {showFilters && (
        <div className="filters-section">
          <div className="filter-grid">
            <div className="filter-group">
              <label>סוג הזמנה:</label>
              <select
                value={filters.eventType ?? -1}
                onChange={(e) =>
                  handleFilterChange({
                    eventType: e.target.value === '-1' ? undefined : parseInt(e.target.value, 10),
                  })
                }
              >
                <option value="-1">הכל</option>
                <option value="0">קבלת ציוד</option>
                <option value="1">בדיקת ציוד</option>
                <option value="2">ניפוק ציוד</option>
              </select>
            </div>

            <div className="filter-group">
              <label>סטטוס:</label>
              <select
                value={filters.status ?? -1}
                onChange={(e) =>
                  handleFilterChange({
                    status: e.target.value === '-1' ? undefined : parseInt(e.target.value, 10),
                  })
                }
              >
                <option value="-1">הכל</option>
                <option value="0">טיוטה</option>
                <option value="1">ממתין לבחינה</option>
                <option value="2">בבחינה</option>
                <option value="3">הושלם</option>
                <option value="4">ארכיון</option>
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
                placeholder="חפש לפי מספר הזמנה, מק״ט, מקבל או פריט..."
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

      <div className="stats-bar">
        <div className="stat">
          <span className="stat-label">סה״כ הזמנות</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat">
          <span className="stat-label">פתוחות</span>
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

      <div className="export-section">
        <button className="btn-export" onClick={handleExportAll} title="ייצא את כל האירועים">
          📊 ייצוא הזמנות (Excel)
        </button>
        <button className="btn-export" onClick={handleExportInspections} title="ייצא תוצאות בדיקה">
          ✓ ייצוא בדיקות (Excel)
        </button>
        <button className="btn-export" onClick={handleExportSap} title="הורדת חבילת ייצוא ל-SAP">
          🏭 הורד חבילת SAP
        </button>
      </div>

      <div className="sort-section">
        <label>מיון:</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'items' | 'event')}>
          <option value="date">לפי תאריך</option>
          <option value="items">לפי מספר פריטים</option>
          <option value="event">לפי מספר הזמנה</option>
        </select>
        <button
          className="sort-order-btn"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          title="שנה כיוון מיון"
        >
          {sortOrder === 'desc' ? '⬇️' : '⬆️'}
        </button>
      </div>

      <div className="table-section">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <p>📭 לא נמצאו הזמנות התואמות לסננים שנבחרו</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>מס׳ הזמנה</th>
                  <th>סוג</th>
                  <th>יחידה/מקבל</th>
                  <th>פריטים</th>
                  <th>תאריך</th>
                  <th>סטטוס</th>
                  <th>מצב יצוא SAP</th>
                  <th>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className={`status-${isCompletedStatus(event.status) ? 'completed' : 'active'}`}>
                    <td className="event-number">{event.orderNumber || event.eventNumber}</td>
                    <td className="event-type">{getEventTypeIcon(event.eventType)} {getEventTypeName(event.eventType)}</td>
                    <td className="event-details">
                      <strong>{event.receiver}</strong>
                      <br />
                      <small>{event.sourceUnit}</small>
                    </td>
                    <td className="event-items">{event.items?.length || 0}</td>
                    <td className="event-date">{new Date(event.createdDate).toLocaleDateString('he-IL')}</td>
                    <td className="event-status">
                      <span className={`badge ${isCompletedStatus(event.status) ? 'badge-completed' : 'badge-active'}`}>
                        {event.statusLabel || getEventStatusName(event.status)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'grid', gap: '4px' }}>
                        <span className={`badge ${event.sapSyncStatus === 'exported' ? 'badge-completed' : event.sapReady ? 'badge-active' : 'badge'}`}>
                          {getSapStatusName(event)}
                        </span>
                        {event.sapDocNum ? <small>DocNum: {event.sapDocNum}</small> : null}
                      </div>
                    </td>
                    <td className="event-action">
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          className="btn-details"
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowDetailsModal(true);
                          }}
                        >
                          📋 פרטים
                        </button>
                        <button className="btn-details" disabled={sapActionLoadingId === event.id || !event.sapReady} onClick={() => handlePushSap(event.id)}>
                          {sapActionLoadingId === event.id ? '⏳' : 'הורד SAP'}
                        </button>
                        <button className="btn-details" disabled={sapActionLoadingId === event.id || event.sapSyncStatus !== 'failed'} onClick={() => handleRetrySap(event.id)}>
                          ייצא שוב
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDetailsModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>פרטי הזמנה {selectedEvent.orderNumber || selectedEvent.eventNumber}</h2>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="event-info-grid">
                <div className="info-item">
                  <label>סוג הזמנה:</label>
                  <p>{getEventTypeIcon(selectedEvent.eventType)} {getEventTypeName(selectedEvent.eventType)}</p>
                </div>
                <div className="info-item">
                  <label>סטטוס:</label>
                  <p>
                    <span style={{ color: isCompletedStatus(selectedEvent.status) ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                      {selectedEvent.statusLabel || getEventStatusName(selectedEvent.status)}
                    </span>
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
                <div className="info-item">
                  <label>מצב SAP:</label>
                  <p>{getSapStatusName(selectedEvent)}</p>
                </div>
                <div className="info-item">
                  <label>סוג מסמך יעד ב-SAP:</label>
                  <p>{selectedEvent.sapDocumentType || '-'}</p>
                </div>
                <div className="info-item">
                  <label>שלב חיבור:</label>
                  <p>Stage 1 - File Export</p>
                </div>
                <div className="info-item">
                  <label>סטטוס חבילת ייצוא:</label>
                  <p>{selectedEvent.sapSyncMessage || '-'}</p>
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
                        {item.inspectionAction !== undefined && (
                          <div className={`item-status inspection-${item.inspectionAction}`}>
                            {item.inspectionAction === 1 ? 'תקין' : item.inspectionAction === 2 ? 'מושבת' : 'ממתין'}
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

function getEventTypeName(type: number): string {
  const types: { [key: number]: string } = {
    0: 'קבלת ציוד',
    1: 'בדיקת ציוד',
    2: 'ניפוק ציוד',
  };
  return types[type] || 'לא ידוע';
}

function getEventTypeIcon(type: number): string {
  const icons: { [key: number]: string } = {
    0: '📦',
    1: '🔍',
    2: '📤',
  };
  return icons[type] || '❓';
}

function getEventStatusName(status: number): string {
  if (status === 3) return 'הושלם';
  if (status === 2) return 'בבחינה';
  if (status === 1) return 'ממתין לבחינה';
  if (status === 4) return 'ארכיון';
  return 'טיוטה';
}

function getSapStatusName(event: Event): string {
  if (event.sapSyncStatus === 'exported' || event.sapSyncStatus === 'synced') return 'חבילת SAP הוכנה';
  if (event.sapSyncStatus === 'failed') return 'ייצוא SAP נכשל';
  if (event.sapReady) return 'מוכן לייצוא SAP';
  return 'דורש השלמות לפני ייצוא';
}

function isCompletedStatus(status: number): boolean {
  return status === 3 || status === 4;
}

export default HistoryPage;
