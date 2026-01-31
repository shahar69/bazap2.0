import React, { useMemo, useState, useEffect } from 'react';
import { itemsApi, receiptsApi } from '../services/api';
import { Item } from '../types';

export const EquipmentReceiptPage: React.FC = () => {
  const [recipientName, setRecipientName] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('1');
  const [receiptItems, setReceiptItems] = useState<{ itemId: number; itemName: string; quantity: number }[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await itemsApi.getAll(false);
      // Filter to show only active items
      const activeItems = data.filter((item: Item) => item.isActive !== false);
      setItems(activeItems);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת פריטים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = () => {
    setError('');
    
    if (!selectedItemId) {
      setError('יש לבחור פריט');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('יש להזין כמות חיובית');
      return;
    }

    const item = items.find(i => i.id === selectedItemId);
    if (!item) {
      setError('פריט לא נמצא');
      return;
    }

    if (item.quantityInStock < qty) {
      setError(`כמות במלאי של ${item.name} אינה מספיקה. זמין: ${item.quantityInStock}`);
      return;
    }

    // Check if item already added - merge quantities instead of preventing
    const existingItemIndex = receiptItems.findIndex(ri => ri.itemId === selectedItemId);
    if (existingItemIndex >= 0) {
      const updated = [...receiptItems];
      updated[existingItemIndex].quantity += qty;
      setReceiptItems(updated);
    } else {
      setReceiptItems([...receiptItems, { itemId: selectedItemId as number, itemName: item.name, quantity: qty }]);
    }
    
    setSelectedItemId('');
    setQuantity('1');
  };

  const handleQuickAdd = (item: Item, qty: number = 1) => {
    setError('');
    if (item.quantityInStock < qty) {
      setError(`כמות במלאי של ${item.name} אינה מספיקה. זמין: ${item.quantityInStock}`);
      return;
    }

    const existingItemIndex = receiptItems.findIndex(ri => ri.itemId === item.id);
    if (existingItemIndex >= 0) {
      const updated = [...receiptItems];
      updated[existingItemIndex].quantity += qty;
      setReceiptItems(updated);
    } else {
      setReceiptItems([...receiptItems, { itemId: item.id, itemName: item.name, quantity: qty }]);
    }

    setSelectedItemId('');
    setQuantity('1');
  };

  const updateReceiptQuantity = (itemId: number, newQty: number) => {
    if (newQty < 1) {
      handleRemoveItem(itemId);
      return;
    }
    setReceiptItems((prev) => prev.map((item) => (item.itemId === itemId ? { ...item, quantity: newQty } : item)));
  };

  const handleRemoveItem = (itemId: number) => {
    setReceiptItems(receiptItems.filter(ri => ri.itemId !== itemId));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!recipientName.trim()) {
      setError('יש להזין שם מקבל');
      return;
    }

    if (receiptItems.length === 0) {
      setError('יש להוסיף לפחות פריט אחד');
      return;
    }

    try {
      // Call API to create receipt
      const payload = {
        recipientName,
        items: receiptItems.map(ri => ({ itemId: ri.itemId, quantity: ri.quantity }))
      };
      
      await receiptsApi.create(payload);
      setSuccess('הקבלה נשמרה בהצלחה');
      setRecipientName('');
      setReceiptItems([]);
      
      // Reload items to refresh inventory
      loadItems();
    } catch (err) {
      setError('שגיאה בשמירת הקבלה');
    }
  };

  if (isLoading) {
    return <div className="spinner"></div>;
  }

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => [item.name, item.code]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query))
    );
  }, [items, itemSearch]);

  const totalUnits = receiptItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">קבלת ציוד</h2>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="form-group">
          <label htmlFor="recipient">שם מקבל הציוד:</label>
          <input
            id="recipient"
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="הזן שם החייל או מספרו האישי"
          />
        </div>

        <div className="form-row">
          <div>
            <label htmlFor="item">בחר פריט:</label>
            <select
              id="item"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">-- בחר פריט --</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (זמין: {item.quantityInStock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantity">כמות:</label>
            <input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="itemSearch">חיפוש מהיר בפריטים:</label>
          <input
            id="itemSearch"
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="חפש לפי שם או קוד"
          />
          {itemSearch && (
            <div style={{ marginTop: '10px', maxHeight: '200px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              {filteredItems.length === 0 ? (
                <div style={{ padding: '10px', color: '#6b7280' }}>לא נמצאו פריטים</div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleQuickAdd(item, 1)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      width: '100%', padding: '10px 12px', border: 'none', background: 'white', cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6'
                    }}
                  >
                    <span>{item.name}</span>
                    <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>זמין: {item.quantityInStock}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button type="button" className="btn btn-primary" onClick={handleAddItem}>
          הוסף פריט
        </button>

        {receiptItems.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h3>פריטים שנוספו:</h3>
            <table>
              <thead>
                <tr>
                  <th>שם הפריט</th>
                  <th>כמות</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {receiptItems.map((item) => (
                  <tr key={item.itemId}>
                    <td>{item.itemName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => updateReceiptQuantity(item.itemId, item.quantity - 1)}
                          style={{ padding: '2px 8px' }}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateReceiptQuantity(item.itemId, parseInt(e.target.value) || 1)}
                          style={{ width: '60px', textAlign: 'center' }}
                          min="1"
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => updateReceiptQuantity(item.itemId, item.quantity + 1)}
                          style={{ padding: '2px 8px' }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRemoveItem(item.itemId)}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '12px', fontWeight: 'bold', color: '#374151' }}>
              סה"כ פריטים: {receiptItems.length} • סה"כ יחידות: {totalUnits}
            </div>
          </div>
        )}

        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
          <button type="button" className="btn btn-success" onClick={handleSubmit}>
            שמור קבלה
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setRecipientName('');
              setReceiptItems([]);
              setError('');
              setSuccess('');
            }}
          >
            ניקה
          </button>
        </div>
      </div>
    </div>
  );
};
