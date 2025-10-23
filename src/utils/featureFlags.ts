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

import { storageService, FeatureFlags } from '../services/StorageService';

const DEFAULT_FLAGS: FeatureFlags = {
  betaFeatures: false,
};

/**
 * Load feature flags from storage service
 */
const loadFlags = (): FeatureFlags => {
  const stored = storageService.getFeatureFlags();
  if (stored) {
    return { ...DEFAULT_FLAGS, ...stored };
  }
  return DEFAULT_FLAGS;
};

/**
 * Save feature flags using storage service
 */
const saveFlags = (flags: FeatureFlags): void => {
  storageService.setFeatureFlags(flags);
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
