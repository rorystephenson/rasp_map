/**
 * Tests for MapContext
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MapProvider, useMapContext } from './MapContext';
import { apiClient } from '../api/client';
import { ForecastRegion } from '../api/types';

// Mock the API client
jest.mock('../api/client', () => ({
  apiClient: {
    getForecastLocations: jest.fn(),
  }
}));

describe('MapContext', () => {
  const mockOnLogout = jest.fn();
  const mockForecastData: ForecastRegion[] = [
    {
      region_id: '1',
      region_name: 'Test Region',
      windgram_list: [
        {
          windgram_id: 'wg-1',
          windgram_name: 'Test Location',
          coord: { lat: '42.5', lng: '12.5' }
        }
      ]
    }
  ];

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MapProvider onLogout={mockOnLogout}>{children}</MapProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide initial state', () => {
    (apiClient.getForecastLocations as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to keep loading state
    );

    const { result } = renderHook(() => useMapContext(), { wrapper });

    expect(result.current.regions).toEqual([]);
    expect(result.current.mapInstance).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should load forecast locations successfully', async () => {
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: mockForecastData
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.regions).toEqual(mockForecastData);
    expect(result.current.error).toBe(null);
  });

  it('should set error when load fails', async () => {
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Network error'
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.regions).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('should set default error message when error is undefined', async () => {
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: undefined
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Impossibile caricare le località');
  });

  it('should handle exceptions during load', async () => {
    (apiClient.getForecastLocations as jest.Mock).mockRejectedValueOnce(
      new Error('Network failure')
    );

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.regions).toEqual([]);
    expect(result.current.error).toBe('Errore di rete. Riprova.');
  });

  it('should only clear error on successful load', async () => {
    // First, simulate a failed load
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Initial error'
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe('Initial error');
    });

    // Now retry with success
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: mockForecastData
    });

    await act(async () => {
      result.current.retryLoad();
    });

    await waitFor(() => {
      expect(result.current.error).toBe(null);
      expect(result.current.regions).toEqual(mockForecastData);
    });
  });

  it('should keep error when retry also fails', async () => {
    // First load fails
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'First error'
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe('First error');
    });

    // Retry also fails
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Second error'
    });

    await act(async () => {
      result.current.retryLoad();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Second error');
    });
  });

  it('should handle background updates via callback', async () => {
    let updateCallback: ((data: ForecastRegion[]) => void) | undefined;

    (apiClient.getForecastLocations as jest.Mock).mockImplementation((callback) => {
      updateCallback = callback;
      return Promise.resolve({
        success: true,
        data: mockForecastData
      });
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updatedData: ForecastRegion[] = [
      {
        region_id: '2',
        region_name: 'Updated Region',
        windgram_list: []
      }
    ];

    // Simulate background update
    await act(async () => {
      if (updateCallback) {
        updateCallback(updatedData);
      }
    });

    await waitFor(() => {
      expect(result.current.regions).toEqual(updatedData);
    });
  });

  it('should find location by ID', async () => {
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: mockForecastData
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const location = result.current.findLocationById('wg-1');

    expect(location).not.toBe(null);
    expect(location?.windgram_id).toBe('wg-1');
    expect(location?.windgram_name).toBe('Test Location');
  });

  it('should return null for non-existent location ID', async () => {
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: mockForecastData
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const location = result.current.findLocationById('non-existent');

    expect(location).toBe(null);
  });

  it('should set map instance', async () => {
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: mockForecastData
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    const mockMapInstance = { fake: 'map' };

    act(() => {
      result.current.setMapInstance(mockMapInstance);
    });

    expect(result.current.mapInstance).toBe(mockMapInstance);
  });

  it('should set isLoading to true when retryLoad is called', async () => {
    (apiClient.getForecastLocations as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: mockForecastData
    });

    const { result } = renderHook(() => useMapContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Setup for retry
    (apiClient.getForecastLocations as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves to check loading state
    );

    act(() => {
      result.current.retryLoad();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });
  });
});
