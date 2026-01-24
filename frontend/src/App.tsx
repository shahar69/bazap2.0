import React, { useState } from 'react';
import { useAuth } from './services/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { EquipmentReceiptPage } from './pages/EquipmentReceiptPage';
import { ItemManagementPage } from './pages/ItemManagementPage';
import { HistoryPage } from './pages/HistoryPage';
import ReceivingPage from './pages/ReceivingPage';
import InspectionPage from './pages/InspectionPage';
import './styles/app.css';

type PageType = 'receipt' | 'items' | 'history' | 'receiving' | 'inspection';

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('receipt');

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
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
        return <EquipmentReceiptPage />;
    }
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-title">
              <h1>Bazap 2.0</h1>
            </div>
            <nav className="header-nav">
              <button
                onClick={() => setCurrentPage('receipt')}
                style={{
                  background: currentPage === 'receipt' ? '#3498db' : 'transparent',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                קבלת ציוד (ישן)
              </button>
              <button
                onClick={() => setCurrentPage('receiving')}
                style={{
                  background: currentPage === 'receiving' ? '#3498db' : 'transparent',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                📦 קליטה
              </button>
              <button
                onClick={() => setCurrentPage('inspection')}
                style={{
                  background: currentPage === 'inspection' ? '#3498db' : 'transparent',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                🔍 בחינה
              </button>
              <button
                onClick={() => setCurrentPage('items')}
                style={{
                  background: currentPage === 'items' ? '#3498db' : 'transparent',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                ניהול פריטים
              </button>
              <button
                onClick={() => setCurrentPage('history')}
                style={{
                  background: currentPage === 'history' ? '#3498db' : 'transparent',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                היסטוריה
              </button>
              <div style={{ color: '#bdc3c7' }}>
                משתמש: {user.username}
              </div>
              <button
                onClick={logout}
                className="logout-btn"
              >
                התנתקות
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main style={{ paddingBottom: '40px' }}>
        {renderPage()}
      </main>

      <footer style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        textAlign: 'center',
        padding: '20px',
        marginTop: '40px'
      }}>
        <p>Bazap 2.0 - מערכת ניהול ציוד לגדוד 388</p>
      </footer>
    </div>
  );
};

export default App;
