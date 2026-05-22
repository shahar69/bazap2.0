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
  section: string;
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
        label: 'חמ"ל',
        icon: 'OPS-01',
        shortcut: 'Alt+1',
        description: 'מה פתוח עכשיו, מה מוכן לייצוא SAP, ואיפה יש צווארי בקבוק.',
        hint: 'כאן מתחילים כדי להבין מה דורש טיפול מיידי ומה מחכה להשלמות.',
        section: 'שליטה ובקרה',
      },
      {
        key: 'receiving',
        label: 'קליטה',
        icon: 'OPS-02',
        shortcut: 'Alt+2',
        description: 'פתיחת הזמנת קליטה, הוספת פריטים וייבוא חכם של שורות.',
        hint: 'מתאים כשמגיע ציוד חדש וצריך לפתוח הזמנה מסודרת מיד.',
        section: 'הפעלת תהליך',
      },
      {
        key: 'inspection',
        label: 'בחינה',
        icon: 'OPS-03',
        shortcut: 'Alt+3',
        description: 'מעבר שיטתי על פריטים, החלטה תקין או מושבת, והכנה להמשך טיפול.',
        hint: 'המסך הזה הכי מהיר כשעובדים ברצף פריטים ולא מדלגים בין הזמנות.',
        section: 'איכות ובקרה',
      },
      {
        key: 'history',
        label: 'רישומים',
        icon: 'OPS-04',
        shortcut: 'Alt+4',
        description: 'חיפוש הזמנות קודמות, סטטוסי יצוא ל-SAP ומעקב תפעולי מלא.',
        hint: 'כאן מאתרים הזמנה, מורידים חבילת SAP ובודקים אם חסרות השלמות.',
        section: 'מעקב ו-SAP',
      },
      {
        key: 'items',
        label: 'ניהול פריטים',
        icon: 'OPS-05',
        shortcut: 'Alt+5',
        description: 'ניהול קטלוג, מלאי ומיפויי SAP של הפריטים.',
        hint: 'אם ייצוא SAP לא מוכן, לרוב כאן סוגרים את החוסרים.',
        section: 'קטלוג ומיפויים',
      },
      {
        key: 'receipt',
        label: 'קבלה',
        icon: 'OPS-06',
        shortcut: 'Alt+6',
        description: 'מסך רישום מהיר כשצריך פעולה קצרה בלי לעבור זרימת הזמנה מלאה.',
        hint: 'שימושי לעבודה מהירה, אבל התהליך המרכזי נשאר דרך הזמנת קליטה.',
        section: 'עבודה מהירה',
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

  const missionSteps = useMemo(
    () => [
      { label: 'פתיחת הזמנה', page: 'receiving' as PageType },
      { label: 'בחינה והחלטה', page: 'inspection' as PageType },
      { label: 'השלמת מיפויי SAP', page: 'items' as PageType },
      { label: 'הורדת חבילה', page: 'history' as PageType },
    ],
    []
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
            <span className="header-kicker">ICT LOGISTICS CONSOLE</span>
            <h1>Bazap 2.0</h1>
            <p>מרכז שליטה תפעולי לקליטה, בחינה, קטלוג וייצוא SAP</p>
          </div>
          <div className="header-actions">
            <button className="command-btn" onClick={openCommandPalette} title="חיפוש מהיר (Ctrl+K)">
              ⌘ חיפוש מהיר
            </button>
            <div className="user-info">
              <span className="user-caption">משתמש פעיל</span>
              <strong>{user.username}</strong>
            </div>
            <button onClick={logout} className="logout-btn">
              התנתקות
            </button>
          </div>
        </div>
        <nav className="header-nav">
          {pages.map((page) => (
            <button
              key={page.key}
              onClick={() => setCurrentPage(page.key)}
              className={`nav-btn ${currentPage === page.key ? 'active' : ''}`}
              title={`${page.label} (${page.shortcut})`}
            >
              <span className="nav-btn-code">{page.icon}</span>
              <span className="nav-btn-text">
                <strong>{page.label}</strong>
                <small>{page.section}</small>
              </span>
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main" style={{ minHeight: '60vh' }}>
        <section className="workspace-hero">
          <div className="workspace-hero-main">
            <div className="workspace-badge">פעיל עכשיו / {currentPageMeta.section}</div>
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
              <p>המערכת מכינה חבילות ייצוא מסודרות ל-SAP. לא מוצג חיבור ישיר כשאין כזה בפועל.</p>
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
              <h3>תהליך עבודה מומלץ</h3>
              <span>קצב חמ"ל, בחינה, ומעבר ל-SAP</span>
            </div>
            <div className="recent-page-list">
              {missionSteps.map((step, index) => (
                <button key={step.page} className="recent-page-chip" onClick={() => setCurrentPage(step.page)}>
                  {index + 1}. {step.label}
                </button>
              ))}
            </div>
            <div className="recent-page-list recent-page-list-secondary">
              {recentPages.map((page) => (
                <button key={page.key} className="recent-page-chip secondary" onClick={() => setCurrentPage(page.key)}>
                  אחרון: {page.label}
                </button>
              ))}
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
