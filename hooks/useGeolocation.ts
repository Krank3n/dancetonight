
import { useState, useEffect } from 'react';
import { UserLocation } from '../types';
import { DEFAULT_LOCATION } from '../constants';

interface GeolocationState {
  location: UserLocation | null;
  error: string | null;
  loading: boolean;
}

function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        location: DEFAULT_LOCATION,
        error: 'Geolocation is not supported by your browser. Using default location.',
        loading: false,
      });
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        error: null,
        loading: false,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      let errorMessage = 'Error getting location. Using default location.';
      if (error.code === error.PERMISSION_DENIED) {
        errorMessage = 'Geolocation permission denied. Using default location.';
      }
      setState({
        location: DEFAULT_LOCATION, // Fallback to default location
        error: errorMessage,
        loading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0 // Force fresh location
    });
  }, []);

  return state;
}

export default useGeolocation;
