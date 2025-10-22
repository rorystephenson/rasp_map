/**
 * Favourites management utilities
 * Stores and retrieves favourite spot IDs from localStorage
 * Provides reactive updates via custom events
 */

import { useState, useEffect } from 'react';

const FAVOURITES_KEY = 'favourite_spots';
const FAVOURITES_CHANGE_EVENT = 'favourites-changed';

/**
 * Load favourite spot IDs from localStorage
 */
export const loadFavourites = (): string[] => {
  try {
    const stored = localStorage.getItem(FAVOURITES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load favourites:', error);
  }
  return [];
};

/**
 * Save favourite spot IDs to localStorage and notify listeners
 */
const saveFavourites = (favourites: string[]): void => {
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
    // Dispatch event to notify all listeners
    window.dispatchEvent(new CustomEvent(FAVOURITES_CHANGE_EVENT));
  } catch (error) {
    console.warn('Failed to save favourites:', error);
  }
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
