/**
 * Feature flags system for gating experimental features
 *
 * To enable beta features:
 * 1. Add ?beta=true to the URL
 * 2. Refresh the page
 *
 * To disable:
 * 1. Add ?beta=false to the URL
 * 2. Refresh the page
 */

const FEATURE_FLAGS_KEY = 'feature_flags';

interface FeatureFlags {
  betaFeatures: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  betaFeatures: false,
};

/**
 * Load feature flags from localStorage
 */
const loadFlags = (): FeatureFlags => {
  try {
    const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
    if (stored) {
      return { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load feature flags:', error);
  }
  return DEFAULT_FLAGS;
};

/**
 * Save feature flags to localStorage
 */
const saveFlags = (flags: FeatureFlags): void => {
  try {
    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
  } catch (error) {
    console.warn('Failed to save feature flags:', error);
  }
};

/**
 * Parse URL parameters to check for feature flag overrides
 */
const parseUrlFlags = (): void => {
  const params = new URLSearchParams(window.location.search);
  const betaParam = params.get('beta');

  if (betaParam !== null) {
    const flags = loadFlags();
    flags.betaFeatures = betaParam === 'true';
    saveFlags(flags);
    console.log(`Beta features ${flags.betaFeatures ? 'enabled' : 'disabled'}`);
  }
};

// Initialize feature flags from URL on module load
parseUrlFlags();

/**
 * Check if beta features are enabled
 */
export const isBetaEnabled = (): boolean => {
  return loadFlags().betaFeatures;
};

/**
 * Enable or disable beta features programmatically
 */
export const setBetaEnabled = (enabled: boolean): void => {
  const flags = loadFlags();
  flags.betaFeatures = enabled;
  saveFlags(flags);
};
