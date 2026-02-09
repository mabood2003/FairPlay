import {
  calculateDistance,
  isWithinCheckInRadius,
  isWithinCheckInWindow,
  getTimeUntilCheckInWindow,
  calculateReliabilityPenalty,
  calculateReliabilityBoost,
  formatDistance,
  Coordinates,
} from '../geolocation';
import { CHECK_IN_RADIUS_METERS, CHECK_IN_WINDOW_MINUTES, NO_SHOW_PENALTY_MULTIPLIER } from '../types';

describe('calculateDistance', () => {
  it('returns 0 for identical points', () => {
    const point: Coordinates = { lat: 40.7128, lng: -74.006 };
    expect(calculateDistance(point, point)).toBeCloseTo(0, 0);
  });

  it('calculates known distance between NYC and LA (~3944 km)', () => {
    const nyc: Coordinates = { lat: 40.7128, lng: -74.006 };
    const la: Coordinates = { lat: 34.0522, lng: -118.2437 };
    const distance = calculateDistance(nyc, la);
    // Approximately 3944 km
    expect(distance).toBeGreaterThan(3900000);
    expect(distance).toBeLessThan(4000000);
  });

  it('is symmetric (distance A->B equals B->A)', () => {
    const a: Coordinates = { lat: 51.5074, lng: -0.1278 }; // London
    const b: Coordinates = { lat: 48.8566, lng: 2.3522 }; // Paris
    expect(calculateDistance(a, b)).toBeCloseTo(calculateDistance(b, a), 0);
  });

  it('calculates short distances accurately (~100m)', () => {
    // Two points approximately 100m apart
    const a: Coordinates = { lat: 40.7128, lng: -74.006 };
    const b: Coordinates = { lat: 40.7137, lng: -74.006 }; // ~100m north
    const distance = calculateDistance(a, b);
    expect(distance).toBeGreaterThan(50);
    expect(distance).toBeLessThan(200);
  });

  it('handles equator correctly', () => {
    const a: Coordinates = { lat: 0, lng: 0 };
    const b: Coordinates = { lat: 0, lng: 1 };
    // 1 degree at equator ≈ 111.32 km
    const distance = calculateDistance(a, b);
    expect(distance).toBeGreaterThan(110000);
    expect(distance).toBeLessThan(112000);
  });
});

describe('isWithinCheckInRadius', () => {
  const gameLocation: Coordinates = { lat: 40.7128, lng: -74.006 };

  it('returns true when at the game location', () => {
    expect(isWithinCheckInRadius(gameLocation, gameLocation)).toBe(true);
  });

  it('returns true when within default radius', () => {
    // ~100m away
    const nearby: Coordinates = { lat: 40.7137, lng: -74.006 };
    expect(isWithinCheckInRadius(nearby, gameLocation)).toBe(true);
  });

  it('returns false when outside default radius', () => {
    // ~5km away
    const farAway: Coordinates = { lat: 40.76, lng: -74.006 };
    expect(isWithinCheckInRadius(farAway, gameLocation)).toBe(false);
  });

  it('respects custom radius', () => {
    // ~100m away
    const nearby: Coordinates = { lat: 40.7137, lng: -74.006 };
    // Should be outside a 50m radius
    expect(isWithinCheckInRadius(nearby, gameLocation, 50)).toBe(false);
    // Should be inside a 200m radius
    expect(isWithinCheckInRadius(nearby, gameLocation, 200)).toBe(true);
  });

  it('uses CHECK_IN_RADIUS_METERS as default', () => {
    // Point exactly at the boundary
    // At 40.7128N, 500m ≈ 0.0045 degrees latitude
    const atBoundary: Coordinates = { lat: 40.7128 + 0.005, lng: -74.006 };
    const distance = calculateDistance(atBoundary, gameLocation);
    const expected = distance <= CHECK_IN_RADIUS_METERS;
    expect(isWithinCheckInRadius(atBoundary, gameLocation)).toBe(expected);
  });
});

describe('isWithinCheckInWindow', () => {
  it('returns true at game start time', () => {
    const now = new Date();
    expect(isWithinCheckInWindow(now)).toBe(true);
  });

  it('returns true within window before game start', () => {
    const futureStart = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
    expect(isWithinCheckInWindow(futureStart)).toBe(true);
  });

  it('returns true within window after game start', () => {
    const pastStart = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
    expect(isWithinCheckInWindow(pastStart)).toBe(true);
  });

  it('returns false well before window opens', () => {
    const farFuture = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    expect(isWithinCheckInWindow(farFuture)).toBe(false);
  });

  it('returns false well after window closes', () => {
    const farPast = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    expect(isWithinCheckInWindow(farPast)).toBe(false);
  });

  it('respects custom window size', () => {
    const futureStart = new Date(Date.now() + 20 * 60 * 1000); // 20 min from now
    // Default 15-min window: should be outside
    expect(isWithinCheckInWindow(futureStart, 15)).toBe(false);
    // 30-min window: should be inside
    expect(isWithinCheckInWindow(futureStart, 30)).toBe(true);
  });
});

describe('getTimeUntilCheckInWindow', () => {
  it('returns 0 when window is already open', () => {
    const now = new Date();
    expect(getTimeUntilCheckInWindow(now)).toBe(0);
  });

  it('returns 0 when game has started', () => {
    const pastStart = new Date(Date.now() - 60 * 60 * 1000);
    expect(getTimeUntilCheckInWindow(pastStart)).toBe(0);
  });

  it('returns positive value for future game', () => {
    const farFuture = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const time = getTimeUntilCheckInWindow(farFuture);
    expect(time).toBeGreaterThan(0);
  });

  it('returns approximately correct time', () => {
    const futureStart = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const time = getTimeUntilCheckInWindow(futureStart, CHECK_IN_WINDOW_MINUTES);
    // Should be about 45 minutes (60 min - 15 min window)
    const expectedMs = (60 - CHECK_IN_WINDOW_MINUTES) * 60 * 1000;
    expect(Math.abs(time - expectedMs)).toBeLessThan(1000); // Within 1 second
  });
});

describe('calculateReliabilityPenalty', () => {
  it('reduces reliability by default penalty', () => {
    const result = calculateReliabilityPenalty(100);
    expect(result).toBe(Math.round(100 * NO_SHOW_PENALTY_MULTIPLIER));
  });

  it('uses custom multiplier', () => {
    expect(calculateReliabilityPenalty(100, 0.9)).toBe(90);
  });

  it('rounds the result', () => {
    const result = calculateReliabilityPenalty(93);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('decreases on repeated penalties', () => {
    let score = 100;
    for (let i = 0; i < 5; i++) {
      const newScore = calculateReliabilityPenalty(score);
      expect(newScore).toBeLessThan(score);
      score = newScore;
    }
  });

  it('approaches 0 but stays non-negative', () => {
    let score = 100;
    for (let i = 0; i < 100; i++) {
      score = calculateReliabilityPenalty(score);
    }
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateReliabilityBoost', () => {
  it('increases reliability by 1', () => {
    expect(calculateReliabilityBoost(90)).toBe(91);
  });

  it('caps at 100', () => {
    expect(calculateReliabilityBoost(100)).toBe(100);
    expect(calculateReliabilityBoost(99)).toBe(100);
  });

  it('does not exceed 100', () => {
    expect(calculateReliabilityBoost(100)).toBe(100);
  });
});

describe('formatDistance', () => {
  it('formats meters for distances under 1km', () => {
    expect(formatDistance(500)).toBe('500m');
    expect(formatDistance(100)).toBe('100m');
  });

  it('rounds meters', () => {
    expect(formatDistance(123.4)).toBe('123m');
    expect(formatDistance(123.6)).toBe('124m');
  });

  it('formats kilometers for distances >= 1km', () => {
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(10000)).toBe('10.0km');
  });

  it('formats zero distance', () => {
    expect(formatDistance(0)).toBe('0m');
  });
});
