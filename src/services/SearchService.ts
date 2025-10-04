import { matchSorter, MatchSorterOptions, rankings } from 'match-sorter';
import { ForecastLocation, ForecastRegion } from '../api/types';

export interface LocationWithRegion extends ForecastLocation {
  region_name: string;
}

export interface SearchResult {
  location: LocationWithRegion;
  score?: number;
}

export interface SearchOptions {
  maxResults?: number;
  threshold?: typeof rankings[keyof typeof rankings];
}

/**
 * Encapsulated search service for forecast locations.
 * Can be easily swapped out for different search implementations.
 */
export class SearchService {
  private locations: LocationWithRegion[] = [];
  private matchSorterOptions: MatchSorterOptions<LocationWithRegion>;

  constructor() {
    // Configure match-sorter for our use case
    this.matchSorterOptions = {
      keys: [
        'windgram_name', // Primary search field
        'region_name'    // Secondary search field if needed
      ],
      threshold: rankings.CONTAINS,
      // Keep all results by default, let caller decide on limiting
      keepDiacritics: false, // Ignore accents/diacritics
    };
  }

  /**
   * Initialize or update the search index with regions data
   */
  public setRegions(regions: ForecastRegion[]): void {
    // Flatten regions into locations with region_name included
    this.locations = regions.flatMap(region => 
      region.windgram_list.map(location => ({
        ...location,
        region_name: region.region_name
      }))
    );
  }

  /**
   * Perform fuzzy search on the loaded locations
   */
  public search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    const { maxResults, threshold } = options;
    
    // Update threshold if provided
    const searchOptions = { ...this.matchSorterOptions };
    if (threshold !== undefined) {
      searchOptions.threshold = threshold;
    }

    // Perform the search
    const results = matchSorter(this.locations, query.trim(), searchOptions);

    // Limit results if requested
    const limitedResults = maxResults 
      ? results.slice(0, maxResults)
      : results;

    // Convert to SearchResult format
    return limitedResults.map(location => ({
      location,
      // match-sorter doesn't expose scores directly, but results are sorted by relevance
      score: undefined
    }));
  }

  /**
   * Get all available locations (useful for showing recent searches, etc.)
   */
  public getAllLocations(): LocationWithRegion[] {
    return [...this.locations];
  }

  /**
   * Get the total number of locations in the search index
   */
  public getLocationCount(): number {
    return this.locations.length;
  }

  /**
   * Check if the search index is ready
   */
  public isReady(): boolean {
    return this.locations.length > 0;
  }
}