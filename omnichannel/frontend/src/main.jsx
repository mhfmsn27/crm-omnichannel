import './index.css'; 
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Import .jsx
import axios from 'axios';
import { API_BASE_URL } from './config/api';
import { registerServiceWorker } from './utils/pwaHelper';

// Set Global API Base URL
axios.defaults.baseURL = API_BASE_URL;

// Register PWA Service Worker
registerServiceWorker();

// Intercept and suppress known Chromium DevTools Live Metrics bug
if (typeof window !== 'undefined') {
  const isDevToolsMetricBug = (msg, stack, src) => {
    const m = String(msg || '');
    const s = String(stack || '');
    const f = String(src || '');
    return (m.includes('reportAllChanges') || s.includes('reportAllChanges')) ||
           ((m.includes("reading 'startTime'") || m.includes('startTime')) &&
            (s.includes('timeout') || f.includes('VM') || !f || s.includes('anonymous')));
  };

  window.addEventListener('error', (event) => {
    if (isDevToolsMetricBug(event.message, event.error?.stack, event.filename)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && isDevToolsMetricBug(reason.message || reason, reason.stack, '')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const prevConsoleError = console.error;
  console.error = (...args) => {
    const str = args.map(a => (typeof a === 'string' ? a : (a?.stack || a?.message || String(a || '')))).join(' ');
    if (isDevToolsMetricBug(str, str, '')) return;
    prevConsoleError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
