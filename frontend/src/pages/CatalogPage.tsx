import React, { useEffect, useState } from 'react';
import { itemsApi } from '../services/api';
import { Item } from '../types';

export const CatalogPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    setItems(await itemsApi.getAll(true));
  };

  useEffect(() => {
    loadItems().catch((err) => setError(err instanceof Error ? err.message : 'טעינת המאגר נכשלה'));
  }, []);

  const createItem = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim() && !code.trim()) {
      setError('צריך להזין מק"ט או שם פריט');
      return;
    }

    try {
      await itemsApi.create({
        name: name.trim() || code.trim(),
        code: code.trim() || undefined,
        quantityInStock: 0,
        isActive: true,
      });
      setName('');
      setCode('');
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירת פריט נכשלה');
    }
  };

  return (
    <section className="page-grid">
      <form className="panel narrow" onSubmit={createItem}>
        <div className="section-heading">
          <h2>מאגר פריטים</h2>
          <p>תמיכה בזיהוי מק"טים. הבחינה לא נחסמת כשאין התאמה.</p>
        </div>

        {error && <div className="alert error">{error}</div>}

        <label>
          מק"ט
          <input value={code} onChange={(event) => setCode(event.target.value)} />
        </label>
        <label>
          שם פריט
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" className="primary-button">
          הוסף למאגר
        </button>
      </form>

      <section className="panel wide">
        <h2>פריטים קיימים</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>מק"ט</th>
                <th>שם</th>
                <th>פעיל</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.code || '-'}</td>
                  <td>{item.name}</td>
                  <td>{item.isActive ? 'כן' : 'לא'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3}>אין פריטים במאגר.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
