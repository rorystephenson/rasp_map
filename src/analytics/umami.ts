/**
 * Umami Analytics Event Tracking
 *
 * Type-safe wrapper for tracking custom events in Umami.
 * All events are privacy-friendly and do not collect personal data.
 */

// Type definitions for all trackable events
type UmamiEvent =
  | { name: 'overlay_open', data: { overlay_type: string, spot_id?: string, source?: string } }
  | { name: 'windy_click', data: { spot_id?: string, spot_name?: string } }
  | { name: 'meteo_parapente_click', data: { spot_id?: string, spot_name?: string } }
  | { name: 'auth_page_view' }
  | { name: 'login_attempt', data: { success: boolean } }
  | { name: 'register_attempt', data: { success: boolean } }
  | { name: 'search_query', data: { query_length: number, results_count: number } }
  | { name: 'search_result_selected', data: { spot_id: string, position: number } }
  | { name: 'favorite_added', data: { spot_id: string, spot_name: string } }
  | { name: 'favorite_removed', data: { spot_id: string, spot_name: string } }
  | { name: 'tile_layer_changed', data: { layer_name: string } }
  | { name: 'api_error', data: { endpoint: string, error_type: string } };

// Extend window type for Umami
declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, any>) => void;
    };
  }
}

/**
 * Track a custom event in Umami Analytics
 *
 * @param event - The event to track with its associated data
 *
 * @example
 * trackEvent({
 *   name: 'overlay_open',
 *   data: { overlay_type: 'spot', spot_id: '123' }
 * });
 */
export function trackEvent(event: UmamiEvent): void {
  // Check if Umami is loaded
  if (typeof window !== 'undefined' && window.umami?.track) {
    try {
      const eventData = 'data' in event ? event.data : undefined;
      window.umami.track(event.name, eventData);

      // Optional: Log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics]', event.name, eventData);
      }
    } catch (error) {
      // Silently fail - analytics should never break the app
      console.warn('Failed to track event:', error);
    }
  }
}

/**
 * Check if Umami is available
 * Useful for conditional tracking or debugging
 */
export function isUmamiAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.umami?.track;
}
