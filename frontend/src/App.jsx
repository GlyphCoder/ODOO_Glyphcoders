import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Restore session on startup
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('vb_token');
      const storedUser = localStorage.getItem('vb_user');

      if (storedToken && storedUser) {
        try {
          // Check if token is valid with backend
          const response = await fetch('http://localhost:5001/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setToken(storedToken);
          } else {
            // Token expired or invalid, wipe storage
            localStorage.removeItem('vb_token');
            localStorage.removeItem('vb_user');
          }
        } catch (err) {
          console.error('[Session Restore] Backend offline. Reverting to local cache.', err);
          // If offline, trust local cache so they can still inspect dashboard
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      }
      setIsInitializing(false);
    };

    restoreSession();
  }, []);

  const setAuth = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    setUser(null);
    setToken(null);
  };

  if (isInitializing) {
    return (
      <div className="auth-page-container flex-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="bg-glow-container">
          <div className="bg-glow-1"></div>
          <div className="bg-glow-2"></div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px auto', borderLevel: '3px' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>Initializing VendorBridge ERP...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {/* Global animated backdrop glow */}
      <div className="bg-glow-container">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>

      <Routes>
        {/* Redirect empty path */}
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
        />

        {/* Login Route */}
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="auth-page-container">
                <header className="auth-header">
                  <h1 className="auth-logo">
                    <span className="logo-odoo">odoo</span>
                    <span className="logo-bridge">VendorBridge</span>
                  </h1>
                  <span className="auth-subtitle">Procurement & Vendor ERP</span>
                </header>
                <Login setAuth={setAuth} />
              </div>
            )
          } 
        />

        {/* Signup Route */}
        <Route 
          path="/signup" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="auth-page-container">
                <header className="auth-header">
                  <h1 className="auth-logo">
                    <span className="logo-odoo">odoo</span>
                    <span className="logo-bridge">VendorBridge</span>
                  </h1>
                  <span className="auth-subtitle">Procurement & Vendor ERP</span>
                </header>
                <Signup setAuth={setAuth} />
              </div>
            )
          } 
        />

        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            user ? (
              <Dashboard user={user} token={token} handleLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Catch-all Redirect */}
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </Router>
  );
}
