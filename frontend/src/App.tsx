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

type PageMeta = {
  key: PageType;
  label: string;
  icon: string;
  shortcut: string;
  description: string;
  hint: string;
};

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    const saved = localStorage.getItem('bazap.currentPage') as PageType | null;
    return saved || 'dashboard';
  });
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const [recentPageKeys, setRecentPageKeys] = useState<PageType[]>(() => {
    const saved = localStorage.getItem('bazap.recentPages');
    if (!saved) {
      return ['dashboard', 'receiving', 'inspection'];
    }

    try {
      return JSON.parse(saved) as PageType[];
    } catch {
      return ['dashboard', 'receiving', 'inspection'];
    }
  });
  const commandInputRef = useRef<HTMLInputElement>(null);

  const pages = useMemo<PageMeta[]>(
    () => [
      {
        key: 'dashboard',
        label: 'תמונת מצב',
        icon: '🎯',
        shortcut: 'Alt+1',
        description: 'מה פתוח עכשיו, מה מוכן לייצוא SAP, ואיפה יש צווארי בקבוק.',
        hint: 'כאן מתחילים כדי להבין מה דורש טיפול מיידי ומה מחכה להשלמות.',
      },
      {
        key: 'receiving',
        label: 'קליטה',
        icon: '📦',
        shortcut: 'Alt+2',
        description: 'פתיחת הזמנת קליטה, הוספת פריטים וייבוא חכם של שורות.',
        hint: 'מתאים כשמגיע ציוד חדש וצריך לפתוח הזמנה מסודרת מיד.',
      },
      {
        key: 'inspection',
        label: 'בחינה',
        icon: '🔍',
        shortcut: 'Alt+3',
        description: 'מעבר שיטתי על פריטים, החלטה תקין או מושבת, והכנה להמשך טיפול.',
        hint: 'המסך הזה הכי מהיר כשעובדים ברצף פריטים ולא מדלגים בין הזמנות.',
      },
      {
        key: 'history',
        label: 'רישומים',
        icon: '📊',
        shortcut: 'Alt+4',
        description: 'חיפוש הזמנות קודמות, סטטוסי יצוא ל-SAP ומעקב תפעולי מלא.',
        hint: 'כאן מאתרים הזמנה, מורידים חבילת SAP ובודקים אם חסרות השלמות.',
      },
      {
        key: 'items',
        label: 'ניהול פריטים',
        icon: '🛠️',
        shortcut: 'Alt+5',
        description: 'ניהול קטלוג, מלאי ומיפויי SAP של הפריטים.',
        hint: 'אם ייצוא SAP לא מוכן, לרוב כאן סוגרים את החוסרים.',
      },
      {
        key: 'receipt',
        label: 'קבלה',
        icon: '🧾',
        shortcut: 'Alt+6',
        description: 'מסך רישום מהיר כשצריך פעולה קצרה בלי לעבור זרימת הזמנה מלאה.',
        hint: 'שימושי לעבודה מהירה, אבל התהליך המרכזי נשאר דרך הזמנת קליטה.',
      },
    ],
    []
  );

  const currentPageMeta = useMemo(
    () => pages.find((page) => page.key === currentPage) ?? pages[0],
    [currentPage, pages]
  );

  const filteredPages = useMemo(() => {
    if (!commandQuery.trim()) {
      return pages;
    }

    const q = commandQuery.toLowerCase();
    return pages.filter((page) => {
      const haystack = `${page.label} ${page.description} ${page.hint}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [commandQuery, pages]);

  const recentPages = useMemo(
    () =>
      recentPageKeys
        .map((key) => pages.find((page) => page.key === key))
        .filter((page): page is PageMeta => Boolean(page)),
    [recentPageKeys, pages]
  );

  useEffect(() => {
    localStorage.setItem('bazap.currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    setRecentPageKeys((prev) => {
      const next = [currentPage, ...prev.filter((page) => page !== currentPage)].slice(0, 4);
      localStorage.setItem('bazap.recentPages', JSON.stringify(next));
      return next;
    });
  }, [currentPage]);

  useEffect(() => {
    setCommandIndex(0);
  }, [commandQuery, isCommandOpen]);

  useEffect(() => {
    if (commandIndex > filteredPages.length - 1) {
      setCommandIndex(Math.max(filteredPages.length - 1, 0));
    }
  }, [commandIndex, filteredPages]);

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

      if (isCommandOpen && e.key === 'ArrowDown') {
        e.preventDefault();
        setCommandIndex((prev) => Math.min(prev + 1, Math.max(filteredPages.length - 1, 0)));
        return;
      }

      if (isCommandOpen && e.key === 'ArrowUp') {
        e.preventDefault();
        setCommandIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (isCommandOpen && e.key === 'Enter') {
        const selected = filteredPages[commandIndex];
        if (selected) {
          e.preventDefault();
          setCurrentPage(selected.key);
          setIsCommandOpen(false);
        }
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
  }, [commandIndex, filteredPages, isCommandOpen, pages]);

  const openCommandPalette = () => {
    setIsCommandOpen(true);
    setCommandQuery('');
    setTimeout(() => commandInputRef.current?.focus(), 0);
  };

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

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <div className="header-logo">
            <h1>Bazap 2.0</h1>
            <p>ניהול ציוד, בחינה, וייצוא מסודר ל-SAP</p>
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
              <button className="command-btn" onClick={openCommandPalette} title="חיפוש מהיר (Ctrl+K)">
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
        <section className="workspace-hero">
          <div className="workspace-hero-main">
            <div className="workspace-badge">פעיל עכשיו</div>
            <h2>
              <span>{currentPageMeta.icon}</span> {currentPageMeta.label}
            </h2>
            <p>{currentPageMeta.description}</p>
            <div className="workspace-actions">
              <button className="btn btn-primary" onClick={openCommandPalette}>
                פתח חיפוש מהיר
              </button>
              <button className="btn btn-secondary" onClick={() => setCurrentPage('receiving')}>
                הזמנת קליטה חדשה
              </button>
              <button className="btn btn-success" onClick={() => setCurrentPage('inspection')}>
                עבור לבחינה
              </button>
            </div>
          </div>

          <div className="workspace-hero-side">
            <div className="hero-tip-card">
              <div className="hero-tip-title">עיקרון עבודה</div>
              <p>{currentPageMeta.hint}</p>
            </div>
            <div className="hero-tip-card">
              <div className="hero-tip-title">SAP Stage 1</div>
              <p>המערכת מכינה חבילות ייצוא מסודרות ל-SAP. לא מבוצע sync ישיר בשלב הזה.</p>
            </div>
            <div className="hero-shortcuts">
              <span>Ctrl+K לחיפוש</span>
              <span>{currentPageMeta.shortcut} למסך הזה</span>
              <span>Esc לסגירה</span>
            </div>
          </div>
        </section>

        <section className="launcher-grid">
          <div className="launcher-card">
            <div className="launcher-card-header">
              <h3>ניווט מהיר</h3>
              <span>המסכים השימושיים ביותר</span>
            </div>
            <div className="launcher-actions">
              {pages.slice(0, 4).map((page) => (
                <button
                  key={page.key}
                  className={`launcher-action ${currentPage === page.key ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page.key)}
                >
                  <strong>{page.icon} {page.label}</strong>
                  <span>{page.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="launcher-card">
            <div className="launcher-card-header">
              <h3>קצב עבודה</h3>
              <span>מסכים אחרונים וזרימת צוות</span>
            </div>
            <div className="recent-page-list">
              {recentPages.map((page) => (
                <button key={page.key} className="recent-page-chip" onClick={() => setCurrentPage(page.key)}>
                  {page.icon} {page.label}
                </button>
              ))}
            </div>
            <div className="hero-shortcuts" style={{ marginTop: '1rem' }}>
              <span>1. קליטה וייבוא</span>
              <span>2. בחינה והחלטות</span>
              <span>3. הורדת חבילת SAP</span>
            </div>
          </div>
        </section>

        {renderPage()}
      </main>

      <footer className="app-footer">
        <p>Bazap 2.0 - מערכת תפעול ציוד וייצוא SAP</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>סביבת עבודה Stage 1: חבילות ייצוא מסודרות, בקרה מלאה, ופחות תלות בעבודה ידנית מפוזרת</p>
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
              placeholder="הקלד כדי למצוא מסך או פעולה..."
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
            />
            <div className="command-list">
              {filteredPages.length === 0 ? (
                <div className="command-empty">אין תוצאות</div>
              ) : (
                filteredPages.map((page, index) => (
                  <button
                    key={page.key}
                    className={`command-item ${currentPage === page.key ? 'active' : ''} ${commandIndex === index ? 'selected' : ''}`}
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
