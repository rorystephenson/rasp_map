/**
 * Navigate to the parent route by removing the last segment(s) from the current path.
 * Uses replaceState to avoid adding to browser history.
 *
 * For spot overlay routes (e.g., /search/spot/123), removes both /spot/:id segments
 * to go directly to the logical parent (/search).
 *
 * Examples:
 * - /search/spot/123 -> /search
 * - /favourites/spot/456 -> /favourites
 * - /spot/789 -> /
 * - /logout -> /
 * - /search -> /
 * - /favourites -> /
 *
 * @param currentPath The current route path
 * @param setLocation The wouter navigate function from useLocation()
 */
export function navigateToParent(
  currentPath: string,
  setLocation: (path: string, options?: { replace?: boolean }) => void
): void {
  const segments = currentPath.split('/').filter(Boolean);

  // Check if this is a spot overlay route (pattern: .../spot/:id)
  // If so, remove both segments to get to the logical parent
  if (segments.length >= 2 && segments[segments.length - 2] === 'spot') {
    segments.pop(); // Remove the ID
    segments.pop(); // Remove 'spot'
  } else {
    // Otherwise, just remove the last segment
    segments.pop();
  }

  // Return root if no segments left, otherwise reconstruct path
  const parentPath = segments.length === 0 ? '/' : '/' + segments.join('/');

  // Use replace: true to avoid adding to browser history
  setLocation(parentPath, { replace: true });
}
