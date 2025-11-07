import { useState, useMemo } from 'react';
import './App.css';
import { apiClient } from './api/client';
import { AuthPage } from './components/AuthPage';
import { MapPage } from './components/MapPage';
import { SearchOverlay } from './components/SearchOverlay';
import { FavouritesOverlay } from './components/FavouritesOverlay';
import { SpotOverlay } from './components/SpotOverlay';
import { UserAccountOverlay } from './components/UserAccountOverlay';
import { LogoutConfirmationOverlay } from './components/LogoutConfirmationOverlay';
import { MapProvider } from './contexts/MapContext';
import { I18nProvider } from './i18n/I18nContext';
import { Router } from './router/Router';
import { RouterProvider, useRoute } from './router/RouterContext';
import { routes } from './router/routes';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(apiClient.isAuthenticated());
  const route = useRoute();

  const handleLogout = () => {
    apiClient.logout();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  // Render based on current route
  return (
    <div className="app">
      <MapProvider onLogout={handleLogout}>
        <MapPage onLogout={handleLogout} />

        {/* Render overlays based on route name */}
        {route?.name === 'search' && <SearchOverlay />}
        {route?.name === 'favourites' && <FavouritesOverlay />}
        {route?.name === 'user' && <UserAccountOverlay />}
        {route?.name === 'logout' && <LogoutConfirmationOverlay onLogout={handleLogout} />}

        {/* Spot overlay (can be accessed from multiple contexts) */}
        {(route?.name === 'spot' || route?.name === 'search-spot' || route?.name === 'favourites-spot') && (
          <SpotOverlay windgramId={route.params.id} />
        )}
      </MapProvider>
    </div>
  );
}

function App() {
  const router = useMemo(() => new Router(routes), []);

  return (
    <I18nProvider>
      <RouterProvider router={router}>
        <AppContent />
      </RouterProvider>
    </I18nProvider>
  );
}

export default App;