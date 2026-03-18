import React, { useState, useEffect, useRef, useCallback } from 'react';
import { eventApi, itemSearchApi, smartIntegrationApi } from '../services/apiClient';
import ExcelJS from 'exceljs';
import '../styles/warehouse.css';
import { getErrorMessage } from '../utils/errors';

interface Alert {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  id: string;
}

interface QuickAddModal {
  visible: boolean;
  item: any;
  quantity: number;
}

interface SmartImportPreview {
  usedAi?: boolean;
  orderNumber?: string;
  sourceUnit?: string;
  receiver?: string;
  warnings?: string[];
  lines?: Array<{
    makat: string;
    itemName: string;
    quantity: number;
    itemId?: number | null;
    matchedCatalogItem?: boolean;
    suggestedStatus?: string;
    sapItemCode?: string;
    matchStatus?: string;
    confidence?: number;
    warnings?: string[];
  }>;
}

const ReceivingPage: React.FC = () => {
  const [event, setEvent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [sourceUnit, setSourceUnit] = useState('');
  const [receiver, setReceiver] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [quickAddModal, setQuickAddModal] = useState<QuickAddModal>({ visible: false, item: null, quantity: 1 });
  const [showHelp, setShowHelp] = useState(false);
  const [smartImportText, setSmartImportText] = useState('');
  const [smartImportPreview, setSmartImportPreview] = useState<SmartImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<any>(null);

  useEffect(() => {
    loadRecentItems();
    
    // Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Help modal: ? or H
      if ((e.key === '?' || e.key.toLowerCase() === 'h') && !e.ctrlKey && !e.altKey) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowHelp(prev => !prev);
        }
      }
      // Focus search: F or /
      if ((e.key === 'f' || e.key === '/') && !e.ctrlKey && !e.altKey && event) {
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
      // Escape: close modals
      if (e.key === 'Escape') {
        setShowHelp(false);
        setQuickAddModal({ visible: false, item: null, quantity: 1 });
        setSearchQuery('');
        setSearchResults([]);
      }
      // Ctrl+Enter: submit event
      if (e.ctrlKey && e.key === 'Enter' && event && event.items?.length > 0) {
        e.preventDefault();
        completeEvent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event]);

  const loadRecentItems = async () => {
    try {
      const items = await itemSearchApi.getRecent(12);
      setRecentItems(items || []);
    } catch (error) {
      showAlert('error', 'שגיאה בטעינת פריטים אחרונים');
    }
  };

  const showAlert = (type: Alert['type'], message: string) => {
    const id = Date.now().toString();
    setAlerts(prev => [...prev, { type, message, id }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 4000);
  };

  const createEvent = async () => {
    if (!sourceUnit.trim()) {
      showAlert('warning', 'יש להזין יחידה מקור');
      return;
    }
    if (!receiver.trim()) {
      showAlert('warning', 'יש להזין שם מקבל');
      return;
    }

    const validImportLines = (smartImportPreview?.lines || []).filter(
      (line) => line.quantity > 0 && (line.itemId || line.makat?.trim() || line.itemName?.trim())
    );
    const importOrderNumber = smartImportPreview?.orderNumber || '';

    if (smartImportPreview && smartImportPreview.lines && validImportLines.length === 0) {
      showAlert('warning', 'הייבוא החכם לא מכיל שורות תקינות ליצירת הזמנה');
      return;
    }

    try {
      setIsCreatingEvent(true);
      const createdEvent = validImportLines.length
        ? await smartIntegrationApi.commitImport({
            orderNumber: importOrderNumber,
            sourceUnit,
            receiver,
            eventType: 0,
            lines: validImportLines,
          })
        : await eventApi.createEvent(sourceUnit, receiver, 'Receiving');

      setEvent(createdEvent);
      showAlert('success', `✅ הזמנה ${createdEvent.orderNumber || createdEvent.number} נוצרה בהצלחה`);
      setSourceUnit('');
      setReceiver('');
      setSmartImportText('');
      setSmartImportPreview(null);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } catch (error) {
      showAlert('error', getErrorMessage(error, 'שגיאה ביצירת הזמנה'));
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      let text = '';

      if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv') || file.type.startsWith('text/')) {
        text = await file.text();
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];
        if (!sheet) {
          showAlert('warning', 'לא נמצאו גיליונות תקינים בקובץ');
          return;
        }
        text = sheet.getSheetValues()
          .slice(1)
          .map((row: any) => Array.isArray(row) ? row.slice(1).join('\t') : '')
          .filter(Boolean)
          .join('\n');
      } else {
        showAlert('warning', 'נתמך כרגע: CSV, TXT, XLSX');
        return;
      }

      setSmartImportText(text);
      const preview = await smartIntegrationApi.previewImport(text, file.name);
      setSmartImportPreview(preview);
      if (preview.sourceUnit) setSourceUnit(preview.sourceUnit);
      if (preview.receiver) setReceiver(preview.receiver);
      showAlert(preview.lines?.length ? 'success' : 'warning', preview.lines?.length ? 'הקובץ נותח והוכן לייבוא חכם' : 'הקובץ נותח אך לא זוהו שורות פריטים תקינות');
    } catch (error) {
      showAlert('error', getErrorMessage(error, 'שגיאה בקריאת קובץ הייבוא'));
    }
  };

  const runSmartImport = async () => {
    if (!smartImportText.trim()) {
      showAlert('warning', 'הדבק טקסט לפני ניתוח חכם');
      return;
    }

    try {
      setIsImporting(true);
      const preview = await smartIntegrationApi.previewImport(smartImportText);
      setSmartImportPreview(preview);

      if (preview.sourceUnit) {
        setSourceUnit(preview.sourceUnit);
      }
      if (preview.receiver) {
        setReceiver(preview.receiver);
      }

      showAlert(preview.lines?.length ? 'success' : 'warning', preview.lines?.length ? (preview.usedAi ? 'הייבוא נותח עם AI והוכן להזמנה' : 'הייבוא נותח והוכן להזמנה') : 'הייבוא נותח אך לא זוהו שורות פריטים תקינות');
    } catch (error) {
      showAlert('error', getErrorMessage(error, 'שגיאה בניתוח הייבוא החכם'));
    } finally {
      setIsImporting(false);
    }
  };

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (value.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await itemSearchApi.search(value, 15);
        setSearchResults(results || []);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
  }, []);

  const addItemToCart = async (item: any, quantity: number = 1) => {
    if (!event) {
      showAlert('warning', 'יש ליצור הזמנה קודם');
      return;
    }

    const existingItem = event.items?.find((ei: any) => ei.itemMakat === item.makat);
    const currentQty = existingItem?.quantity || 0;
    const newQty = currentQty + quantity;

    try {
      setIsLoading(true);
      const updatedEvent = await eventApi.addItem(
        event.id,
        item.makat,
        item.name,
        newQty
      );
      if (updatedEvent) {
        setEvent(updatedEvent);
        if (existingItem) {
          showAlert('info', `${item.name} - כמות עודכנה ל-${newQty}`);
        } else {
          showAlert('success', `✅ ${item.name} (${quantity}x) התווסף לסל`);
        }
        setSearchQuery('');
        setSearchResults([]);
        if (searchInputRef.current) searchInputRef.current.focus();
      }
    } catch (error) {
      showAlert('error', getErrorMessage(error, 'שגיאה בהוספת פריט'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemQty = async (itemId: string, newQty: number) => {
    if (newQty < 1) {
      // If quantity reaches 0, remove the item
      removeItem(itemId);
      return;
    }

    const item = event.items?.find((ei: any) => ei.id.toString() === itemId.toString());
    if (!item) return;

    try {
      setIsLoading(true);
      // Update the quantity by removing old and adding new
      // Calculate the difference to add/remove
      const quantityDifference = newQty - item.quantity;
      
      let updatedEvent;
      if (quantityDifference > 0) {
        // The backend expects the target quantity, not the delta.
        updatedEvent = await eventApi.addItem(
          event.id,
          item.itemMakat,
          item.itemName,
          newQty
        );
      } else if (quantityDifference < 0) {
        // Reduce items - remove and re-add with new quantity
        await eventApi.removeItem(event.id, item.id);
        updatedEvent = await eventApi.addItem(
          event.id,
          item.itemMakat,
          item.itemName,
          newQty
        );
      } else {
        // No change needed
        return;
      }
      
      if (updatedEvent) {
        setEvent(updatedEvent);
        showAlert('info', `${item.itemName} - כמות עודכנה ל-${newQty}`);
      }
    } catch (error) {
      showAlert('error', getErrorMessage(error, 'שגיאה בעדכון כמות'));
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!event) {
      showAlert('warning', 'אין הזמנה פעילה להסרת פריט');
      return;
    }

    try {
      setIsLoading(true);
      const updatedEvent = await eventApi.removeItem(event.id, parseInt(itemId));
      setEvent(updatedEvent);
      showAlert('success', 'פריט הוסר מהסל');
    } catch (error) {
      showAlert('error', getErrorMessage(error, 'שגיאה בהסרת פריט'));
    } finally {
      setIsLoading(false);
    }
  };

  const completeEvent = async () => {
    if (!event.items || event.items.length === 0) {
      showAlert('warning', 'יש להוסיף לפחות פריט אחד');
      return;
    }

    const confirmed = window.confirm(
      `לשלוח לבחינה את הזמנה ${event.orderNumber || event.number}? ${event.items.length} פריטים שונים (סה״כ ${totalItems} יחידות)`
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await eventApi.submitForInspection(event.id);
      showAlert('success', '✅ ההזמנה הוגשה לבחינה בהצלחה. הפריטים מוכנים לבדיקה');
      setTimeout(() => {
        setEvent(null);
        setSourceUnit('');
        setReceiver('');
        loadRecentItems(); // Refresh recent items
      }, 1500);
    } catch (error) {
      showAlert('error', getErrorMessage(error, 'שגיאה בהגשת הזמנה לבחינה'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetEvent = () => {
    const confirmed = window.confirm('לבטל את ההזמנה הנוכחית? כל הפריטים יימחקו');
    if (confirmed) {
      setEvent(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const openQuickAddModal = (item: any) => {
    setQuickAddModal({ visible: true, item, quantity: 1 });
  };

  const confirmQuickAdd = () => {
    if (quickAddModal.item && quickAddModal.quantity > 0) {
      addItemToCart(quickAddModal.item, quickAddModal.quantity);
      setQuickAddModal({ visible: false, item: null, quantity: 1 });
    }
  };

  // Event creation form
  if (!event) {
    return (
      <div className="warehouse-page">
        <div className="warehouse-header">
          <h1>📦 קליטת ציוד</h1>
          <p>יצירת הזמנת קליטה חדשה</p>
          <button 
            className="help-icon-btn"
            onClick={() => setShowHelp(true)}
            title="עזרה (לחץ ?)"
          >
            ❓
          </button>
        </div>

        {alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.type}`}>
            {alert.message}
          </div>
        ))}

        {showHelp && (
          <div className="modal-overlay" onClick={() => setShowHelp(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>📖 עזרה - קיצורי מקלדת</h2>
              <div className="help-grid">
                <div><kbd>?</kbd> או <kbd>H</kbd></div><div>פתיחת/סגירת עזרה</div>
                <div><kbd>F</kbd> או <kbd>/</kbd></div><div>מיקוד בשורת החיפוש</div>
                <div><kbd>Esc</kbd></div><div>סגירת חלונות וביטול חיפוש</div>
                <div><kbd>Ctrl</kbd>+<kbd>Enter</kbd></div><div>שליחה מהירה לבחינה</div>
                <div><kbd>Enter</kbd></div><div>אישור הוספת פריט/כמות</div>
              </div>
              <h3 style={{ marginTop: '1.5rem' }}>💡 טיפים</h3>
              <ul style={{ textAlign: 'right', lineHeight: '1.8' }}>
                <li>החיפוש מתחיל אוטומטית אחרי הקלדה</li>
                <li>לחיצה על פריט בתוצאות מוסיפה אותו מיד</li>
                <li>לחיצה על פריט אחרון פותחת בחירת כמות</li>
                <li>שימוש ב-+/- בסל לעדכון כמות מהיר</li>
                <li>כמות 0 מסירה את הפריט מהסל</li>
              </ul>
              <button className="modal-close-btn" onClick={() => setShowHelp(false)}>
                ✖ סגור
              </button>
            </div>
          </div>
        )}

        <div className="warehouse-container">
          <div className="warehouse-section" style={{ gridColumn: '1 / -1' }}>
            <h2>🤖 ייבוא חכם להזמנה</h2>
            <div className="smart-import-panel">
              <p className="smart-import-description">
                הדבק טקסט חופשי, TSV, CSV או שורות הזמנה. המערכת תנסה לחלץ מספר הזמנה, יחידה, מקבל ושורות מק״ט אוטומטית.
              </p>
              <textarea
                className="smart-import-textarea"
                placeholder={"דוגמה:\nמספר הזמנה: 45000123\nיחידה: פלוגה א\nמקבל: רס\"ל כהן\nMKT-001\tסוללה נטענת\t4"}
                value={smartImportText}
                onChange={(e) => setSmartImportText(e.target.value)}
              />
              <div className="smart-import-actions">
                <button className="create-event-btn" type="button" onClick={runSmartImport} disabled={isImporting || !smartImportText.trim()}>
                  {isImporting ? '⏳ מנתח...' : '🧠 נתח ייבוא חכם'}
                </button>
                <label className="smart-import-file-btn">
                  📎 העלה CSV/XLSX
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleImportFile(file);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </label>
              </div>

              {smartImportPreview && (
                <div className="smart-import-preview">
                  <div className="smart-import-meta">
                    <div><strong>מספר הזמנה:</strong> {smartImportPreview.orderNumber || 'לא זוהה'}</div>
                    <div><strong>יחידה:</strong> {smartImportPreview.sourceUnit || 'לא זוהתה'}</div>
                    <div><strong>מקבל:</strong> {smartImportPreview.receiver || 'לא זוהה'}</div>
                    <div><strong>מנוע ניתוח:</strong> {smartImportPreview.usedAi ? 'AI' : 'Heuristic'}</div>
                  </div>

                  {!!smartImportPreview.warnings?.length && (
                    <div className="smart-import-warnings">
                      {smartImportPreview.warnings.map((warning, index) => (
                        <div key={index} className="alert alert-warning">{warning}</div>
                      ))}
                    </div>
                  )}

                  <div className="smart-import-lines">
                    {(smartImportPreview.lines || []).map((line, index) => (
                      <div key={`${line.makat}-${index}`} className="smart-import-line">
                          <strong>{line.makat || 'ללא מק״ט'}</strong>
                          <span>{line.itemName}</span>
                          <span>כמות: {line.quantity}</span>
                          <span>{line.matchStatus === 'matched' ? 'מותאם לקטלוג' : line.matchStatus === 'ambiguous' ? 'דורש הכרעה' : 'דורש בדיקה'}</span>
                          <span>ביטחון: {Math.round((line.confidence || 0) * 100)}%</span>
                          <span>{line.sapItemCode ? `SAP: ${line.sapItemCode}` : 'לא מוכן ל-SAP'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
              )}
            </div>
          </div>

          <div className="warehouse-section" style={{ gridColumn: '1 / -1' }}>
            <h2>⚙️ פרטי הזמנה חדשה</h2>
            
            <div className="event-creation-form">
              <div className="form-row">
                <div className="form-group">
                  <label>יחידה מקור</label>
                  <input
                    type="text"
                    placeholder="לדוגמה: מחלקה א, מחסן צפון"
                    value={sourceUnit}
                    onChange={(e) => setSourceUnit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createEvent()}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>שם מקבל הציוד</label>
                  <input
                    type="text"
                    placeholder="שם המקבל"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createEvent()}
                  />
                </div>
              </div>

              <button 
                className="create-event-btn" 
                onClick={createEvent} 
                disabled={isCreatingEvent || !sourceUnit.trim() || !receiver.trim()}
              >
                {isCreatingEvent ? '⏳ יוצר הזמנה...' : '✅ צור הזמנת קליטה (Enter)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active event with cart
  const totalItems = event.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  return (
    <div className="warehouse-page">
      <div className="warehouse-header">
        <h1>📦 קליטת ציוד</h1>
        <p>הזמנה פעילה: <strong>{event.orderNumber || event.number}</strong></p>
        <button 
          className="help-icon-btn"
          onClick={() => setShowHelp(true)}
          title="עזרה (לחץ ?)"
        >
          ❓
        </button>
      </div>

      {alerts.map(alert => (
        <div key={alert.id} className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      ))}

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>📖 עזרה - קיצורי מקלדת</h2>
            <div className="help-grid">
              <div><kbd>?</kbd> או <kbd>H</kbd></div><div>פתיחת/סגירת עזרה</div>
              <div><kbd>F</kbd> או <kbd>/</kbd></div><div>מיקוד בשורת החיפוש</div>
              <div><kbd>Esc</kbd></div><div>סגירת חלונות וביטול חיפוש</div>
              <div><kbd>Ctrl</kbd>+<kbd>Enter</kbd></div><div>שליחה מהירה לבחינה</div>
            </div>
            <button className="modal-close-btn" onClick={() => setShowHelp(false)}>
              ✖ סגור
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {quickAddModal.visible && (
        <div className="modal-overlay" onClick={() => setQuickAddModal({ visible: false, item: null, quantity: 1 })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2>➕ הוסף לסל</h2>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              <strong>{quickAddModal.item?.name}</strong> ({quickAddModal.item?.makat})
            </p>
            <div className="form-group">
              <label>כמות:</label>
              <input
                type="number"
                min="1"
                value={quickAddModal.quantity}
                onChange={(e) => setQuickAddModal(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                onKeyPress={(e) => e.key === 'Enter' && confirmQuickAdd()}
                autoFocus
                style={{ width: '100%', padding: '0.5rem', fontSize: '1.1rem', textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
              <button 
                className="modal-close-btn" 
                onClick={() => setQuickAddModal({ visible: false, item: null, quantity: 1 })}
                style={{ flex: 1 }}
              >
                ביטול
              </button>
              <button 
                className="create-event-btn" 
                onClick={confirmQuickAdd}
                style={{ flex: 1 }}
              >
                ✅ הוסף
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="warehouse-container">
        {/* LEFT COLUMN: Search & Recent */}
        <div className="warehouse-section">
          <h2>🔍 חפוש ופריטים אחרונים</h2>

          <div className="event-status">
            <h3>פרטי הזמנה</h3>
            <div className="event-info">
              <div className="event-info-item">
                <strong>מספר הזמנה</strong>
                {event.orderNumber || event.number}
              </div>
              <div className="event-info-item">
                <strong>יחידה</strong>
                {event.sourceUnit}
              </div>
              <div className="event-info-item">
                <strong>מקבל</strong>
                {event.receiver}
              </div>
              <div className="event-info-item">
                <strong>סטטוס</strong>
                {event.status}
              </div>
            </div>
          </div>

          <div className="search-container">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="חפש לפי מק״ט או שם... (לחץ F או /)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoComplete="off"
              />
              {searchQuery && (
                <button 
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  title="נקה (Esc)"
                >
                  ✖
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="search-results">
                {isLoading ? (
                  <div style={{ padding: '1rem', textAlign: 'center' }}>⏳ מחפש...</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                    לא נמצאו תוצאות עבור "{searchQuery}"
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#666', borderBottom: '1px solid #eee' }}>
                      {searchResults.length} תוצאות
                    </div>
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="search-result-item"
                        onClick={() => addItemToCart(result, 1)}
                      >
                        <div className="search-result-details">
                          <span className="search-result-code">{result.makat}</span>
                          <span className="search-result-name">{result.name}</span>
                          {result.groupName && (
                            <span className="search-result-group">{result.groupName}</span>
                          )}
                        </div>
                        <span style={{ fontSize: '1.3rem', color: '#10b981' }}>➕</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {recentItems.length > 0 && (
            <>
              <div className="recent-items-title">⭐ פריטים אחרונים</div>
              <div className="recent-items-grid">
                {recentItems.map((item) => (
                  <button
                    key={item.id}
                    className="recent-item-btn"
                    onClick={() => openQuickAddModal(item)}
                    title={`${item.name} - לחץ לבחירת כמות`}
                  >
                    <span className="recent-item-code">{item.makat}</span>
                    <span className="recent-item-name">{item.name}</span>
                    <span className="recent-item-plus">+</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Cart */}
        <div className="warehouse-section">
          <h2>🛒 סל קליטה</h2>

          {!event.items || event.items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>הסל ריק</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#999' }}>
                חפש פריטים או בחר מהאחרונים להתחלה
              </p>
            </div>
          ) : (
            <div className="cart-container">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>מק״ט</th>
                    <th style={{ width: '35%' }}>פריט</th>
                    <th style={{ width: '25%' }}>כמות</th>
                    <th style={{ width: '15%' }}>פעולה</th>
                  </tr>
                </thead>
                <tbody>
                  {event.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="cart-item-code">{item.itemMakat}</td>
                      <td>
                        <span className="cart-item-name">{item.itemName}</span>
                      </td>
                      <td>
                        <div className="quantity-controls">
                          <button 
                            className="qty-btn"
                            onClick={() => updateItemQty(item.id, item.quantity - 1)}
                            title="הפחת (0 = מחק)"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="qty-input"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              if (val >= 0) updateItemQty(item.id, val);
                            }}
                            min="0"
                            style={{ width: '50px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                          <button 
                            className="qty-btn"
                            onClick={() => updateItemQty(item.id, item.quantity + 1)}
                            title="הוסף"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        <button 
                          className="delete-btn"
                          onClick={() => removeItem(item.id.toString())}
                          disabled={isLoading}
                          title="מחק פריט"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="cart-summary">
                <div className="summary-item">
                  <strong>סה״כ פריטים שונים:</strong>
                  <strong>{event.items.length}</strong>
                </div>
                <div className="summary-item">
                  <strong>סה״כ יחידות:</strong>
                  <strong>{totalItems}</strong>
                </div>
                <div className="summary-total">
                  <span>✅ מוכן לשליחה</span>
                  <span>{event.items.length} פריטים • {totalItems} יחידות</span>
                </div>
              </div>

              <div className="cart-actions">
                <button 
                  className="reset-btn"
                  onClick={resetEvent}
                  disabled={isLoading}
                  title="ביטול מלא של ההזמנה"
                >
                  ❌ ביטול
                </button>
                <button 
                  className="complete-btn"
                  onClick={completeEvent}
                  disabled={isLoading || event.items.length === 0}
                  title="שלח הזמנה לבחינה (Ctrl+Enter)"
                >
                  {isLoading ? '⏳ שליחה...' : '✅ שלח הזמנה לבחינה'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceivingPage;
