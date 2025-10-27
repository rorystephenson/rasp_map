import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { apiClient } from './api/client';

// Mock the API client
jest.mock('./api/client', () => ({
  apiClient: {
    isAuthenticated: jest.fn(),
    logout: jest.fn(),
  },
}));

// Mock the MapPage component since it requires Leaflet which doesn't work well in Jest
jest.mock('./components/MapPage', () => ({
  MapPage: () => <div data-testid="map-page">Map Page</div>,
}));

// Mock AuthPage
jest.mock('./components/AuthPage', () => ({
  AuthPage: ({ onAuthSuccess }: { onAuthSuccess: () => void }) => (
    <div data-testid="auth-page">
      <h1>Login Page</h1>
      <button onClick={onAuthSuccess}>Login</button>
    </div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      (apiClient.isAuthenticated as jest.Mock).mockReturnValue(false);
    });

    test('should show login page', () => {
      render(<App />);

      // Should show login page, not a blank page
      expect(screen.getByTestId('auth-page')).toBeInTheDocument();
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      (apiClient.isAuthenticated as jest.Mock).mockReturnValue(true);
    });

    test('should show map page when visiting home page', () => {
      render(<App />);

      // Should show map page
      expect(screen.getByTestId('map-page')).toBeInTheDocument();
    });
  });
});
