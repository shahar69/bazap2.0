import React, { useState, useEffect } from 'react';
import { itemsApi } from '../services/api';
import { Item } from '../types';

export const ItemManagementPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', quantityInStock: 0, isActive: true });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await itemsApi.getAll(true);
      setItems(data);
      setError('');
    } catch (err) {
      setError('שגיאה בטעינת הפריטים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', quantityInStock: 0, isActive: true });
    setShowForm(true);
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      code: item.code || '',
      quantityInStock: item.quantityInStock,
      isActive: item.isActive !== false
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('יש להזין שם פריט');
      return;
    }

    try {
      if (editingId) {
        await itemsApi.update(editingId, formData);
        setSuccess('הפריט עודכן בהצלחה');
      } else {
        await itemsApi.create(formData);
        setSuccess('הפריט נוצר בהצלחה');
      }
      setShowForm(false);
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת הפריט');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הפריט?')) {
      return;
    }

    try {
      await itemsApi.delete(id);
      setSuccess('הפריט נמחק בהצלחה');
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת הפריט');
    }
  };

  if (isLoading) {
    return <div className="spinner"></div>;
  }

  const displayedItems = showInactive ? items : items.filter(i => i.isActive !== false);

  return (
    <div className="container">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button className="btn btn-success" onClick={handleAddNew}>
          + הוסף פריט חדש
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          הצג פריטים לא פעילים
        </label>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'עדכן פריט' : 'הוסף פריט חדש'}</h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">שם הפריט:</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="שם הפריט"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="code">קוד פריט:</label>
              <input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="קוד אופציונלי"
              />
            </div>

            <div className="form-group">
              <label htmlFor="quantity">כמות במלאי:</label>
              <input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantityInStock}
                onChange={(e) => setFormData({ ...formData, quantityInStock: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                פריט פעיל
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-success">
                שמור
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                בטל
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">רשימת פריטים</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>שם הפריט</th>
              <th>קוד</th>
              <th>כמות במלאי</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {displayedItems.map(item => (
              <tr key={item.id} style={{ opacity: item.isActive === false ? 0.6 : 1 }}>
                <td>{item.name}</td>
                <td>{item.code || '-'}</td>
                <td>{item.quantityInStock}</td>
                <td>
                  {item.isActive === false ? (
                    <span style={{ color: 'red', fontWeight: 'bold' }}>לא פעיל</span>
                  ) : (
                    <span style={{ color: 'green' }}>פעיל</span>
                  )}
                </td>
                <td style={{ display: 'flex', gap: '5px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleEdit(item)}
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                  >
                    ערוך
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(item.id)}
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
