import React, { useState } from 'react';
import { useAuth } from '../services/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  const fillDemoUser = () => {
    setUsername('admin');
    setPassword('admin123');
  };

  return (
    <main className="login-page" dir="rtl">
      <section className="login-intro">
        <div className="eyebrow">Bazap</div>
        <h1>מערכת בחינה למחלקה</h1>
        <p>רישום ציוד שמגיע לבחינה, החלטת תקין או מושבת, הפקת פתקי השבתה, דוח מפקדים וייצוא קובץ SAP.</p>
      </section>

      <section className="login-card" aria-label="התחברות">
        <h2>התחברות</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert error">{error}</div>}

          <label>
            שם משתמש
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading}
              autoComplete="username"
              required
            />
          </label>

          <label>
            סיסמה
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="primary-button full-width" disabled={isLoading}>
            {isLoading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>

        <div className="demo-login">
          <span>משתמש הדגמה: admin / admin123</span>
          <button type="button" className="ghost-button" onClick={fillDemoUser} disabled={isLoading}>
            מלא
          </button>
        </div>
      </section>
    </main>
  );
};
