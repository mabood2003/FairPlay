'use client';

import { useState, useCallback } from 'react';
import { Coordinates, getCurrentPosition, isWithinCheckInRadius } from '@/lib/geolocation';

interface GeolocationState {
  position: Coordinates | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    loading: false,
    error: null,
  });

  const requestPosition = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const position = await getCurrentPosition();
      setState({ position, loading: false, error: null });
      return position;
    } catch (err) {
      const errorMessage =
        err instanceof GeolocationPositionError
          ? getGeolocationErrorMessage(err)
          : 'Failed to get location';
      setState({ position: null, loading: false, error: errorMessage });
      return null;
    }
  }, []);

  const checkDistance = useCallback(
    (targetLocation: Coordinates, radiusMeters?: number): boolean => {
      if (!state.position) return false;
      return isWithinCheckInRadius(state.position, targetLocation, radiusMeters);
    },
    [state.position]
  );

  return {
    ...state,
    requestPosition,
    checkDistance,
  };
}

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied. Please enable location access.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information unavailable.';
    case error.TIMEOUT:
      return 'Location request timed out.';
    default:
      return 'Unknown location error.';
  }
}
