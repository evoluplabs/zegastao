import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { initTheme } from './hooks/useTheme';
import './index.css';

// Aplica o tema antes de renderizar para evitar flash
initTheme();

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 0.05,
    beforeSend(event) {
      // Não captura dados de autenticação
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers?.['Authorization']) delete event.request.headers['Authorization'];
      return event;
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
