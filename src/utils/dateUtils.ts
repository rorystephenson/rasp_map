/**
 * Date utilities for forecast day selection
 * Handles persistent day selection across app sessions
 */

import { storageService } from '../services/StorageService';
import { TranslationKey } from '../i18n/translations';

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  return formatDateToString(today);
};

/**
 * Format a Date object to YYYY-MM-DD string (local timezone)
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse YYYY-MM-DD string to Date object (local timezone)
 */
export const parseStringToDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Get date for a specific day offset from today (0 = today, 1 = tomorrow, etc.)
 */
export const getDateForOffset = (dayOffset: number): string => {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + dayOffset);
  return formatDateToString(targetDate);
};

/**
 * Calculate day offset from today for a given date string
 * Returns null if date is more than 4 days in the future or in the past
 */
export const calculateDayOffset = (dateString: string): number | null => {
  const today = new Date();
  const targetDate = parseStringToDate(dateString);
  
  // Normalize both dates to midnight to avoid time zone issues
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetNormalized = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  
  // Calculate difference in days
  const timeDiff = targetNormalized.getTime() - todayNormalized.getTime();
  const dayDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));
  
  // Only allow 0-4 days in the future (API constraint)
  if (dayDiff >= 0 && dayDiff <= 4) {
    return dayDiff;
  }
  
  return null;
};

/**
 * Get day abbreviation translation key for a specific day offset
 */
export const getDayTranslationKey = (dayOffset: number): TranslationKey => {
  const dayKeys: TranslationKey[] = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + dayOffset);
  return dayKeys[targetDate.getDay()];
};

/**
 * Save selected date using storage service
 */
export const saveSelectedDate = (dayOffset: number): void => {
  const dateString = getDateForOffset(dayOffset);
  storageService.setSelectedDate(dateString);
};

/**
 * Load selected day offset from storage service
 * Returns null if no saved date, date is invalid, or date is out of range
 */
export const loadSelectedDayOffset = (): number | null => {
  const savedDate = storageService.getSelectedDate();
  if (!savedDate) {
    return null;
  }

  return calculateDayOffset(savedDate);
};

/**
 * Get the appropriate day offset to use, considering saved preferences
 * Falls back to today (0) if saved date is invalid or out of range
 */
export const getInitialDayOffset = (): number => {
  const savedOffset = loadSelectedDayOffset();
  return savedOffset !== null ? savedOffset : 0;
};