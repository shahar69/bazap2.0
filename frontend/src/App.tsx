import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './services/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { EquipmentReceiptPage } from './pages/EquipmentReceiptPage';
import { ItemManagementPage } from './pages/ItemManagementPage';
import { HistoryPage } from './pages/HistoryPage';
import ReceivingPage from './pages/ReceivingPage';
import InspectionPage from './pages/InspectionPage';
import DashboardPage from './pages/DashboardPage';
import './styles/app.css';

type PageType = 'dashboard' | 'receipt' | 'items' | 'history' | 'receiving' | 'inspection';

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    const saved = localStorage.getItem('bazap.currentPage') as PageType | null;
    return saved || 'dashboard';
  });
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);

  const pages = useMemo(
    () => [
      { key: 'dashboard' as PageType, label: 'מפקדה', icon: '🎯', shortcut: 'Alt+1' },
      { key: 'receiving' as PageType, label: 'קליטה', icon: '📦', shortcut: 'Alt+2' },
      { key: 'inspection' as PageType, label: 'בחינה', icon: '🔍', shortcut: 'Alt+3' },
      { key: 'history' as PageType, label: 'היסטוריה', icon: '📊', shortcut: 'Alt+4' },
      { key: 'items' as PageType, label: 'ניהול פריטים', icon: '🛠️', shortcut: 'Alt+5' },
      { key: 'receipt' as PageType, label: 'קבלה', icon: '🧾', shortcut: 'Alt+6' },
    ],
    []
  );

  useEffect(() => {
    localStorage.setItem('bazap.currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
        setCommandQuery('');
        setTimeout(() => commandInputRef.current?.focus(), 0);
        return;
      }

      if (e.key === 'Escape') {
        setIsCommandOpen(false);
        return;
      }

      if (!isTyping && e.altKey) {
        const index = parseInt(e.key, 10) - 1;
        if (!Number.isNaN(index) && pages[index]) {
          e.preventDefault();
          setCurrentPage(pages[index].key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages]);

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'receipt':
        return <EquipmentReceiptPage />;
      case 'items':
        return <ItemManagementPage />;
      case 'history':
        return <HistoryPage />;
      case 'receiving':
        return <ReceivingPage />;
      case 'inspection':
        return <InspectionPage />;
      default:
        return <DashboardPage />;
    }
  };

  const filteredPages = useMemo(() => {
    if (!commandQuery.trim()) return pages;
    const q = commandQuery.toLowerCase();
    return pages.filter((p) => p.label.toLowerCase().includes(q));
  }, [commandQuery, pages]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <div className="header-logo">
            <h1>Bazap 2.0</h1>
            <p>מערכת ניהול ציוד</p>
          </div>
          <nav className="header-nav">
            {pages.map((page) => (
              <button
                key={page.key}
                onClick={() => setCurrentPage(page.key)}
                className={`nav-btn ${currentPage === page.key ? 'active' : ''}`}
                title={`${page.label} (${page.shortcut})`}
              >
                {page.icon} {page.label}
              </button>
            ))}
            <div className="header-actions">
              <button
                className="command-btn"
                onClick={() => {
                  setIsCommandOpen(true);
                  setCommandQuery('');
                  setTimeout(() => commandInputRef.current?.focus(), 0);
                }}
                title="חיפוש מהיר (Ctrl+K)"
              >
                ⌘ חיפוש
              </button>
              <div className="user-info">👤 {user.username}</div>
              <button onClick={logout} className="logout-btn">
                התנתקות
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="app-main" style={{ minHeight: '60vh' }}>
        {renderPage()}
      </main>

      <footer className="app-footer">
        <p>Bazap 2.0 - מערכת ניהול ציוד לגדוד 388</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>כל הזכויות שמורות © 2024</p>
      </footer>

      {isCommandOpen && (
        <div className="command-overlay" onClick={() => setIsCommandOpen(false)}>
          <div className="command-modal" onClick={(e) => e.stopPropagation()}>
            <div className="command-header">
              <span>חיפוש מהיר</span>
              <span className="command-hint">Ctrl+K • Esc לסגירה</span>
            </div>
            <input
              ref={commandInputRef}
              className="command-input"
              placeholder="הקלד כדי למצוא עמוד..."
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
            />
            <div className="command-list">
              {filteredPages.length === 0 ? (
                <div className="command-empty">אין תוצאות</div>
              ) : (
                filteredPages.map((page) => (
                  <button
                    key={page.key}
                    className={`command-item ${currentPage === page.key ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentPage(page.key);
                      setIsCommandOpen(false);
                    }}
                  >
                    <span>
                      {page.icon} {page.label}
                    </span>
                    <span className="command-shortcut">{page.shortcut}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
