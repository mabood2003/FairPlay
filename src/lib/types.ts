import { Timestamp } from 'firebase/firestore';

export type Sport = 'basketball' | 'soccer';
export type SkillLevel = 'casual' | 'competitive';
export type GameStatus = 'open' | 'in_progress' | 'pending_results' | 'completed' | 'cancelled';

export interface UserSports {
  basketball: number;
  soccer: number;
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  sports: UserSports;
  reliabilityScore: number;
  gamesPlayed: number;
  gamesAttended: number;
  createdAt: Timestamp;
}

export interface GameLocation {
  lat: number;
  lng: number;
  address: string;
  name: string;
}

export interface GameResults {
  team1: string[];
  team2: string[];
  team1Score: number;
  team2Score: number;
  confirmedBy: string[];
}

export interface Game {
  gameId: string;
  hostId: string;
  sport: Sport;
  location: GameLocation;
  startTime: Timestamp;
  duration: number;
  maxPlayers: number;
  skillLevel: SkillLevel;
  minElo?: number;
  players: string[];
  checkedIn: string[];
  status: GameStatus;
  results?: GameResults;
  createdAt: Timestamp;
}

// Form types for creating/editing
export interface CreateGameInput {
  sport: Sport;
  location: GameLocation;
  startTime: Date;
  duration: number;
  maxPlayers: number;
  skillLevel: SkillLevel;
  minElo?: number;
}

export interface SubmitScoreInput {
  team1: string[];
  team2: string[];
  team1Score: number;
  team2Score: number;
}

// Default values for new users
export const DEFAULT_ELO = 1200;
export const DEFAULT_RELIABILITY_SCORE = 100;

// Elo calculation constants
export const ELO_K_FACTOR = 32;

// Geolocation constants
export const CHECK_IN_RADIUS_METERS = 500;
export const CHECK_IN_WINDOW_MINUTES = 15;

// Reliability penalty
export const NO_SHOW_PENALTY_MULTIPLIER = 0.95;
