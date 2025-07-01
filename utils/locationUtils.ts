// utils/locationUtils.ts

export interface LocationInfo {
    city?: string;
    suburb?: string;
    state?: string;
    country?: string;
    formatted?: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}

/**
 * Convert coordinates to human-readable location using BigDataCloud's free API
 * This is free with unlimited requests for client-side use
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<LocationInfo> => {
    try {
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch location data');
        }

        const data = await response.json();

        // Extract the most relevant location parts
        const locationInfo: LocationInfo = {
            coordinates: { lat, lng },
            city: data.city || data.locality,
            suburb: data.localityInfo?.LikelyLand || data.neighbourhood,
            state: data.principalSubdivision,
            country: data.countryName,
            formatted: formatLocationString(data)
        };

        return locationInfo;
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        // Fallback to coordinates
        return {
            coordinates: { lat, lng },
            formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        };
    }
};

/**
 * Format location data into a nice readable string
 */
const formatLocationString = (data: any): string => {
    const parts = [];

    // Priority order: suburb/neighbourhood -> city -> state -> country
    if (data.localityInfo?.LikelyLand) {
        parts.push(data.localityInfo.LikelyLand);
    } else if (data.neighbourhood) {
        parts.push(data.neighbourhood);
    }

    if (data.city || data.locality) {
        parts.push(data.city || data.locality);
    }

    if (data.principalSubdivision) {
        parts.push(data.principalSubdivision);
    }

    // Only show country if it's not too long and we don't have much other info
    if (parts.length < 2 && data.countryName) {
        parts.push(data.countryName);
    }

    return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
};

// components/LocationDisplay.tsx
import React, { useState, useEffect } from 'react';
import { LocationPinIcon } from './IconComponents';
import { reverseGeocode, LocationInfo } from '../utils/locationUtils';

interface LocationDisplayProps {
    lat: number;
    lng: number;
    className?: string;
    showCoordinates?: boolean;
    compact?: boolean;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({
                                                             lat,
                                                             lng,
                                                             className = '',
                                                             showCoordinates = false,
                                                             compact = false
                                                         }) => {
    const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchLocation = async () => {
            setLoading(true);
            setError(false);

            try {
                const info = await reverseGeocode(lat, lng);
                setLocationInfo(info);
            } catch (err) {
                setError(true);
                // Fallback to coordinates
                setLocationInfo({
                    coordinates: { lat, lng },
                    formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                });
            } finally {
                setLoading(false);
            }
        };

        if (lat && lng) {
            fetchLocation();
        }
    }, [lat, lng]);

    if (loading) {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
        <LocationPinIcon className="w-4 h-4 text-gray-400 animate-pulse" />
        <span className="text-sm text-gray-400 animate-pulse">Getting location...</span>
        </div>
    );
    }

    if (!locationInfo) {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
        <LocationPinIcon className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-400">Location unavailable</span>
        </div>
    );
    }

    if (compact) {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
        <LocationPinIcon className="w-4 h-4 text-pink-400 flex-shrink-0" />
        <span className="text-sm text-gray-200 truncate" title={locationInfo.formatted}>
            {locationInfo.formatted}
            </span>
            </div>
    );
    }

    return (
        <div className={`bg-gray-700 border border-gray-600 rounded-lg p-3 ${className}`}>
    <div className="flex items-start space-x-3">
    <LocationPinIcon className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
    <div className="flex flex-col space-y-1">
    <span className="text-sm font-medium text-gray-200">
        {locationInfo.formatted}
        </span>

    {showCoordinates && (
        <span className="text-xs text-gray-400 font-mono">
            {lat.toFixed(6)}, {lng.toFixed(6)}
        </span>
    )}

    {(locationInfo.city || locationInfo.suburb) && (
        <div className="flex flex-wrap gap-2 mt-1">
            {locationInfo.suburb && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full">
                        {locationInfo.suburb}
                        </span>
                )}
        {locationInfo.city && locationInfo.city !== locationInfo.suburb && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {locationInfo.city}
                </span>
        )}
        </div>
    )}
    </div>
    </div>
    </div>
    </div>
);
};

export default LocationDisplay;

// Example usage in your FilterBar or wherever you display location:

/*
// In your component where you have lat/lng coordinates:
import LocationDisplay from './components/LocationDisplay';

// Instead of showing raw coordinates:
<p>Latitude: {lat}, Longitude: {lng}</p>

// Use this:
<LocationDisplay
  lat={lat}
  lng={lng}
  showCoordinates={true} // Optional: also show coordinates
  compact={false} // Set to true for a more compact display
  className="mb-4"
/>

// Or for a compact version in the filter bar status:
<LocationDisplay
  lat={lat}
  lng={lng}
  compact={true}
  className="text-center"
/>
*/