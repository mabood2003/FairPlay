import { ELO_K_FACTOR } from './types';

/**
 * Calculate expected score for a player based on Elo ratings
 * @param playerElo - The player's current Elo rating
 * @param opponentElo - The opponent's (or average opponent team's) Elo rating
 * @returns Expected score between 0 and 1
 */
export function calculateExpectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculate new Elo rating after a game
 * @param currentElo - Player's current Elo rating
 * @param expectedScore - Expected score from calculateExpectedScore
 * @param actualScore - Actual result: 1 for win, 0.5 for draw, 0 for loss
 * @param kFactor - K-factor (default: 32)
 * @returns New Elo rating (rounded to nearest integer)
 */
export function calculateNewElo(
  currentElo: number,
  expectedScore: number,
  actualScore: number,
  kFactor: number = ELO_K_FACTOR
): number {
  return Math.round(currentElo + kFactor * (actualScore - expectedScore));
}

/**
 * Calculate average Elo for a team
 * @param teamElos - Array of Elo ratings for team members
 * @returns Average Elo rating
 */
export function calculateTeamAverageElo(teamElos: number[]): number {
  if (teamElos.length === 0) return 0;
  return Math.round(teamElos.reduce((sum, elo) => sum + elo, 0) / teamElos.length);
}

/**
 * Process game results and calculate new Elo ratings for all players
 * @param team1Elos - Map of player UIDs to their Elo ratings for team 1
 * @param team2Elos - Map of player UIDs to their Elo ratings for team 2
 * @param team1Score - Team 1's final score
 * @param team2Score - Team 2's final score
 * @returns Map of player UIDs to their new Elo ratings
 */
export function processGameResults(
  team1Elos: Map<string, number>,
  team2Elos: Map<string, number>,
  team1Score: number,
  team2Score: number
): Map<string, number> {
  const newRatings = new Map<string, number>();

  // Calculate team averages
  const team1Avg = calculateTeamAverageElo(Array.from(team1Elos.values()));
  const team2Avg = calculateTeamAverageElo(Array.from(team2Elos.values()));

  // Determine actual scores (1 = win, 0.5 = draw, 0 = loss)
  let team1ActualScore: number;
  let team2ActualScore: number;

  if (team1Score > team2Score) {
    team1ActualScore = 1;
    team2ActualScore = 0;
  } else if (team1Score < team2Score) {
    team1ActualScore = 0;
    team2ActualScore = 1;
  } else {
    team1ActualScore = 0.5;
    team2ActualScore = 0.5;
  }

  // Update team 1 players
  team1Elos.forEach((elo, playerId) => {
    const expectedScore = calculateExpectedScore(elo, team2Avg);
    const newElo = calculateNewElo(elo, expectedScore, team1ActualScore);
    newRatings.set(playerId, newElo);
  });

  // Update team 2 players
  team2Elos.forEach((elo, playerId) => {
    const expectedScore = calculateExpectedScore(elo, team1Avg);
    const newElo = calculateNewElo(elo, expectedScore, team2ActualScore);
    newRatings.set(playerId, newElo);
  });

  return newRatings;
}

/**
 * Get Elo rank tier based on rating
 * @param elo - Player's Elo rating
 * @returns Rank tier name
 */
export function getEloTier(elo: number): string {
  if (elo < 1000) return 'Bronze';
  if (elo < 1200) return 'Silver';
  if (elo < 1400) return 'Gold';
  if (elo < 1600) return 'Platinum';
  if (elo < 1800) return 'Diamond';
  if (elo < 2000) return 'Master';
  return 'Grandmaster';
}

/**
 * Get color for Elo tier
 * @param tier - Rank tier name
 * @returns Tailwind color class
 */
export function getEloTierColor(tier: string): string {
  const colors: Record<string, string> = {
    Bronze: 'text-amber-700',
    Silver: 'text-gray-400',
    Gold: 'text-yellow-500',
    Platinum: 'text-cyan-400',
    Diamond: 'text-blue-400',
    Master: 'text-purple-500',
    Grandmaster: 'text-red-500',
  };
  return colors[tier] || 'text-gray-500';
}
