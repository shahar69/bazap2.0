import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './services/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { CommandReportsPage } from './pages/CommandReportsPage';
import { DepartmentInspectionPage } from './pages/DepartmentInspectionPage';
import { DisableLabelsPage } from './pages/DisableLabelsPage';
import { HatsPage } from './pages/HatsPage';
import { SapFileExportPage } from './pages/SapFileExportPage';
import './styles/app.css';

type PageType = 'inspection' | 'hats' | 'labels' | 'reports' | 'sap' | 'catalog';

const pages: Array<{ key: PageType; label: string }> = [
  { key: 'inspection', label: 'בחינה' },
  { key: 'hats', label: 'כובעים' },
  { key: 'labels', label: 'פתקי השבתה' },
  { key: 'reports', label: 'דוחות' },
  { key: 'sap', label: 'ייצוא SAP' },
  { key: 'catalog', label: 'מאגר פריטים' },
];

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    const saved = localStorage.getItem('bazap.inspectionPage') as PageType | null;
    return saved && pages.some((page) => page.key === saved) ? saved : 'inspection';
  });

  useEffect(() => {
    localStorage.setItem('bazap.inspectionPage', currentPage);
  }, [currentPage]);

  const title = useMemo(() => pages.find((page) => page.key === currentPage)?.label ?? 'בחינה', [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'hats':
        return <HatsPage />;
      case 'labels':
        return <DisableLabelsPage />;
      case 'reports':
        return <CommandReportsPage />;
      case 'sap':
        return <SapFileExportPage />;
      case 'catalog':
        return <CatalogPage />;
      case 'inspection':
      default:
        return <DepartmentInspectionPage />;
    }
  };

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell" dir="rtl">
      <header className="topbar">
        <div>
          <div className="eyebrow">מחלקת בחינה</div>
          <h1>{title}</h1>
        </div>
        <div className="topbar-user">
          <span>{user.username}</span>
          <button type="button" className="ghost-button" onClick={logout}>
            התנתקות
          </button>
        </div>
      </header>

      <nav className="main-nav" aria-label="ניווט ראשי">
        {pages.map((page) => (
          <button
            key={page.key}
            type="button"
            className={currentPage === page.key ? 'active' : ''}
            onClick={() => setCurrentPage(page.key)}
          >
            {page.label}
          </button>
        ))}
      </nav>

      <main className="content-area">{renderPage()}</main>
    </div>
  );
};

export default App;
