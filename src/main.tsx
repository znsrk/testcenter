import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import TestsPage from './admin/TestsPage';
import TestPage from './pages/TestPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<TestsPage />} />
          <Route path="/test/:id" element={<TestPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  </React.StrictMode>
);