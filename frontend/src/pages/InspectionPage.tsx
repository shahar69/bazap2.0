import React, { useState, useEffect } from 'react';
import { eventApi, inspectionApi } from '../services/apiClient';
import '../styles/inspection.css';

const InspectionPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [labelPreview, setLabelPreview] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const result = await eventApi.listEvents('Pending');
      setEvents(result);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectEvent = (event: any) => {
    setCurrentEvent(event);
    setCurrentItemIndex(0);
  };

  const currentItem = currentEvent?.items[currentItemIndex];

  const handleDecision = async (decision: string, disableReason?: string) => {
    if (!currentItem) return;

    try {
      setIsPrinting(true);
      await inspectionApi.makeDecision(currentItem.id, decision, disableReason);

      if (decision === 'Disabled' && disableReason) {
        const pdfBlob = await inspectionApi.printLabel(currentItem.id, 1);
        downloadPdf(pdfBlob, `label-${currentItem.id}.pdf`);
      }

      if (currentItemIndex < currentEvent.items.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
      } else {
        alert('סיימת לבחון את כל הפריטים!');
        setCurrentEvent(null);
        loadEvents();
      }
    } catch (error) {
      alert('שגיאה בהקלטת החלטה');
      console.error(error);
    } finally {
      setIsPrinting(false);
    }
  };

  const downloadPdf = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  if (!currentEvent) {
    return (
      <div className="inspection-page">
        <h1>🔍 מעבדת בחינה</h1>
        {isLoading && <p>טוען...</p>}
        {events.length === 0 && !isLoading && <p>אין אירועים לבחינה</p>}
        <div className="events-list">
          {events.map((event) => (
            <div key={event.id} className="event-card" onClick={() => selectEvent(event)}>
              <h3>{event.number}</h3>
              <p>יחידה: {event.sourceUnit}</p>
              <p>פריטים: {event.items.length}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="inspection-page">
      <h1>🔍 מעבדת בחינה</h1>
      <div className="event-header">
        <h2>{currentEvent.number}</h2>
        <p>
          פריט {currentItemIndex + 1} מתוך {currentEvent.items.length}
        </p>
      </div>

      {currentItem && (
        <div className="inspection-item">
          <div className="item-details">
            <p>
              <strong>מק״ט:</strong> {currentItem.itemMakat}
            </p>
            <p>
              <strong>שם פריט:</strong> {currentItem.itemName}
            </p>
            <p>
              <strong>כמות:</strong> {currentItem.quantity}
            </p>
          </div>

          <div className="decision-buttons">
            <button
              className="pass-btn"
              onClick={() => handleDecision('Pass')}
              disabled={isPrinting}
            >
              ✅ תקין
            </button>
            <div className="disabled-options">
              <button
                className="fail-btn"
                onClick={() => handleDecision('Disabled', 'VisualDamage')}
                disabled={isPrinting}
              >
                ❌ מושבת - ויזואלי
              </button>
              <button
                className="fail-btn"
                onClick={() => handleDecision('Disabled', 'Scrap')}
                disabled={isPrinting}
              >
                ❌ מושבת - גרוטאות
              </button>
            </div>
          </div>

          {isPrinting && <p>הדפסת מדבקה...</p>}
        </div>
      )}

      <button onClick={() => setCurrentEvent(null)} className="back-btn">
        חזור לרשימה
      </button>
    </div>
  );
};

export default InspectionPage;
