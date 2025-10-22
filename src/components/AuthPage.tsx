import React, { useState } from 'react';
import { apiClient } from '../api/client';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [userKey, setUserKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userKey.trim()) {
      setError('Please enter your authentication key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await apiClient.authenticate(userKey.trim());
      
      if (result.success) {
        onAuthSuccess();
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>RASP Map</h1>
        <p>Enter your authentication key to access paragliding forecasts</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="userKey">Authentication Key:</label>
            <input
              id="userKey"
              type="text"
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              disabled={isLoading}
              className="auth-input"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="auth-button"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};