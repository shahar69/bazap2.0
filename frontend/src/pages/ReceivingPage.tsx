import React, { useState, useEffect } from 'react';
import { eventApi, itemSearchApi } from '../services/apiClient';
import '../styles/warehouse.css';

interface CartItem {
  id: string;
  makat: string;
  name: string;
  quantity: number;
}

const ReceivingPage: React.FC = () => {
  const [event, setEvent] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [sourceUnit, setSourceUnit] = useState('');
  const [receiver, setReceiver] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecentItems();
  }, []);

  const loadRecentItems = async () => {
    try {
      const items = await itemSearchApi.getRecent(8);
      setRecentItems(items);
    } catch (error) {
      console.error('Failed to load recent items:', error);
    }
  };

  const createEvent = async () => {
    if (!sourceUnit.trim() || !receiver.trim()) {
      alert('יש להזין יחידה ומקבל');
      return;
    }

    try {
      setIsCreatingEvent(true);
      const newEvent = await eventApi.createEvent(sourceUnit, receiver, 'Receiving');
      setEvent(newEvent);
      setSourceUnit('');
      setReceiver('');
      setCartItems([]);
    } catch (error) {
      alert('שגיאה ביצירת אירוע');
      console.error(error);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const results = await itemSearchApi.search(value, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToCart = async (result: any) => {
    if (!event) {
      alert('יש ליצור אירוע קודם');
      return;
    }

    const quantity = prompt('הזן כמות:', '1');
    if (!quantity || isNaN(Number(quantity))) return;

    try {
      const updatedEvent = await eventApi.addItem(
        event.id,
        result.makat,
        result.name,
        Number(quantity)
      );
      setEvent(updatedEvent);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      alert('שגיאה בהוספת פריט');
      console.error(error);
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      const updatedEvent = await eventApi.removeItem(event.id, itemId);
      setEvent(updatedEvent);
    } catch (error) {
      alert('שגיאה בהסרת פריט');
      console.error(error);
    }
  };

  const completeEvent = async () => {
    try {
      await eventApi.completeEvent(event.id);
      alert('אירוע הושלם!');
      setEvent(null);
      setCartItems([]);
    } catch (error) {
      alert('שגיאה בסיום אירוע');
      console.error(error);
    }
  };

  if (!event) {
    return (
      <div className="warehouse-page">
        <h1>📦 קליטת ציוד</h1>
        <div className="event-creation">
          <input
            type="text"
            placeholder="יחידה"
            value={sourceUnit}
            onChange={(e) => setSourceUnit(e.target.value)}
          />
          <input
            type="text"
            placeholder="שם מקבל"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
          <button onClick={createEvent} disabled={isCreatingEvent}>
            {isCreatingEvent ? 'טוען...' : 'צור אירוע קליטה'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="warehouse-page">
      <div className="header">
        <h1>📦 קליטת ציוד</h1>
        <div className="event-info">
          <p>
            <strong>אירוע:</strong> {event.number}
          </p>
          <p>
            <strong>יחידה:</strong> {event.sourceUnit}
          </p>
          <p>
            <strong>מקבל:</strong> {event.receiver}
          </p>
        </div>
      </div>

      <div className="search-section">
        <input
          type="text"
          placeholder="חפש לפי מק״ט או שם..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-box"
        />
        {isLoading && <p>טוען...</p>}
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="result-item"
                onClick={() => addItemToCart(result)}
              >
                <span className="makat">{result.makat}</span>
                <span className="name">{result.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="recent-section">
        <h3>פריטים אחרונים</h3>
        <div className="recent-grid">
          {recentItems.map((item) => (
            <button
              key={item.id}
              className="recent-btn"
              onClick={() => {
                addItemToCart(item);
              }}
            >
              {item.makat}
            </button>
          ))}
        </div>
      </div>

      <div className="cart-section">
        <h2>סל הקליטה ({event.items.length} פריטים)</h2>
        <table className="cart-table">
          <thead>
            <tr>
              <th>מק״ט</th>
              <th>שם פריט</th>
              <th>כמות</th>
              <th>פעולה</th>
            </tr>
          </thead>
          <tbody>
            {event.items.map((item: any) => (
              <tr key={item.id}>
                <td>{item.itemMakat}</td>
                <td>{item.itemName}</td>
                <td>{item.quantity}</td>
                <td>
                  <button onClick={() => removeItem(item.id)} className="delete-btn">
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions">
        <button onClick={() => setEvent(null)} className="cancel-btn">
          ביטול
        </button>
        <button onClick={completeEvent} className="complete-btn">
          סיום קליטה ושלח לבחינה
        </button>
      </div>
    </div>
  );
};

export default ReceivingPage;
