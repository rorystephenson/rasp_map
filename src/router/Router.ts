/**
 * Custom lightweight router for RASP Map
 *
 * Features:
 * - Centralized route definitions
 * - Built-in overlay concept with parent tracking
 * - Smart back button behavior
 * - Proper parameter encoding/decoding
 * - No history pollution when closing overlays
 */

export interface RouteDefinition {
  path: string;
  name: string;
  overlay?: boolean;
}

export interface RouteMatch {
  name: string;
  path: string;
  params: Record<string, string>;
  overlay?: boolean;
}

interface NavigationOptions {
  replace?: boolean;
  params?: Record<string, string>;
}

interface NavigationHistoryEntry {
  path: string;
  route: RouteMatch;
}

export class Router {
  private routes: RouteDefinition[];
  private listeners: Set<() => void> = new Set();
  private navigationHistory: NavigationHistoryEntry[] = [];
  private currentPath: string;
  private lastPath: string; // Track the previous path to detect back navigation

  constructor(routes: RouteDefinition[]) {
    this.routes = routes;
    this.currentPath = window.location.pathname;
    this.lastPath = this.currentPath;

    // Listen to browser back/forward
    window.addEventListener('popstate', this.handlePopState);
  }

  /**
   * Match a path against route definitions and extract parameters
   */
  matchRoute(path: string): RouteMatch | null {
    for (const route of this.routes) {
      const match = this.matchPattern(route.path, path);
      if (match) {
        return {
          name: route.name,
          path,
          params: match.params,
          overlay: route.overlay,
        };
      }
    }
    return null;
  }

  /**
   * Match a path pattern like "/spot/:id" against an actual path
   * and extract decoded parameters
   */
  private matchPattern(
    pattern: string,
    path: string
  ): { params: Record<string, string> } | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    // Must have same number of segments
    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // Extract parameter name and decode the value
        const paramName = patternPart.slice(1);
        params[paramName] = decodeURIComponent(pathPart);
      } else if (patternPart !== pathPart) {
        // Literal parts must match exactly
        return null;
      }
    }

    return { params };
  }

  /**
   * Get the currently matched route
   */
  getCurrentRoute(): RouteMatch | null {
    return this.matchRoute(this.currentPath);
  }

  /**
   * Build a path from a route pattern and params, encoding parameters
   */
  private buildPath(pattern: string, params: Record<string, string>): string {
    let path = pattern;

    // Replace each :paramName with the encoded parameter value
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    }

    return path;
  }

  /**
   * Navigate to a new path or route name
   * Supports two modes:
   * 1. navigate('/spot/123') - direct path
   * 2. navigate('/spot/:id', { params: { id: '123' } }) - builds and encodes path
   */
  navigate(pathOrPattern: string, options: NavigationOptions = {}): void {
    let path: string;

    // If params provided, treat as pattern and build path
    if (options.params) {
      path = this.buildPath(pathOrPattern, options.params);
    } else {
      path = pathOrPattern;
    }

    const route = this.matchRoute(path);

    if (!route) {
      console.warn(`No route found for path: ${path}`);
      return;
    }

    if (options.replace) {
      window.history.replaceState(null, '', path);
    } else {
      // Track this navigation in our history for parent tracking
      const currentRoute = this.getCurrentRoute();
      if (currentRoute) {
        this.navigationHistory.push({
          path: this.currentPath,
          route: currentRoute,
        });
      }

      window.history.pushState(null, '', path);
    }

    this.lastPath = this.currentPath;
    this.currentPath = path;
    this.notifyListeners();
  }

  /**
   * Navigate back
   *
   * For overlays: uses replace to navigate to parent (or home if no parent)
   * For non-overlays: uses browser back
   */
  back(): void {
    const currentRoute = this.getCurrentRoute();

    // If current route is an overlay, navigate to parent with replace
    if (currentRoute?.overlay) {
      const parent = this.navigationHistory.length > 0
        ? this.navigationHistory.pop()!
        : { path: '/' }; // Default to home if no parent tracked

      this.lastPath = this.currentPath;
      this.currentPath = parent.path;
      window.history.replaceState(null, '', parent.path);
      this.notifyListeners();
    } else {
      // Not an overlay - use browser back
      window.history.back();
    }
  }

  /**
   * Subscribe to route changes
   * Returns an unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    window.removeEventListener('popstate', this.handlePopState);
  }

  private handlePopState = (): void => {
    const newPath = window.location.pathname;
    const lastRoute = this.matchRoute(this.lastPath);
    const newRoute = this.matchRoute(newPath);

    console.log('[Router] popstate: from', this.lastPath, '(', lastRoute?.name, ') to', newPath, '(', newRoute?.name, ')');

    // If we were on an overlay and back takes us outside the app,
    // intercept and go to home instead
    if (lastRoute?.overlay && !newRoute) {
      console.log('[Router] Intercepting back from overlay to outside app, going to home');
      window.history.pushState(null, '', '/');
      this.lastPath = this.currentPath;
      this.currentPath = '/';
      this.notifyListeners();
      return;
    }

    this.lastPath = this.currentPath;
    this.currentPath = newPath;
    this.notifyListeners();
  };

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}
