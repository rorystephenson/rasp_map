/**
 * Favourites management utilities
 * Stores and retrieves favourite spot IDs using StorageService
 * Provides reactive updates via custom events
 */

import { useState, useEffect } from 'react';
import { storageService } from '../services/StorageService';

// Event for favourites changes
const FAVOURITES_CHANGE_EVENT = 'favourites-changed';

/**
 * Load favourite spot IDs from storage service
 */
export const loadFavourites = (): string[] => {
  return storageService.getFavourites();
};

/**
 * Save favourite spot IDs using storage service
 * Dispatches change event to notify listeners
 */
const saveFavourites = (favourites: string[]): void => {
  storageService.setFavourites(favourites);
  // Dispatch event to notify all listeners
  window.dispatchEvent(new CustomEvent(FAVOURITES_CHANGE_EVENT));
};

/**
 * Check if a spot is favourited
 */
export const isFavourite = (spotId: string): boolean => {
  const favourites = loadFavourites();
  return favourites.includes(spotId);
};

/**
 * Add a spot to favourites
 */
export const addFavourite = (spotId: string): void => {
  const favourites = loadFavourites();
  if (!favourites.includes(spotId)) {
    favourites.push(spotId);
    saveFavourites(favourites);
  }
};

/**
 * Remove a spot from favourites
 */
export const removeFavourite = (spotId: string): void => {
  const favourites = loadFavourites();
  const filtered = favourites.filter(id => id !== spotId);
  saveFavourites(filtered);
};

/**
 * Toggle a spot's favourite status
 */
export const toggleFavourite = (spotId: string): boolean => {
  if (isFavourite(spotId)) {
    removeFavourite(spotId);
    return false;
  } else {
    addFavourite(spotId);
    return true;
  }
};

/**
 * React hook for reactive favourites
 * Automatically re-renders component when favourites change
 */
export const useFavourites = (): string[] => {
  const [favourites, setFavourites] = useState<string[]>(() => loadFavourites());

  useEffect(() => {
    const handleFavouritesChange = () => {
      setFavourites(loadFavourites());
    };

    // Listen for favourites changes
    window.addEventListener(FAVOURITES_CHANGE_EVENT, handleFavouritesChange);

    return () => {
      window.removeEventListener(FAVOURITES_CHANGE_EVENT, handleFavouritesChange);
    };
  }, []);

  return favourites;
};

/**
 * React hook to check if a specific spot is favourited
 * Automatically updates when favourites change
 */
export const useIsFavourite = (spotId: string | undefined): boolean => {
  const favourites = useFavourites();
  return spotId ? favourites.includes(spotId) : false;
};
