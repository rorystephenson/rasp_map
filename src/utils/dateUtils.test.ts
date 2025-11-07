/**
 * Tests for date utilities
 * Tests cover edge cases like leap years, month boundaries, and timezone handling
 */

import {
  formatDateToString,
  parseStringToDate,
  getDateForOffset,
  calculateDayOffset,
  getDayTranslationKey,
  saveSelectedDate,
  loadSelectedDayOffset,
  getInitialDayOffset
} from './dateUtils';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('dateUtils', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.useRealTimers();
  });

  describe('formatDateToString', () => {
    it('should format date correctly', () => {
      const date = new Date(2023, 8, 10); // September 10, 2023
      expect(formatDateToString(date)).toBe('2023-09-10');
    });

    it('should handle single digit months and days', () => {
      const date = new Date(2023, 0, 5); // January 5, 2023
      expect(formatDateToString(date)).toBe('2023-01-05');
    });

    it('should handle leap year February 29', () => {
      const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      expect(formatDateToString(date)).toBe('2024-02-29');
    });
  });

  describe('parseStringToDate', () => {
    it('should parse date string correctly', () => {
      const date = parseStringToDate('2023-09-10');
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(8); // September (0-indexed)
      expect(date.getDate()).toBe(10);
    });

    it('should handle leap year dates', () => {
      const date = parseStringToDate('2024-02-29');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(29);
    });
  });

  describe('getDateForOffset', () => {
    it('should return today for offset 0', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      expect(getDateForOffset(0)).toBe('2023-09-10');
      
      jest.useRealTimers();
    });

    it('should return tomorrow for offset 1', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      expect(getDateForOffset(1)).toBe('2023-09-11');
      
      jest.useRealTimers();
    });

    it('should handle month boundary crossing', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 30)); // September 30, 2023
      
      expect(getDateForOffset(1)).toBe('2023-10-01');
      
      jest.useRealTimers();
    });

    it('should handle year boundary crossing', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 11, 31)); // December 31, 2023
      
      expect(getDateForOffset(1)).toBe('2024-01-01');
      
      jest.useRealTimers();
    });

    it('should handle leap year February 28 to 29', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 1, 28)); // February 28, 2024 (leap year)
      
      expect(getDateForOffset(1)).toBe('2024-02-29');
      
      jest.useRealTimers();
    });
  });

  describe('calculateDayOffset', () => {
    it('should return 0 for today', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      expect(calculateDayOffset('2023-09-10')).toBe(0);
      
      jest.useRealTimers();
    });

    it('should return 1 for tomorrow', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      expect(calculateDayOffset('2023-09-11')).toBe(1);
      
      jest.useRealTimers();
    });

    it('should return 4 for 4 days ahead', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      expect(calculateDayOffset('2023-09-14')).toBe(4);
      
      jest.useRealTimers();
    });

    it('should return null for 5 days ahead (out of range)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      expect(calculateDayOffset('2023-09-15')).toBe(null);
      
      jest.useRealTimers();
    });

    it('should return null for yesterday (past date)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      expect(calculateDayOffset('2023-09-09')).toBe(null);
      
      jest.useRealTimers();
    });

    it('should handle month boundary', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 30)); // September 30, 2023
      
      expect(calculateDayOffset('2023-10-01')).toBe(1);
      expect(calculateDayOffset('2023-10-04')).toBe(4);
      
      jest.useRealTimers();
    });
  });

  describe('getDayTranslationKey', () => {
    it('should return correct day keys for offsets', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 11)); // Monday, September 11, 2023

      expect(getDayTranslationKey(0)).toBe('day.mon'); // Monday (today)
      expect(getDayTranslationKey(1)).toBe('day.tue'); // Tuesday
      expect(getDayTranslationKey(2)).toBe('day.wed'); // Wednesday
      expect(getDayTranslationKey(3)).toBe('day.thu'); // Thursday
      expect(getDayTranslationKey(4)).toBe('day.fri'); // Friday

      jest.useRealTimers();
    });

    it('should handle week boundary crossing', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 16)); // Saturday, September 16, 2023

      expect(getDayTranslationKey(0)).toBe('day.sat'); // Saturday (today)
      expect(getDayTranslationKey(1)).toBe('day.sun'); // Sunday
      expect(getDayTranslationKey(2)).toBe('day.mon'); // Monday

      jest.useRealTimers();
    });
  });

  describe('localStorage persistence', () => {
    it('should save and load selected date', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      saveSelectedDate(2); // Save day offset 2 (September 12)
      expect(loadSelectedDayOffset()).toBe(2);
      
      jest.useRealTimers();
    });

    it('should return null when no date is saved', () => {
      expect(loadSelectedDayOffset()).toBe(null);
    });

    it('should return null when saved date is out of range', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      // Manually set an old date
      localStorageMock.setItem('selected_forecast_date', '2023-09-05'); // 5 days ago
      expect(loadSelectedDayOffset()).toBe(null);
      
      jest.useRealTimers();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('localStorage error');
      };
      
      expect(loadSelectedDayOffset()).toBe(null);
      
      // Restore original implementation
      localStorageMock.getItem = originalGetItem;
    });
  });

  describe('getInitialDayOffset', () => {
    it('should return saved offset when valid', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      saveSelectedDate(3);
      expect(getInitialDayOffset()).toBe(3);
      
      jest.useRealTimers();
    });

    it('should fall back to 0 when no saved date', () => {
      expect(getInitialDayOffset()).toBe(0);
    });

    it('should fall back to 0 when saved date is out of range', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 8, 10)); // September 10, 2023
      
      localStorageMock.setItem('selected_forecast_date', '2023-09-05'); // Past date
      expect(getInitialDayOffset()).toBe(0);
      
      jest.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should handle timezone changes correctly', () => {
      // Test that dates work consistently regardless of timezone
      const date = new Date(2023, 8, 10, 12, 0, 0); // September 10, 2023, noon
      const formatted = formatDateToString(date);
      const parsed = parseStringToDate(formatted);
      
      expect(parsed.getFullYear()).toBe(2023);
      expect(parsed.getMonth()).toBe(8);
      expect(parsed.getDate()).toBe(10);
    });

    it('should handle invalid date strings gracefully', () => {
      expect(() => parseStringToDate('invalid-date')).not.toThrow();
    });
  });
});