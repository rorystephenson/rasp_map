import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Router, RouteMatch } from './Router';

interface RouterContextValue {
  router: Router;
  currentRoute: RouteMatch | null;
}

const RouterContext = createContext<RouterContextValue | null>(null);

interface RouterProviderProps {
  router: Router;
  children: ReactNode;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({ router, children }) => {
  const [currentRoute, setCurrentRoute] = useState<RouteMatch | null>(
    router.getCurrentRoute()
  );

  useEffect(() => {
    // Subscribe to route changes
    const unsubscribe = router.subscribe(() => {
      setCurrentRoute(router.getCurrentRoute());
    });

    return unsubscribe;
  }, [router]);

  return (
    <RouterContext.Provider value={{ router, currentRoute }}>
      {children}
    </RouterContext.Provider>
  );
};

/**
 * Hook to access the router instance
 */
export const useRouter = (): Router => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider');
  }
  return context.router;
};

/**
 * Hook to get the current route
 */
export const useRoute = (): RouteMatch | null => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRoute must be used within RouterProvider');
  }
  return context.currentRoute;
};

/**
 * Hook to get navigation function
 * Returns [currentPath, navigate] similar to wouter's useLocation
 */
export const useNavigate = (): [(path: string, options?: { replace?: boolean; params?: Record<string, string> }) => void] => {
  const router = useRouter();
  return [router.navigate.bind(router)];
};

/**
 * Hook similar to wouter's useLocation
 * Returns [currentPath, navigate]
 */
export const useLocation = (): [string, (path: string, options?: { replace?: boolean; params?: Record<string, string> }) => void] => {
  const route = useRoute();
  const router = useRouter();

  return [
    route?.path || '/',
    router.navigate.bind(router)
  ];
};
