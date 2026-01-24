import React, { useState } from 'react';
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
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

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

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-container">
          <div className="header-logo">
            <h1>Bazap 2.0</h1>
            <p>מערכת ניהול ציוד</p>
          </div>
          <nav className="header-nav">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
            >
              🎯 מפקדה
            </button>
            <button
              onClick={() => setCurrentPage('receiving')}
              className={`nav-btn ${currentPage === 'receiving' ? 'active' : ''}`}
            >
              📦 קליטה
            </button>
            <button
              onClick={() => setCurrentPage('inspection')}
              className={`nav-btn ${currentPage === 'inspection' ? 'active' : ''}`}
            >
              🔍 בחינה
            </button>
            <button
              onClick={() => setCurrentPage('history')}
              className={`nav-btn ${currentPage === 'history' ? 'active' : ''}`}
            >
              📊 היסטוריה
            </button>
            <button
              onClick={() => setCurrentPage('items')}
              className={`nav-btn ${currentPage === 'items' ? 'active' : ''}`}
            >
              🛠️ ניהול פריטים
            </button>
            <div className="user-info">
              👤 {user.username}
            </div>
            <button
              onClick={logout}
              className="logout-btn"
            >
              התנתקות
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {renderPage()}
      </main>

      <footer className="app-footer">
        <p>Bazap 2.0 - מערכת ניהול ציוד לגדוד 388</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>כל הזכויות שמורות © 2024</p>
      </footer>
    </div>
  );
};

export default App;
