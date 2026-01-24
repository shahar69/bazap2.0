import React, { useState, useEffect, useRef } from 'react';
import { eventApi, itemSearchApi } from '../services/apiClient';
import '../styles/warehouse.css';

interface Alert {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  id: string;
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRecentItems();
  }, []);

  const loadRecentItems = async () => {
    try {
      const items = await itemSearchApi.getRecent(8);
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

    try {
      setIsCreatingEvent(true);
      const newEvent = await eventApi.createEvent(sourceUnit, receiver, 'Receiving');
      setEvent(newEvent);
      showAlert('success', `אירוע ${newEvent.number} נוצר בהצלחה`);
      setSourceUnit('');
      setReceiver('');
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה ביצירת אירוע');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const results = await itemSearchApi.search(value, 10);
      setSearchResults(results || []);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToCart = async (item: any) => {
    if (!event) {
      showAlert('warning', 'יש ליצור אירוע קודם');
      return;
    }

    const existingItem = event.items?.find((ei: any) => ei.itemMakat === item.makat);
    const currentQty = existingItem?.quantity || 0;
    const newQty = currentQty + 1;

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
          showAlert('success', `✅ ${item.name} התווסף לסל`);
        }
        setSearchQuery('');
        setSearchResults([]);
        if (searchInputRef.current) searchInputRef.current.focus();
      }
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בהוספת פריט');
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemQty = async (itemId: string, newQty: number) => {
    if (newQty < 0) return;

    const item = event.items?.find((ei: any) => ei.id.toString() === itemId.toString());
    if (!item) return;

    try {
      const updatedEvent = await eventApi.addItem(
        event.id,
        item.itemMakat,
        item.itemName,
        newQty
      );
      setEvent(updatedEvent);
    } catch (error: any) {
      showAlert('error', 'שגיאה בעדכון כמות');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      setIsLoading(true);
      const updatedEvent = await eventApi.removeItem(event.id, parseInt(itemId));
      setEvent(updatedEvent);
      showAlert('success', 'פריט הוסר מהסל');
    } catch (error: any) {
      showAlert('error', 'שגיאה בהסרת פריט');
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
      `לחזק? ${event.items.length} פריטים יישלחו לבחינה`
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await eventApi.submitForInspection(event.id);
      showAlert('success', '✅ אירוע הוגש לבחינה בהצלחה! פריטים מוכנים לבדיקה');
      setTimeout(() => {
        setEvent(null);
        setSourceUnit('');
        setReceiver('');
      }, 1500);
    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'שגיאה בהגשת אירוע לבחינה');
    } finally {
      setIsLoading(false);
    }
  };

  const resetEvent = () => {
    const confirmed = window.confirm('בטל את האירוע הנוכחי?');
    if (confirmed) {
      setEvent(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const addRecentByQty = async (item: any) => {
    if (!event) {
      showAlert('warning', 'יש ליצור אירוע קודם');
      return;
    }

    const qty = prompt(`כמה ${item.name}?`, '1');
    if (!qty || isNaN(parseInt(qty)) || parseInt(qty) < 1) return;

    try {
      setIsLoading(true);
      const updatedEvent = await eventApi.addItem(
        event.id,
        item.makat,
        item.name,
        parseInt(qty)
      );
      setEvent(updatedEvent);
      showAlert('success', `${item.name} (${qty}x) התווסף לסל`);
    } catch (error: any) {
      showAlert('error', 'שגיאה בהוספת פריט');
    } finally {
      setIsLoading(false);
    }
  };

  // Event creation form
  if (!event) {
    return (
      <div className="warehouse-page">
        <div className="warehouse-header">
          <h1>📦 קליטת ציוד</h1>
          <p>יצירת אירוע קליטה חדש</p>
        </div>

        {alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.type}`}>
            {alert.message}
          </div>
        ))}

        <div className="warehouse-container">
          <div className="warehouse-section" style={{ gridColumn: '1 / -1' }}>
            <h2>⚙️ פרטי אירוע חדש</h2>
            
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
                {isCreatingEvent ? '⏳ יצירת אירוע...' : '✅ צור אירוע קליטה'}
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
        <p>אירוע פעיל: {event.number}</p>
      </div>

      {alerts.map(alert => (
        <div key={alert.id} className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      ))}

      <div className="warehouse-container">
        {/* LEFT COLUMN: Search & Recent */}
        <div className="warehouse-section">
          <h2>🔍 חפוש ופריטים אחרונים</h2>

          <div className="event-status">
            <h3>פרטי אירוע</h3>
            <div className="event-info">
              <div className="event-info-item">
                <strong>אירוע</strong>
                {event.number}
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
                placeholder="חפש לפי מק״ט או שם..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {searchQuery && (
              <div className="search-results">
                {isLoading ? (
                  <div style={{ padding: '1rem', textAlign: 'center' }}>⏳ חיפוש...</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
                    לא נמצאו תוצאות
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="search-result-item"
                      onClick={() => addItemToCart(result)}
                    >
                      <div className="search-result-details">
                        <span className="search-result-code">{result.makat}</span>
                        <span className="search-result-name">{result.name}</span>
                      </div>
                      <span style={{ fontSize: '1.2rem' }}>➕</span>
                    </div>
                  ))
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
                    onClick={() => addRecentByQty(item)}
                    title={item.name}
                  >
                    <span className="recent-item-code">{item.makat}</span>
                    <span className="recent-item-name">{item.name}</span>
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
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                חפש פריטים או בחר מהאחרונים
              </p>
            </div>
          ) : (
            <div className="cart-container">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>מק״ט</th>
                    <th style={{ width: '40%' }}>פריט</th>
                    <th style={{ width: '20%' }}>כמות</th>
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
                            disabled={item.quantity <= 0}
                          >
                            −
                          </button>
                          <span className="qty-input">{item.quantity}</span>
                          <button 
                            className="qty-btn"
                            onClick={() => updateItemQty(item.id, item.quantity + 1)}
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
                  <span>{event.items.length} פריטים</span>
                </div>
              </div>

              <div className="cart-actions">
                <button 
                  className="reset-btn"
                  onClick={resetEvent}
                  disabled={isLoading}
                >
                  ❌ ביטול
                </button>
                <button 
                  className="complete-btn"
                  onClick={completeEvent}
                  disabled={isLoading || event.items.length === 0}
                >
                  {isLoading ? '⏳ שליחה...' : '✅ שלח לבחינה'}
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
