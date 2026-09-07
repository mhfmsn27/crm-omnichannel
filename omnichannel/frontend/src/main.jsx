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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
