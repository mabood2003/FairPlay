import { CHECK_IN_RADIUS_METERS, CHECK_IN_WINDOW_MINUTES, NO_SHOW_PENALTY_MULTIPLIER } from './types';

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param point1 - First coordinate
 * @param point2 - Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if user is within check-in radius of game location
 * @param userLocation - User's current coordinates
 * @param gameLocation - Game's coordinates
 * @param radiusMeters - Allowed radius in meters (default: 500)
 * @returns Whether user is within radius
 */
export function isWithinCheckInRadius(
  userLocation: Coordinates,
  gameLocation: Coordinates,
  radiusMeters: number = CHECK_IN_RADIUS_METERS
): boolean {
  const distance = calculateDistance(userLocation, gameLocation);
  return distance <= radiusMeters;
}

/**
 * Check if current time is within the check-in window
 * @param gameStartTime - Game start time
 * @param windowMinutes - Window size in minutes before/after start (default: 15)
 * @returns Whether current time is within window
 */
export function isWithinCheckInWindow(
  gameStartTime: Date,
  windowMinutes: number = CHECK_IN_WINDOW_MINUTES
): boolean {
  const now = new Date();
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = new Date(gameStartTime.getTime() - windowMs);
  const windowEnd = new Date(gameStartTime.getTime() + windowMs);

  return now >= windowStart && now <= windowEnd;
}

/**
 * Calculate time until check-in window opens
 * @param gameStartTime - Game start time
 * @param windowMinutes - Window size in minutes (default: 15)
 * @returns Milliseconds until window opens, or 0 if already open
 */
export function getTimeUntilCheckInWindow(
  gameStartTime: Date,
  windowMinutes: number = CHECK_IN_WINDOW_MINUTES
): number {
  const now = new Date();
  const windowStart = new Date(gameStartTime.getTime() - windowMinutes * 60 * 1000);
  const diff = windowStart.getTime() - now.getTime();
  return Math.max(0, diff);
}

/**
 * Calculate new reliability score after a no-show
 * @param currentScore - Current reliability score (0-100)
 * @param penaltyMultiplier - Multiplier for penalty (default: 0.95 = 5% reduction)
 * @returns New reliability score
 */
export function calculateReliabilityPenalty(
  currentScore: number,
  penaltyMultiplier: number = NO_SHOW_PENALTY_MULTIPLIER
): number {
  return Math.round(currentScore * penaltyMultiplier);
}

/**
 * Calculate reliability score increase after attending
 * Small boost for consistent attendance
 * @param currentScore - Current reliability score (0-100)
 * @returns New reliability score (capped at 100)
 */
export function calculateReliabilityBoost(currentScore: number): number {
  if (currentScore >= 100) return 100;
  // Small boost of 1 point for attendance, capped at 100
  return Math.min(100, currentScore + 1);
}

/**
 * Get current user position using browser Geolocation API
 * @returns Promise resolving to coordinates
 */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Format distance for display
 * @param meters - Distance in meters
 * @returns Formatted string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
