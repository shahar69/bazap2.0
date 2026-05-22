import React, { useState } from 'react';
import { useAuth } from '../services/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();

  const fillDemoUser = () => {
    setUsername('admin');
    setPassword('admin123');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch {
      // Error is already handled in context
    }
  };

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div className="login-hero-panel">
          <div className="workspace-badge">BAZAP / ICT OPERATIONS</div>
          <h1>מרכז שליטה לוגיסטי עם משמעת תהליך, נראות מצב, וייצוא SAP מסודר</h1>
          <p>
            סביבת עבודה אחת לחמ"ל ציוד: פתיחת הזמנות, בחינה, סגירת חסמים, והעברת חבילות מסודרות ל-SAP בשפה מקצועית וברורה.
          </p>
          <div className="login-feature-list">
            <div className="login-feature">חמ"ל תפעולי: שליטה בפתוחים, חריגים ומוכנות ל-SAP</div>
            <div className="login-feature">תהליך סדור: קליטה, בחינה, מיפוי, חבילת יצוא</div>
            <div className="login-feature">ניווט מהיר: Command Palette וקיצורי מסכים</div>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="card login-card">
          <div className="card-header">
            <h2 className="card-title">התחברות למערכת</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">שם משתמש:</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="הזן שם משתמש"
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">סיסמה:</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הזן סיסמה"
                disabled={isLoading}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? 'מתחבר...' : 'התחברות'}
            </button>
          </form>

          <div className="login-demo-box">
            <div>
              <strong>פרופיל הדגמה</strong>
              <p>admin / admin123</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={fillDemoUser} disabled={isLoading}>
              מלא אוטומטית
            </button>
          </div>

          <div className="login-helper-text">
            אחרי הכניסה תראה סביבת שליטה מלאה עם מסכי חמ"ל, קליטה, בחינה, רישומים ומיפויי SAP.
          </div>
        </div>
      </div>
    </div>
  );
};
