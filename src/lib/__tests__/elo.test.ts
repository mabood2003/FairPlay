import {
  calculateExpectedScore,
  calculateNewElo,
  calculateTeamAverageElo,
  processGameResults,
  getEloTier,
  getEloTierColor,
} from '../elo';
import { ELO_K_FACTOR } from '../types';

describe('calculateExpectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(calculateExpectedScore(1200, 1200)).toBeCloseTo(0.5);
  });

  it('returns higher score for higher-rated player', () => {
    const score = calculateExpectedScore(1600, 1200);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns lower score for lower-rated player', () => {
    const score = calculateExpectedScore(1200, 1600);
    expect(score).toBeLessThan(0.5);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('complementary expected scores sum to 1', () => {
    const scoreA = calculateExpectedScore(1400, 1200);
    const scoreB = calculateExpectedScore(1200, 1400);
    expect(scoreA + scoreB).toBeCloseTo(1);
  });

  it('handles extreme rating differences', () => {
    const score = calculateExpectedScore(2500, 800);
    expect(score).toBeGreaterThan(0.99);
  });
});

describe('calculateNewElo', () => {
  it('increases Elo on win when expected to lose', () => {
    const expected = calculateExpectedScore(1200, 1600);
    const newElo = calculateNewElo(1200, expected, 1);
    expect(newElo).toBeGreaterThan(1200);
  });

  it('decreases Elo on loss when expected to win', () => {
    const expected = calculateExpectedScore(1600, 1200);
    const newElo = calculateNewElo(1600, expected, 0);
    expect(newElo).toBeLessThan(1600);
  });

  it('barely changes Elo on expected outcome', () => {
    // High-rated player wins against low-rated player
    const expected = calculateExpectedScore(1600, 1000);
    const newElo = calculateNewElo(1600, expected, 1);
    // Gain should be small since win was expected
    expect(newElo - 1600).toBeLessThan(ELO_K_FACTOR / 2);
  });

  it('does not change Elo when actual matches expected', () => {
    const expected = 0.5;
    const newElo = calculateNewElo(1200, expected, 0.5);
    expect(newElo).toBe(1200);
  });

  it('uses custom K-factor', () => {
    const expected = 0.5;
    const newElo = calculateNewElo(1200, expected, 1, 16);
    expect(newElo).toBe(1208); // 1200 + 16 * (1 - 0.5) = 1208
  });

  it('rounds to nearest integer', () => {
    const newElo = calculateNewElo(1200, 0.5, 1, ELO_K_FACTOR);
    expect(Number.isInteger(newElo)).toBe(true);
  });
});

describe('calculateTeamAverageElo', () => {
  it('returns 0 for empty team', () => {
    expect(calculateTeamAverageElo([])).toBe(0);
  });

  it('returns the value for single player', () => {
    expect(calculateTeamAverageElo([1500])).toBe(1500);
  });

  it('calculates correct average', () => {
    expect(calculateTeamAverageElo([1200, 1400])).toBe(1300);
  });

  it('rounds the average', () => {
    const result = calculateTeamAverageElo([1200, 1300, 1400]);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(1300);
  });
});

describe('processGameResults', () => {
  it('returns new ratings for all players', () => {
    const team1 = new Map([['p1', 1200], ['p2', 1300]]);
    const team2 = new Map([['p3', 1250], ['p4', 1350]]);

    const results = processGameResults(team1, team2, 10, 5);

    expect(results.size).toBe(4);
    expect(results.has('p1')).toBe(true);
    expect(results.has('p2')).toBe(true);
    expect(results.has('p3')).toBe(true);
    expect(results.has('p4')).toBe(true);
  });

  it('winners gain Elo and losers lose Elo', () => {
    const team1 = new Map([['winner', 1200]]);
    const team2 = new Map([['loser', 1200]]);

    const results = processGameResults(team1, team2, 10, 5);

    expect(results.get('winner')!).toBeGreaterThan(1200);
    expect(results.get('loser')!).toBeLessThan(1200);
  });

  it('draw keeps ratings closer to original', () => {
    const team1 = new Map([['p1', 1200]]);
    const team2 = new Map([['p2', 1200]]);

    const results = processGameResults(team1, team2, 5, 5);

    // Equal ratings + draw = no change
    expect(results.get('p1')).toBe(1200);
    expect(results.get('p2')).toBe(1200);
  });

  it('upset results in larger Elo changes', () => {
    // Low-rated team beats high-rated team
    const team1Low = new Map([['underdog', 1000]]);
    const team2High = new Map([['favorite', 1400]]);
    const upsetResults = processGameResults(team1Low, team2High, 10, 5);

    // Expected win
    const team1High = new Map([['favorite2', 1400]]);
    const team2Low = new Map([['underdog2', 1000]]);
    const expectedResults = processGameResults(team1High, team2Low, 10, 5);

    const underdogGain = upsetResults.get('underdog')! - 1000;
    const favoriteGain = expectedResults.get('favorite2')! - 1400;

    expect(underdogGain).toBeGreaterThan(favoriteGain);
  });

  it('total Elo change is approximately zero-sum in equal teams', () => {
    const team1 = new Map([['p1', 1200]]);
    const team2 = new Map([['p2', 1200]]);

    const results = processGameResults(team1, team2, 10, 5);

    const p1Change = results.get('p1')! - 1200;
    const p2Change = results.get('p2')! - 1200;

    // Should be approximately zero-sum (rounding may cause ±1)
    expect(Math.abs(p1Change + p2Change)).toBeLessThanOrEqual(1);
  });
});

describe('getEloTier', () => {
  it('returns Bronze for sub-1000', () => {
    expect(getEloTier(999)).toBe('Bronze');
    expect(getEloTier(800)).toBe('Bronze');
  });

  it('returns Silver for 1000-1199', () => {
    expect(getEloTier(1000)).toBe('Silver');
    expect(getEloTier(1199)).toBe('Silver');
  });

  it('returns Gold for 1200-1399', () => {
    expect(getEloTier(1200)).toBe('Gold');
    expect(getEloTier(1399)).toBe('Gold');
  });

  it('returns Platinum for 1400-1599', () => {
    expect(getEloTier(1400)).toBe('Platinum');
  });

  it('returns Diamond for 1600-1799', () => {
    expect(getEloTier(1600)).toBe('Diamond');
  });

  it('returns Master for 1800-1999', () => {
    expect(getEloTier(1800)).toBe('Master');
  });

  it('returns Grandmaster for 2000+', () => {
    expect(getEloTier(2000)).toBe('Grandmaster');
    expect(getEloTier(2500)).toBe('Grandmaster');
  });
});

describe('getEloTierColor', () => {
  it('returns correct color for each tier', () => {
    expect(getEloTierColor('Bronze')).toBe('text-amber-700');
    expect(getEloTierColor('Silver')).toBe('text-gray-400');
    expect(getEloTierColor('Gold')).toBe('text-yellow-500');
    expect(getEloTierColor('Platinum')).toBe('text-cyan-400');
    expect(getEloTierColor('Diamond')).toBe('text-blue-400');
    expect(getEloTierColor('Master')).toBe('text-purple-500');
    expect(getEloTierColor('Grandmaster')).toBe('text-red-500');
  });

  it('returns fallback for unknown tier', () => {
    expect(getEloTierColor('Unknown')).toBe('text-gray-500');
  });
});
