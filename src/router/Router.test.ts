import { Router, RouteDefinition } from './Router';

// Mock history API
const mockPushState = jest.fn();
const mockReplaceState = jest.fn();
const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

beforeEach(() => {
  window.history.pushState = mockPushState;
  window.history.replaceState = mockReplaceState;
  mockPushState.mockClear();
  mockReplaceState.mockClear();
});

afterEach(() => {
  window.history.pushState = originalPushState;
  window.history.replaceState = originalReplaceState;
});

describe('Router', () => {
  const routes: RouteDefinition[] = [
    { path: '/', name: 'home' },
    { path: '/search', name: 'search', overlay: true },
    { path: '/favourites', name: 'favourites', overlay: true },
    { path: '/spot/:id', name: 'spot', overlay: true },
    { path: '/logout', name: 'logout', overlay: true },
  ];

  describe('Route matching and parameter extraction (Requirement 3)', () => {
    test('matches root path', () => {
      const router = new Router(routes);
      const match = router.matchRoute('/');

      expect(match).toMatchObject({
        name: 'home',
        path: '/',
        params: {},
      });
    });

    test('matches simple paths', () => {
      const router = new Router(routes);
      const match = router.matchRoute('/search');

      expect(match).toMatchObject({
        name: 'search',
        path: '/search',
        params: {},
      });
    });

    test('extracts URL-encoded parameters correctly', () => {
      const router = new Router(routes);
      const match = router.matchRoute('/spot/BORSO_windgram');

      expect(match).toMatchObject({
        name: 'spot',
        params: { id: 'BORSO_windgram' },
      });
    });

    test('handles special characters in parameters', () => {
      const router = new Router(routes);
      const encodedId = encodeURIComponent('test/with spaces & special');
      const match = router.matchRoute(`/spot/${encodedId}`);

      expect(match).toMatchObject({
        name: 'spot',
        params: { id: 'test/with spaces & special' },
      });
    });

    test('returns null for non-matching routes', () => {
      const router = new Router(routes);
      const match = router.matchRoute('/nonexistent');

      expect(match).toBeNull();
    });
  });

  describe('Navigation (Requirement 1 - concentrated routing)', () => {
    test('navigates to a path using pushState', () => {
      const router = new Router(routes);
      router.navigate('/search');

      expect(mockPushState).toHaveBeenCalledWith(
        null,
        '',
        '/search'
      );
    });

    test('navigates with replace using replaceState', () => {
      const router = new Router(routes);
      router.navigate('/search', { replace: true });

      expect(mockReplaceState).toHaveBeenCalledWith(
        null,
        '',
        '/search'
      );
      expect(mockPushState).not.toHaveBeenCalled();
    });

    test('encodes parameters when building paths', () => {
      const router = new Router(routes);
      const id = 'test/with spaces & special';
      router.navigate(`/spot/${encodeURIComponent(id)}`);

      const calledPath = mockPushState.mock.calls[0][2];
      expect(calledPath).toContain(encodeURIComponent(id));
    });
  });

  describe('Back behavior (Requirements 2, 4)', () => {
    test('back() closes overlay with replace when parent is in app', () => {
      const router = new Router(routes);

      // Navigate to home, then search
      router.navigate('/');
      router.navigate('/search');

      // Clear mocks before testing back
      mockPushState.mockClear();
      mockReplaceState.mockClear();

      // Going back should use replace
      router.back();

      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/');
      expect(mockPushState).not.toHaveBeenCalled();
    });

    test('back() goes to home when overlay has no parent (direct URL access)', () => {
      const router = new Router(routes);

      // Simulate direct navigation to overlay (no parent tracked)
      // Manually set currentPath to simulate being on /search
      router.navigate('/search', { replace: true });

      mockReplaceState.mockClear();

      router.back();

      // Should use replace to go to home
      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/');
    });

    test('nested overlay navigation tracks correct parent', () => {
      const router = new Router(routes);

      // Home -> Search -> Spot
      router.navigate('/');
      router.navigate('/search');
      router.navigate('/spot/BORSO_windgram');

      // Back from spot should go to search
      router.back();

      expect(router.getCurrentRoute()?.name).toBe('search');
    });

    test('closing overlay does not add history entry (uses replace)', () => {
      const router = new Router(routes);

      router.navigate('/');
      router.navigate('/search');

      // Clear both mocks before testing back
      mockReplaceState.mockClear();
      mockPushState.mockClear();

      router.back();

      // Should use replace, not push
      expect(mockReplaceState).toHaveBeenCalled();
      expect(mockPushState).not.toHaveBeenCalled();
    });

    test('back() on non-overlay uses browser back', () => {
      const mockBack = jest.fn();
      window.history.back = mockBack;

      const router = new Router(routes);
      router.navigate('/');

      router.back();

      // Non-overlay should use browser back
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Page vs Overlay behavior', () => {
    test('identifies page routes', () => {
      const router = new Router(routes);
      router.navigate('/');

      const current = router.getCurrentRoute();
      expect(current?.overlay).toBeFalsy();
    });

    test('identifies overlay routes', () => {
      const router = new Router(routes);
      router.navigate('/search');

      const current = router.getCurrentRoute();
      expect(current?.overlay).toBe(true);
    });
  });

  describe('History integration', () => {
    test('handles popstate events (browser back button)', () => {
      const router = new Router(routes);
      const listener = jest.fn();

      router.subscribe(listener);

      // Simulate browser back button
      window.history.pushState(null, '', '/search');
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(listener).toHaveBeenCalled();
    });

    test('unsubscribe removes listener', () => {
      const router = new Router(routes);
      const listener = jest.fn();

      const unsubscribe = router.subscribe(listener);
      unsubscribe();

      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
