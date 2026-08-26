import './index.css'; 
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Import .jsx
import axios from 'axios';
import { API_BASE_URL } from './config/api';

// Set Global API Base URL
axios.defaults.baseURL = API_BASE_URL;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
