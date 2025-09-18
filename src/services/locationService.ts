/**
 * Location Service for Auto-Detection and Manual Entry
 * Handles geolocation API and reverse geocoding for attendance tracking
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  timestamp: number;
}

export interface LocationError {
  code: number;
  message: string;
  type: 'permission_denied' | 'position_unavailable' | 'timeout' | 'unknown';
}

class LocationService {
  private static instance: LocationService;
  private geocodingCache: Map<string, LocationData> = new Map();

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Get current location with automatic detection
   * @param timeout - Timeout in milliseconds (default: 10000)
   * @returns Promise<LocationData | null>
   */
  async getCurrentLocation(timeout: number = 10000): Promise<LocationData | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: 300000 // 5 minutes cache
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const locationData = await this.reverseGeocode(
              position.coords.latitude,
              position.coords.longitude
            );
            resolve(locationData);
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
            // Return basic location data even if reverse geocoding fails
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
              city: 'Unknown',
              state: 'Unknown',
              country: 'Unknown',
              timestamp: Date.now()
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          resolve(null);
        },
        options
      );
    });
  }

  /**
   * Reverse geocode coordinates to get address information
   * @param latitude 
   * @param longitude 
   * @returns Promise<LocationData>
   */
  private async reverseGeocode(latitude: number, longitude: number): Promise<LocationData> {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Check cache first
    if (this.geocodingCache.has(cacheKey)) {
      const cached = this.geocodingCache.get(cacheKey)!;
      return { ...cached, timestamp: Date.now() };
    }

    try {
      // Use OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
        {
          headers: {
            'User-Agent': 'DREnterprise-Attendance/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const locationData: LocationData = {
        latitude,
        longitude,
        address: this.formatAddress(data),
        city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
        state: data.address?.state || data.address?.province || 'Unknown',
        country: data.address?.country || 'Unknown',
        timestamp: Date.now()
      };

      // Cache the result
      this.geocodingCache.set(cacheKey, locationData);
      
      return locationData;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Return fallback location data
      return {
        latitude,
        longitude,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Format address from Nominatim response
   * @param data - Nominatim response data
   * @returns Formatted address string
   */
  private formatAddress(data: any): string {
    const address = data.address;
    if (!address) {
      return `${data.lat}, ${data.lon}`;
    }

    const parts = [];
    
    // Building/House number
    if (address.house_number) {
      parts.push(address.house_number);
    }
    
    // Road/Street
    if (address.road) {
      parts.push(address.road);
    }
    
    // Suburb/Neighborhood
    if (address.suburb) {
      parts.push(address.suburb);
    }
    
    // City/Town
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    
    // State/Province
    if (address.state || address.province) {
      parts.push(address.state || address.province);
    }
    
    // Country
    if (address.country) {
      parts.push(address.country);
    }

    return parts.length > 0 ? parts.join(', ') : `${data.lat}, ${data.lon}`;
  }

  /**
   * Validate if location data is recent (within 5 minutes)
   * @param locationData 
   * @returns boolean
   */
  isLocationRecent(locationData: LocationData): boolean {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return locationData.timestamp > fiveMinutesAgo;
  }

  /**
   * Get location error message for user display
   * @param error 
   * @returns User-friendly error message
   */
  getLocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location permissions or enter location manually.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable. Please enter location manually.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again or enter location manually.';
      default:
        return 'Unable to get location. Please enter location manually.';
    }
  }

  /**
   * Clear geocoding cache
   */
  clearCache(): void {
    this.geocodingCache.clear();
  }
}

export const locationService = LocationService.getInstance();
export default locationService;
