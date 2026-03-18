import React, { useMemo, useState, useEffect } from 'react';
import { eventApi, inspectionApi } from '../services/apiClient';
import '../styles/inspection.css';
import { getErrorMessage } from '../utils/errors';

interface Alert {
  type: 'success' | 'error' | 'warning';
  message: string;
  id: string;
}

type DisableReasonOption = 'VisualDamage' | 'Scrap' | 'Malfunction' | 'MissingParts' | 'Expired' | 'Calibration' | 'Other';

const InspectionPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<DisableReasonOption | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [showSummary, setShowSummary] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [eventSort, setEventSort] = useState<'date' | 'items'>('date');
  const [itemSearch, setItemSearch] = useState('');
  const [itemFilter, setItemFilter] = useState<'all' | 'pending' | 'passed' | 'disabled'>('pending');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [disableMode, setDisableMode] = useState<'single' | 'bulk'>('single');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [gridSelectedIds, setGridSelectedIds] = useState<Set<number>>(new Set());
  const [reasonSuggestions, setReasonSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const currentItem = currentEvent?.items?.[currentItemIndex];

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showDisableModal || showBatchModal || showHelp) return;
      
      if (e.key === '1' || e.key === 'p') {
        handlePassDecision();
      } else if (e.key === '2' || e.key === 'd') {
        setShowDisableModal(true);
      } else if (e.key === 'b') {
        setShowBatchModal(true);
      } else if (e.key === 's') {
        setShowSummary(true);
      } else if (e.key === '?' || e.key === 'h') {
        setShowHelp(!showHelp);
      }
    };

    if (currentEvent) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [currentEvent, showDisableModal, showBatchModal, showHelp]);

  useEffect(() => {
    if (showDisableModal && currentItem) {
      loadReasonSuggestions(currentItem.itemMakat);
    }
  }, [showDisableModal, currentItem]);

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
        showAlert('warning', 'אין הזמנות ממתינות לבחינה');
      }
    } catch (error) {
      showAlert('error', getErrorMessage(error, 'שגיאה בטעינת הזמנות'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadReasonSuggestions = async (makat: string) => {
    try {
      const response = await fetch(`/api/inspection/suggestions/${encodeURIComponent(makat)}`);
      const suggestions = await response.json();
      setReasonSuggestions(suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions', error);
      setReasonSuggestions([]);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setNotes(suggestion);
    setShowSuggestions(false);
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
    setSelectedItemIds(new Set());
    setItemSearch('');
    setItemFilter('pending');
    showAlert('success', `הזמנה ${event.orderNumber || event.number} נבחרה`);
  };

  const recalcProgress = (items: any[] = []) => {
    const total = items.length;
    const completed = items.filter(i => i.inspectionStatus !== 0).length;
    const failed = items.filter(i => i.inspectionStatus === 2).length;
    const passed = items.filter(i => i.inspectionStatus === 1).length;
    return { total, completed, failed, passed, pending: total - completed };
  };

  const findNextPendingIndex = (items: any[] = []) => items.findIndex(i => i.inspectionStatus === 0);

  const { completed, pending } = recalcProgress(currentEvent?.items || []);

  const filteredEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    const list = [...events].filter((event) => {
      if (!query) return true;
      return [event.orderNumber || event.number, event.sourceUnit, event.receiver]
        .filter(Boolean)
        .some((value: string) => value.toLowerCase().includes(query));
    });

    list.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.createdDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.createdDate || 0).getTime();
      if (eventSort === 'items') {
        return (b.items?.length || 0) - (a.items?.length || 0);
      }
      return dateB - dateA;
    });

    return list;
  }, [events, eventSearch, eventSort]);

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    const items = currentEvent?.items || [];
    return items.filter((item: any) => {
      if (itemFilter === 'pending' && item.inspectionStatus !== 0) return false;
      if (itemFilter === 'passed' && item.inspectionStatus !== 1) return false;
      if (itemFilter === 'disabled' && item.inspectionStatus !== 2) return false;
      if (!query) return true;
      return [item.itemMakat, item.itemName]
        .filter(Boolean)
        .some((value: string) => value.toLowerCase().includes(query));
    });
  }, [currentEvent, itemFilter, itemSearch]);

  const toggleItemSelection = (itemId: number) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllPending = () => {
    const pendingIds = (currentEvent?.items || [])
      .filter((item: any) => item.inspectionStatus === 0)
      .map((item: any) => item.id);
    setSelectedItemIds(new Set(pendingIds));
  };

  const clearSelection = () => setSelectedItemIds(new Set());

  const toggleGridSelection = (itemId: number) => {
    setGridSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleGridBatchPass = async () => {
    if (gridSelectedIds.size === 0) {
      showAlert('warning', 'בחר לפחות פריט אחד');
      return;
    }

    try {
      setIsPrinting(true);
      const ids = Array.from(gridSelectedIds);
      
      for (const itemId of ids) {
        await inspectionApi.makeDecision(itemId, 'Pass', undefined, notes || undefined);
      }

      setCurrentEvent((prev: any) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((item: any) =>
          ids.includes(item.id)
            ? { ...item, inspectionStatus: 1 }
            : item
        );
        return { ...prev, items: updatedItems };
      });

      showAlert('success', `✅ ${ids.length} פריטים סומנו כתקינים`);
      setGridSelectedIds(new Set());
      setNotes('');
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בעדכון החלטות');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleGridBatchDisable = async () => {
    if (!selectedReason) {
      showAlert('warning', 'בחר סיבה להשבתה');
      return;
    }

    if (gridSelectedIds.size === 0) {
      showAlert('warning', 'בחר לפחות פריט אחד');
      return;
    }

    try {
      setIsPrinting(true);
      const ids = Array.from(gridSelectedIds);
      
      for (const itemId of ids) {
        await inspectionApi.makeDecision(itemId, 'Disabled', selectedReason, notes || undefined);
      }

      setCurrentEvent((prev: any) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((item: any) =>
          ids.includes(item.id)
            ? { ...item, inspectionStatus: 2, disableReason: selectedReason }
            : item
        );
        return { ...prev, items: updatedItems };
      });

      showAlert('success', `❌ ${ids.length} פריטים הושבתו`);
      setShowDisableModal(false);
      setSelectedReason(null);
      setNotes('');
      setGridSelectedIds(new Set());
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בעדכון החלטות');
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePassDecision = async () => {
    if (!currentItem) return;

    try {
      setIsPrinting(true);
      await inspectionApi.makeDecision(currentItem.id, 'Pass', undefined, notes || undefined);
      showAlert('success', `✅ ${currentItem.itemName} סומן כתקין`);
      setNotes(''); // Clear notes after decision
      advanceAfterDecision('Pass');
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בהקלטת החלטה');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBatchPass = async () => {
    if (!currentItem || batchQuantity < 1) return;

    try {
      setIsPrinting(true);
      const items = currentEvent?.items || [];
      const pendingItemsFromIndex = items
        .slice(currentItemIndex)
        .filter((item: any) => item.inspectionStatus === 0)
        .slice(0, batchQuantity);

      for (const item of pendingItemsFromIndex) {
        await inspectionApi.makeDecision(item.id, 'Pass', undefined, notes || undefined);
      }

      setCurrentEvent((prev: any) => {
        if (!prev) return prev;
        const ids = pendingItemsFromIndex.map((item: any) => item.id);
        const updatedItems = prev.items.map((item: any) =>
          ids.includes(item.id) ? { ...item, inspectionStatus: 1 } : item
        );
        if (autoAdvance) {
          const nextPending = findNextPendingIndex(updatedItems);
          if (nextPending >= 0) setCurrentItemIndex(nextPending);
        }
        return { ...prev, items: updatedItems };
      });

      showAlert('success', `✅ ${pendingItemsFromIndex.length} פריטים סומנו כתקינים`);
      setNotes('');
      setShowBatchModal(false);
      setBatchQuantity(1);
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בעיבוד אצווה');
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
        const htmlBlob = await inspectionApi.printLabel(currentItem.id, 1);
        downloadAndPrintLabel(htmlBlob, `label-${currentItem.itemMakat}-${Date.now()}.html`);
        showAlert('success', `❌ ${currentItem.itemName} הושבת - קובץ המדבקה עתיד להדפסה`);
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

  const handleBulkPassDecision = async () => {
    if (selectedItemIds.size === 0) {
      showAlert('warning', 'בחר לפחות פריט אחד');
      return;
    }

    try {
      setIsPrinting(true);
      const ids = Array.from(selectedItemIds);
      for (const itemId of ids) {
        await inspectionApi.makeDecision(itemId, 'Pass');
      }

      setCurrentEvent((prev: any) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((item: any) =>
          ids.includes(item.id)
            ? { ...item, inspectionStatus: 1, disableReason: null }
            : item
        );
        return { ...prev, items: updatedItems };
      });

      showAlert('success', `✅ ${ids.length} פריטים סומנו כתקינים`);
      clearSelection();
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בעדכון החלטות');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBulkDisableDecision = async () => {
    if (!selectedReason) {
      showAlert('warning', 'בחר סיבה להשבתה');
      return;
    }

    if (selectedItemIds.size === 0) {
      showAlert('warning', 'בחר לפחות פריט אחד');
      return;
    }

    try {
      setIsPrinting(true);
      const ids = Array.from(selectedItemIds);
      for (const itemId of ids) {
        await inspectionApi.makeDecision(itemId, 'Disabled', selectedReason, notes || undefined);
      }

      setCurrentEvent((prev: any) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((item: any) =>
          ids.includes(item.id)
            ? { ...item, inspectionStatus: 2, disableReason: selectedReason }
            : item
        );
        return { ...prev, items: updatedItems };
      });

      showAlert('success', `❌ ${ids.length} פריטים הושבתו`);
      setShowDisableModal(false);
      setSelectedReason(null);
      setNotes('');
      clearSelection();
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בעדכון החלטות');
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

      const nextPendingIndex = findNextPendingIndex(updatedItems);

      if (autoAdvance && nextPendingIndex >= 0) {
        setCurrentItemIndex(nextPendingIndex);
      } else if (autoAdvance && nextPendingIndex < 0) {
        showAlert('success', '🎉 סיימת לבחון את כל הפריטים!');
        setTimeout(() => {
          setCurrentEvent(null);
          loadEvents();
        }, 1200);
      }

      return { ...prev, items: updatedItems };
    });
  };

  const goNextItem = () => {
    if (!currentEvent?.items?.length) return;
    setCurrentItemIndex((prev) => Math.min(prev + 1, currentEvent.items.length - 1));
  };

  const goPrevItem = () => {
    if (!currentEvent?.items?.length) return;
    setCurrentItemIndex((prev) => Math.max(prev - 1, 0));
  };

  const downloadAndPrintLabel = (blob: Blob, filename: string) => {
    // Create a temporary window with the HTML content
    const url = window.URL.createObjectURL(blob);
    
    // First, download the file
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Then open in new tab for printing
    setTimeout(() => {
      const printWindow = window.open(url, 'print', 'height=600,width=800');
      if (printWindow) {
        // Wait for the content to load, then trigger print dialog
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        });
      }
    }, 500);
    
    // Clean up after a delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 2000);
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
          <p>בחר הזמנה לבדיקה</p>
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
              <p>טוען הזמנות...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h2>אין הזמנות לבחינה</h2>
              <p>כל ההזמנות נבחנו כבר או שאין הזמנות בהמתנה</p>
            </div>
          ) : (
            <div className="events-list-container">
              <div className="events-list-header">
                <h2>🎯 הזמנות בהמתנה: {filteredEvents.length}</h2>
                <div className="events-toolbar">
                  <input
                    className="events-search"
                    placeholder="חפש לפי מספר הזמנה, יחידה או מקבל..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                  />
                  <select
                    className="events-sort"
                    value={eventSort}
                    onChange={(e) => setEventSort(e.target.value as 'date' | 'items')}
                  >
                    <option value="date">מיון לפי תאריך</option>
                    <option value="items">מיון לפי פריטים</option>
                  </select>
                </div>
              </div>
              <div className="events-list">
                {filteredEvents.map((event) => (
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
                        {new Date(event.createdAt || event.createdDate).toLocaleDateString('he-IL')}
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
        <p>הזמנה {currentEvent?.orderNumber || currentEvent?.number}</p>
      </div>

      {alerts.map(alert => (
        <div key={alert.id} className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      ))}

      <div className="inspection-container">
        <div className="inspection-controls">
          <div className="inspection-stats">
            <div className="stat-card">
              <span>סה"כ</span>
              <strong>{totalItems}</strong>
            </div>
            <div className="stat-card success">
              <span>תקינים</span>
              <strong>{currentEvent?.items?.filter((i: any) => i.inspectionStatus === 1).length || 0}</strong>
            </div>
            <div className="stat-card danger">
              <span>מושבתים</span>
              <strong>{currentEvent?.items?.filter((i: any) => i.inspectionStatus === 2).length || 0}</strong>
            </div>
            <div className="stat-card warning">
              <span>ממתינים</span>
              <strong>{pending}</strong>
            </div>
          </div>

          <div className="inspection-actions">
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
              />
              <span>התקדמות אוטומטית</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button className="back-btn" onClick={goBack} disabled={isPrinting}>
            ⬅️ חזור
          </button>
          <button className="nav-btn" onClick={goPrevItem} disabled={currentItemIndex === 0}>
            ⏮ קודם
          </button>
          <button className="nav-btn" onClick={goNextItem} disabled={currentItemIndex >= totalItems - 1}>
            הבא ⏭
          </button>
          <button 
            className="summary-btn" 
            onClick={() => setShowSummary(true)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            📊 סיכום
          </button>
          <button 
            className="help-btn" 
            onClick={() => setShowHelp(!showHelp)}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            ❓ עזרה
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
            style={{
              background: viewMode === 'grid' ? '#8b5cf6' : '#6b7280',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            {viewMode === 'single' ? '🎯 תצוגת רשת' : '📱 תצוגה רגילה'}
          </button>
        </div>

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

        {/* Grid View Mode */}
        {viewMode === 'grid' ? (
          <div className="grid-inspection-view" style={{ marginBottom: '2rem' }}>
            {/* Grid Header */}
            <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                🎯 מצב תצוגת רשת - בחינה מהירה
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                נבחרו {gridSelectedIds.size} פריטים | {pending} ממתינים
              </div>
            </div>

            {/* Grid Items */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {currentEvent?.items
                ?.filter((item: any) => {
                  if (itemFilter === 'pending') return item.inspectionStatus === 0;
                  if (itemFilter === 'passed') return item.inspectionStatus === 1;
                  if (itemFilter === 'disabled') return item.inspectionStatus === 2;
                  return true;
                })
                ?.map((item: any) => (
                <div
                  key={item.id}
                  style={{
                    position: 'relative',
                    border: gridSelectedIds.has(item.id) ? '3px solid #10b981' : '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1rem',
                    background: gridSelectedIds.has(item.id) ? '#f0fdf4' : 'white',
                    cursor: item.inspectionStatus === 0 ? 'pointer' : 'default',
                    opacity: item.inspectionStatus !== 0 ? 0.6 : 1,
                    transition: 'all 0.2s',
                    boxShadow: gridSelectedIds.has(item.id) ? '0 4px 6px rgba(16, 185, 129, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => item.inspectionStatus === 0 && toggleGridSelection(item.id)}
                >
                  {/* Checkbox */}
                  {item.inspectionStatus === 0 && (
                    <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 10 }}>
                      <input
                        type="checkbox"
                        checked={gridSelectedIds.has(item.id)}
                        onChange={() => toggleGridSelection(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                      />
                    </div>
                  )}

                  {/* Status Badge */}
                  {item.inspectionStatus !== 0 && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '0.75rem', 
                      right: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      background: item.inspectionStatus === 1 ? '#d1fae5' : '#fee2e2',
                      color: item.inspectionStatus === 1 ? '#065f46' : '#991b1b'
                    }}>
                      {item.inspectionStatus === 1 ? '✅ תקין' : '❌ מושבת'}
                    </div>
                  )}
                  
                  {/* Item Icon/Preview */}
                  <div style={{ 
                    height: '120px', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3.5rem',
                    marginBottom: '0.75rem',
                    marginTop: '1.5rem'
                  }}>
                    📦
                  </div>
                  
                  {/* Item Details */}
                  <div style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem', wordBreak: 'break-word' }}>
                    {item.itemName}
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: '#6b7280', 
                    fontFamily: 'monospace',
                    background: '#f3f4f6',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                  }}>
                    {item.itemMakat}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#374151', fontWeight: '500' }}>
                    כמות: {item.quantity}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Filter Toolbar */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              marginBottom: '1rem',
              flexWrap: 'wrap' 
            }}>
              <button 
                onClick={() => setItemFilter('pending')}
                style={{
                  background: itemFilter === 'pending' ? '#3b82f6' : '#e5e7eb',
                  color: itemFilter === 'pending' ? 'white' : '#374151',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ⏳ ממתינים ({currentEvent?.items?.filter((i: any) => i.inspectionStatus === 0).length || 0})
              </button>
              <button 
                onClick={() => setItemFilter('passed')}
                style={{
                  background: itemFilter === 'passed' ? '#10b981' : '#e5e7eb',
                  color: itemFilter === 'passed' ? 'white' : '#374151',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✅ תקינים ({currentEvent?.items?.filter((i: any) => i.inspectionStatus === 1).length || 0})
              </button>
              <button 
                onClick={() => setItemFilter('disabled')}
                style={{
                  background: itemFilter === 'disabled' ? '#ef4444' : '#e5e7eb',
                  color: itemFilter === 'disabled' ? 'white' : '#374151',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ❌ מושבתים ({currentEvent?.items?.filter((i: any) => i.inspectionStatus === 2).length || 0})
              </button>
              <button 
                onClick={() => setItemFilter('all')}
                style={{
                  background: itemFilter === 'all' ? '#6b7280' : '#e5e7eb',
                  color: itemFilter === 'all' ? 'white' : '#374151',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📋 הכל ({currentEvent?.items?.length || 0})
              </button>
            </div>

            {/* Grid Actions Bar */}
            <div style={{ 
              position: 'sticky', 
              bottom: 0, 
              background: 'white', 
              padding: '1rem',
              borderTop: '3px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 -4px 6px rgba(0,0,0,0.1)',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleGridBatchPass}
                disabled={gridSelectedIds.size === 0 || isPrinting}
                style={{
                  flex: '1 1 200px',
                  background: gridSelectedIds.size === 0 ? '#d1d5db' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 1.5rem',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: gridSelectedIds.size === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: gridSelectedIds.size > 0 ? '0 4px 6px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              >
                ✅ סמן {gridSelectedIds.size} נבחרים כתקינים
              </button>
              
              <button
                onClick={() => {
                  if (gridSelectedIds.size === 0) {
                    showAlert('warning', 'בחר לפחות פריט אחד');
                    return;
                  }
                  setDisableMode('bulk');
                  setShowDisableModal(true);
                }}
                disabled={gridSelectedIds.size === 0 || isPrinting}
                style={{
                  flex: '1 1 200px',
                  background: gridSelectedIds.size === 0 ? '#d1d5db' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 1.5rem',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: gridSelectedIds.size === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: gridSelectedIds.size > 0 ? '0 4px 6px rgba(239, 68, 68, 0.4)' : 'none'
                }}
              >
                ❌ השבת {gridSelectedIds.size} נבחרים
              </button>
              
              <button
                onClick={() => {
                  const pendingIds = currentEvent?.items
                    ?.filter((i: any) => i.inspectionStatus === 0)
                    ?.map((i: any) => i.id) || [];
                  setGridSelectedIds(new Set(pendingIds));
                }}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                🎯 בחר כל הממתינים
              </button>
              
              <button
                onClick={() => setGridSelectedIds(new Set())}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                🗑️ נקה בחירה
              </button>
            </div>
          </div>
        ) : (
          /* Single Item View (existing layout) */
          <div className="inspection-layout">
            <aside className="inspection-sidebar">
            <div className="sidebar-header">
              <div>
                <h3>רשימת פריטים</h3>
                <span className="sidebar-subtitle">נבחרו {selectedItemIds.size} פריטים</span>
              </div>
              <div className="sidebar-actions">
                <button className="mini-btn" onClick={selectAllPending}>בחר ממתינים</button>
                <button className="mini-btn" onClick={clearSelection}>נקה</button>
              </div>
            </div>

            <input
              className="sidebar-search"
              placeholder="חיפוש פריט..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />

            <div className="item-filters">
              <button className={itemFilter === 'pending' ? 'active' : ''} onClick={() => setItemFilter('pending')}>ממתינים</button>
              <button className={itemFilter === 'passed' ? 'active' : ''} onClick={() => setItemFilter('passed')}>תקינים</button>
              <button className={itemFilter === 'disabled' ? 'active' : ''} onClick={() => setItemFilter('disabled')}>מושבתים</button>
              <button className={itemFilter === 'all' ? 'active' : ''} onClick={() => setItemFilter('all')}>הכל</button>
            </div>

            <div className="bulk-actions">
              <button className="bulk-pass" onClick={handleBulkPassDecision} disabled={isPrinting || selectedItemIds.size === 0}>
                ✅ תקין לנבחרים
              </button>
              <button
                className="bulk-disable"
                onClick={() => {
                  if (selectedItemIds.size === 0) {
                    showAlert('warning', 'בחר לפחות פריט אחד');
                    return;
                  }
                  setDisableMode('bulk');
                  setShowDisableModal(true);
                }}
                disabled={isPrinting || selectedItemIds.size === 0}
              >
                ❌ השבת לנבחרים
              </button>
            </div>

            <div className="item-queue">
              {filteredItems.map((item: any) => {
                const originalIndex = currentEvent?.items?.findIndex((i: any) => i.id === item.id) ?? 0;
                return (
                  <button
                    key={item.id}
                    className={`queue-item ${originalIndex === currentItemIndex ? 'active' : ''} status-${item.inspectionStatus}`}
                    onClick={() => setCurrentItemIndex(originalIndex)}
                  >
                    <input
                      type="checkbox"
                      className="queue-checkbox"
                      checked={selectedItemIds.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="queue-info">
                      <div className="queue-title">{item.itemName}</div>
                      <div className="queue-meta">{item.itemMakat} • כמות: {item.quantity}</div>
                    </div>
                    <span className="queue-status">
                      {item.inspectionStatus === 0 && '⏳'}
                      {item.inspectionStatus === 1 && '✅'}
                      {item.inspectionStatus === 2 && '❌'}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="inspection-main">
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
                  
                  <textarea
                    placeholder="הערות לפריט זה (לא חובה)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ 
                      width: '100%', 
                      minHeight: '60px', 
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit'
                    }}
                    disabled={isPrinting}
                  />

                  <div className="decision-buttons">
                    <button
                      className="pass-btn"
                      onClick={handlePassDecision}
                      disabled={isPrinting || showDisableModal}
                      title="קיצור: 1 או P"
                    >
                      <span>✅</span>
                      <span>תקין</span>
                    </button>

                    <button
                      className="fail-btn"
                      onClick={() => {
                        setDisableMode('single');
                        setShowDisableModal(true);
                      }}
                      disabled={isPrinting || showDisableModal}
                      title="קיצור: 2 או D"
                    >
                      <span>❌</span>
                      <span>משהו לא בסדר</span>
                    </button>

                    <button
                      className="batch-btn"
                      onClick={() => setShowBatchModal(true)}
                      disabled={isPrinting || pending < 2}
                      title="קיצור: B"
                      style={{
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '1rem 1.5rem',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        cursor: pending < 2 ? 'not-allowed' : 'pointer',
                        opacity: pending < 2 ? 0.5 : 1,
                        transition: 'all 0.3s ease',
                        flex: 1
                      }}
                    >
                      <span>🚀</span>
                      <span>עיבוד אצווה</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
          </div>
        )}
      </div>

      {/* Disable Reason Modal */}
      {showDisableModal && (
        <div className="modal-overlay" onClick={() => !isPrinting && setShowDisableModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🤔 בחר סיבת השבתה {disableMode === 'bulk' ? '(לנבחרים)' : ''}</h3>

            {/* Smart Suggestions */}
            {reasonSuggestions.length > 0 && (
              <div style={{ 
                background: '#f0f9ff', 
                padding: '1rem', 
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '2px solid #3b82f6'
              }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1e40af' }}>
                  💡 הצעות חכמות (לחץ להשתמש):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {reasonSuggestions.slice(0, 6).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => applySuggestion(suggestion)}
                      style={{
                        background: 'white',
                        border: '2px solid #3b82f6',
                        color: '#1e40af',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#3b82f6';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.color = '#1e40af';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <textarea
                placeholder="הערות נוספות (התחל להקליד או בחר הצעה...)"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setShowSuggestions(e.target.value.length > 0 && reasonSuggestions.length > 0);
                }}
                onFocus={() => setShowSuggestions(notes.length > 0 && reasonSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                style={{ 
                  width: '100%', 
                  minHeight: '80px', 
                  padding: '0.75rem', 
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit'
                }}
                disabled={isPrinting}
              />
              
              {/* Live autocomplete dropdown */}
              {showSuggestions && notes.length >= 2 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  marginTop: '0.25rem'
                }}>
                  {reasonSuggestions
                    .filter(s => s.toLowerCase().includes(notes.toLowerCase()))
                    .slice(0, 5)
                    .map((suggestion, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => applySuggestion(suggestion)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: idx < 4 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontWeight: '600', color: '#1e40af' }}>{suggestion}</div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

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
                🔴 נזק ויזואלי
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
                🗑️ גרוטאות
              </button>

              <button
                className="reason-btn"
                onClick={() => setSelectedReason('Malfunction')}
                style={{
                  borderColor: selectedReason === 'Malfunction' ? '#ef4444' : undefined,
                  background: selectedReason === 'Malfunction' ? '#fee2e2' : undefined,
                }}
                disabled={isPrinting}
              >
                ⚠️ תקלה/לא תקין
              </button>

              <button
                className="reason-btn"
                onClick={() => setSelectedReason('MissingParts')}
                style={{
                  borderColor: selectedReason === 'MissingParts' ? '#ef4444' : undefined,
                  background: selectedReason === 'MissingParts' ? '#fee2e2' : undefined,
                }}
                disabled={isPrinting}
              >
                🔧 חלקים חסרים
              </button>

              <button
                className="reason-btn"
                onClick={() => setSelectedReason('Expired')}
                style={{
                  borderColor: selectedReason === 'Expired' ? '#ef4444' : undefined,
                  background: selectedReason === 'Expired' ? '#fee2e2' : undefined,
                }}
                disabled={isPrinting}
              >
                ⏰ פג תוקף
              </button>

              <button
                className="reason-btn"
                onClick={() => setSelectedReason('Calibration')}
                style={{
                  borderColor: selectedReason === 'Calibration' ? '#ef4444' : undefined,
                  background: selectedReason === 'Calibration' ? '#fee2e2' : undefined,
                }}
                disabled={isPrinting}
              >
                📏 טעון כיול
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
                onClick={viewMode === 'grid' ? handleGridBatchDisable : (disableMode === 'bulk' ? handleBulkDisableDecision : handleDisableDecision)}
                disabled={!selectedReason || isPrinting}
              >
                {isPrinting ? '⏳ מעבד...' : '✅ אישור'}
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

      {/* Batch Processing Modal */}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🚀 עיבוד אצווה - פריטים זהים</h3>
            <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
              סמן מספר פריטים זהים רצופים כתקינים בבת אחת
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                כמה פריטים לעבד? (נותרו {pending} ממתינים)
              </label>
              <input
                type="number"
                min="1"
                max={pending}
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(Math.min(parseInt(e.target.value) || 1, pending))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1.1rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb'
                }}
              />
            </div>

            <textarea
              placeholder="הערות משותפות לכל הפריטים (לא חובה)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', minHeight: '60px', marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px' }}
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleBatchPass}
                disabled={isPrinting || batchQuantity < 1}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                {isPrinting ? '⏳ מעבד...' : `✅ אשר ${batchQuantity} פריטים כתקינים`}
              </button>
              <button
                onClick={() => {
                  setShowBatchModal(false);
                  setBatchQuantity(1);
                }}
                disabled={isPrinting}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummary && (
        <div className="modal-overlay" onClick={() => setShowSummary(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>📊 סיכום בחינה - הזמנה {currentEvent?.orderNumber || currentEvent?.number}</h3>
            
            <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                  {currentEvent?.items?.filter((i: any) => i.inspectionStatus === 1).length || 0}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>תקינים ✅</div>
              </div>
              <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                  {currentEvent?.items?.filter((i: any) => i.inspectionStatus === 2).length || 0}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>מושבתים ❌</div>
              </div>
              <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {pending}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>ממתינים ⏳</div>
              </div>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', maxHeight: '400px', overflow: 'auto' }}>
              <h4 style={{ marginTop: 0 }}>רשימת פריטים:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#e5e7eb', fontWeight: 'bold' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid #d1d5db' }}>מק״ט</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid #d1d5db' }}>שם פריט</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #d1d5db' }}>כמות</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #d1d5db' }}>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEvent?.items?.map((item: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>{item.itemMakat}</td>
                      <td style={{ padding: '0.5rem' }}>{item.itemName}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        {item.inspectionStatus === 0 && <span style={{ color: '#f59e0b' }}>⏳ ממתין</span>}
                        {item.inspectionStatus === 1 && <span style={{ color: '#10b981' }}>✅ תקין</span>}
                        {item.inspectionStatus === 2 && <span style={{ color: '#ef4444' }}>❌ מושבת</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowSummary(false)}
              style={{
                marginTop: '1rem',
                width: '100%',
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>❓ עזרה - קיצורי מקלדת</h3>
            
            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>1 או P</td>
                    <td style={{ padding: '0.5rem' }}>סמן פריט כתקין ✅</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>2 או D</td>
                    <td style={{ padding: '0.5rem' }}>פתח חלון השבתה ❌</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>B</td>
                    <td style={{ padding: '0.5rem' }}>עיבוד אצווה 🚀</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>S</td>
                    <td style={{ padding: '0.5rem' }}>הצג סיכום 📊</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>? או H</td>
                    <td style={{ padding: '0.5rem' }}>עזרה זו ❓</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ background: '#dbeafe', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ marginTop: 0, color: '#1e40af' }}>💡 טיפים:</h4>
              <ul style={{ margin: 0, paddingRight: '1.5rem', color: '#1e40af' }}>
                <li>השתמש בעיבוד אצווה לפריטים זהים רצופים</li>
                <li>הוסף הערות לכל פריט לתיעוד טוב יותר</li>
                <li>בדוק את הסיכום לפני סיום ההזמנה</li>
                <li>מדבקות יופקו אוטומטית לפריטים מושבתים</li>
              </ul>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              style={{
                width: '100%',
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              הבנתי!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionPage;
