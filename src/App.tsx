import React, { useState, useEffect } from 'react';
import './App.css';
import { apiClient } from './api/client';
import { AuthPage } from './components/AuthPage';
import { MapPage } from './components/MapPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsAuthenticated(apiClient.isAuthenticated());
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiClient.logout();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        Loading...
      </div>
    );
  }

  return (
    <div className="app">
      {isAuthenticated ? (
        <MapPage onLogout={handleLogout} />
      ) : (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

export default App;