import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeTracing } from './tracing';
import App from './App.tsx';
import { AuthProvider } from './services/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/app.css';

// Initialize tracing before rendering the app
initializeTracing();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>  </React.StrictMode>,
);