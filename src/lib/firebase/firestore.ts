import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp,
  QueryConstraint,
  CollectionReference,
  runTransaction,
  DocumentData,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import { Game, CreateGameInput, User, Sport, SkillLevel, GameStatus, FriendConnection, Recurrence } from '../types';

// --- Runtime validation helpers ---

function isValidSports(sports: unknown): sports is { basketball: number; soccer: number } {
  if (typeof sports !== 'object' || sports === null) return false;
  const s = sports as Record<string, unknown>;
  return typeof s.basketball === 'number' && typeof s.soccer === 'number';
}

function validateUserData(data: DocumentData): User {
  if (
    typeof data.uid !== 'string' ||
    typeof data.displayName !== 'string' ||
    typeof data.email !== 'string' ||
    !isValidSports(data.sports) ||
    typeof data.reliabilityScore !== 'number' ||
    typeof data.gamesPlayed !== 'number' ||
    typeof data.gamesAttended !== 'number'
  ) {
    throw new Error('Invalid user data from Firestore');
  }
  return data as unknown as User;
}

function validateGameData(data: DocumentData, gameId: string): Game {
  if (
    typeof data.hostId !== 'string' ||
    typeof data.sport !== 'string' ||
    !data.location ||
    !data.startTime ||
    typeof data.duration !== 'number' ||
    typeof data.maxPlayers !== 'number' ||
    typeof data.skillLevel !== 'string' ||
    !Array.isArray(data.players) ||
    !Array.isArray(data.checkedIn) ||
    typeof data.status !== 'string'
  ) {
    throw new Error('Invalid game data from Firestore');
  }
  return { ...data, gameId } as unknown as Game;
}

function getGamesCollection(): CollectionReference {
  if (!db) throw new Error('Firebase not initialized');
  return collection(db, 'games');
}

function getUsersCollection(): CollectionReference {
  if (!db) throw new Error('Firebase not initialized');
  return collection(db, 'users');
}

function ensureDb() {
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

export async function createGame(hostId: string, input: CreateGameInput): Promise<string> {
  const gamesCollection = getGamesCollection();
  const gameData: Record<string, unknown> = {
    hostId,
    sport: input.sport,
    location: input.location,
    startTime: Timestamp.fromDate(input.startTime),
    duration: input.duration,
    maxPlayers: input.maxPlayers,
    skillLevel: input.skillLevel,
    minElo: input.minElo,
    players: [hostId],
    checkedIn: [],
    status: 'open' as GameStatus,
    createdAt: serverTimestamp(),
  };

  if (input.recurrence && input.recurrence.frequency !== 'none') {
    gameData.recurrence = input.recurrence;
  }

  const docRef = await addDoc(gamesCollection, gameData);
  await updateDoc(docRef, { gameId: docRef.id });
  return docRef.id;
}

/**
 * Create the next occurrence of a recurring game.
 * Called after a recurring game completes or is cancelled.
 */
export async function createNextRecurringGame(completedGame: Game): Promise<string | null> {
  if (!completedGame.recurrence || completedGame.recurrence.frequency === 'none') {
    return null;
  }

  const weeksToAdd = completedGame.recurrence.frequency === 'weekly' ? 1 : 2;
  const currentStart = completedGame.startTime.toDate();
  const nextStart = new Date(currentStart);
  nextStart.setDate(nextStart.getDate() + weeksToAdd * 7);

  // Don't create games more than 30 days in the future
  const maxFutureDate = new Date();
  maxFutureDate.setDate(maxFutureDate.getDate() + 30);
  if (nextStart > maxFutureDate) {
    return null;
  }

  const input: CreateGameInput = {
    sport: completedGame.sport,
    location: completedGame.location,
    startTime: nextStart,
    duration: completedGame.duration,
    maxPlayers: completedGame.maxPlayers,
    skillLevel: completedGame.skillLevel,
    minElo: completedGame.minElo,
    recurrence: {
      ...completedGame.recurrence,
      parentGameId: completedGame.recurrence.parentGameId || completedGame.gameId,
    },
  };

  return createGame(completedGame.hostId, input);
}

export async function getGame(gameId: string): Promise<Game | null> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  const gameSnap = await getDoc(gameRef);

  if (gameSnap.exists()) {
    return validateGameData(gameSnap.data(), gameSnap.id);
  }
  return null;
}

export async function joinGame(gameId: string, userId: string): Promise<void> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  await updateDoc(gameRef, {
    players: arrayUnion(userId),
  });
}

export async function leaveGame(gameId: string, userId: string): Promise<void> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  await updateDoc(gameRef, {
    players: arrayRemove(userId),
  });
}

export async function checkInToGame(gameId: string, userId: string): Promise<void> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data();
  if (!Array.isArray(gameData.players) || !gameData.players.includes(userId)) {
    throw new Error('You must be a player in this game to check in');
  }

  if (gameData.status !== 'open') {
    throw new Error('Check-in is only available for open games');
  }

  await updateDoc(gameRef, {
    checkedIn: arrayUnion(userId),
  });
}

export async function updateGameStatus(gameId: string, status: GameStatus): Promise<void> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  await updateDoc(gameRef, { status });
}

export async function submitGameResults(
  gameId: string,
  results: {
    team1: string[];
    team2: string[];
    team1Score: number;
    team2Score: number;
  }
): Promise<void> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data();
  if (gameData.status !== 'in_progress') {
    throw new Error('Scores can only be submitted for in-progress games');
  }

  // Validate all players in results are actual game players
  const gamePlayers: string[] = gameData.players || [];
  const allResultPlayers = [...results.team1, ...results.team2];
  for (const playerId of allResultPlayers) {
    if (!gamePlayers.includes(playerId)) {
      throw new Error(`Player ${playerId} is not in this game`);
    }
  }

  // Validate scores are non-negative integers
  if (results.team1Score < 0 || results.team2Score < 0) {
    throw new Error('Scores must be non-negative');
  }

  if (!Number.isInteger(results.team1Score) || !Number.isInteger(results.team2Score)) {
    throw new Error('Scores must be whole numbers');
  }

  await updateDoc(gameRef, {
    results: {
      ...results,
      confirmedBy: [],
    },
    status: 'pending_results' as GameStatus,
  });
}

export async function confirmGameResults(gameId: string, userId: string): Promise<void> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data();
  if (gameData.status !== 'pending_results') {
    throw new Error('Game is not pending result confirmation');
  }

  // Verify user is a participant in the game
  const allResultPlayers = [
    ...(gameData.results?.team1 || []),
    ...(gameData.results?.team2 || []),
  ];
  if (!allResultPlayers.includes(userId)) {
    throw new Error('Only players in this game can confirm results');
  }

  if (gameData.results?.confirmedBy?.includes(userId)) {
    throw new Error('You have already confirmed the results');
  }

  await updateDoc(gameRef, {
    'results.confirmedBy': arrayUnion(userId),
  });
}

export async function completeGame(gameId: string): Promise<void> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  await updateDoc(gameRef, { status: 'completed' as GameStatus });
}

export async function cancelGame(gameId: string): Promise<void> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  await updateDoc(gameRef, { status: 'cancelled' as GameStatus });
}

export async function queryGames(filters: {
  sport?: Sport;
  skillLevel?: SkillLevel;
  status?: GameStatus;
}): Promise<Game[]> {
  const gamesCollection = getGamesCollection();
  const constraints: QueryConstraint[] = [];

  if (filters.sport) {
    constraints.push(where('sport', '==', filters.sport));
  }
  if (filters.skillLevel) {
    constraints.push(where('skillLevel', '==', filters.skillLevel));
  }
  if (filters.status) {
    constraints.push(where('status', '==', filters.status));
  }

  constraints.push(orderBy('startTime', 'asc'));

  const q = query(gamesCollection, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => validateGameData(d.data(), d.id));
}

export function subscribeToGame(
  gameId: string,
  callback: (game: Game | null) => void
): () => void {
  if (!db) {
    callback(null);
    return () => {};
  }
  const gameRef = doc(db, 'games', gameId);
  return onSnapshot(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(validateGameData(snapshot.data(), snapshot.id));
    } else {
      callback(null);
    }
  });
}

export function subscribeToOpenGames(
  callback: (games: Game[]) => void,
  filters?: { sport?: Sport; skillLevel?: SkillLevel }
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  const gamesCollection = collection(db, 'games');
  const constraints: QueryConstraint[] = [where('status', '==', 'open')];

  if (filters?.sport) {
    constraints.push(where('sport', '==', filters.sport));
  }
  if (filters?.skillLevel) {
    constraints.push(where('skillLevel', '==', filters.skillLevel));
  }

  constraints.push(orderBy('startTime', 'asc'));

  const q = query(gamesCollection, ...constraints);
  return onSnapshot(q, (snapshot) => {
    const games = snapshot.docs.map((d) => validateGameData(d.data(), d.id));
    callback(games);
  });
}

export async function updateUserElo(
  userId: string,
  sport: Sport,
  newElo: number
): Promise<void> {
  const database = ensureDb();
  const userRef = doc(database, 'users', userId);
  await updateDoc(userRef, {
    [`sports.${sport}`]: newElo,
  });
}

/**
 * Atomically process Elo updates for all players in a completed game.
 * Uses a Firestore transaction to ensure all-or-nothing updates,
 * preventing partial Elo updates if a failure occurs mid-process.
 */
export async function processEloUpdatesTransactional(
  gameId: string,
  team1: string[],
  team2: string[],
  team1Score: number,
  team2Score: number,
  sport: Sport,
  calculateResults: (
    team1Elos: Map<string, number>,
    team2Elos: Map<string, number>,
    t1Score: number,
    t2Score: number
  ) => Map<string, number>
): Promise<void> {
  const database = ensureDb();

  await runTransaction(database, async (transaction) => {
    // Read all player profiles within the transaction
    const team1Elos = new Map<string, number>();
    const team2Elos = new Map<string, number>();
    const playerRefs = new Map<string, ReturnType<typeof doc>>();
    const playerData = new Map<string, DocumentData>();

    for (const playerId of [...team1, ...team2]) {
      const userRef = doc(database, 'users', playerId);
      const snap = await transaction.get(userRef);
      if (!snap.exists()) throw new Error(`Player ${playerId} not found`);
      const data = snap.data();
      validateUserData(data);
      playerRefs.set(playerId, userRef);
      playerData.set(playerId, data);

      if (team1.includes(playerId)) {
        team1Elos.set(playerId, data.sports[sport]);
      } else {
        team2Elos.set(playerId, data.sports[sport]);
      }
    }

    // Calculate new ratings
    const newRatings = calculateResults(team1Elos, team2Elos, team1Score, team2Score);

    // Write all updates atomically
    for (const [playerId, newElo] of newRatings) {
      const ref = playerRefs.get(playerId)!;
      const data = playerData.get(playerId)!;
      transaction.update(ref, {
        [`sports.${sport}`]: newElo,
        gamesPlayed: (data.gamesPlayed || 0) + 1,
        gamesAttended: (data.gamesAttended || 0) + 1,
      });
    }

    // Mark game as completed atomically
    const gameRef = doc(database, 'games', gameId);
    transaction.update(gameRef, { status: 'completed' as GameStatus });
  });
}

export async function updateUserReliability(
  userId: string,
  newScore: number
): Promise<void> {
  const database = ensureDb();
  const userRef = doc(database, 'users', userId);
  await updateDoc(userRef, {
    reliabilityScore: newScore,
  });
}

export async function incrementUserGames(
  userId: string,
  attended: boolean
): Promise<void> {
  const database = ensureDb();
  const userRef = doc(database, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = validateUserData(userSnap.data());
    await updateDoc(userRef, {
      gamesPlayed: userData.gamesPlayed + 1,
      gamesAttended: attended ? userData.gamesAttended + 1 : userData.gamesAttended,
    });
  }
}

export function subscribeToUser(
  userId: string,
  callback: (user: User | null) => void
): () => void {
  if (!db) {
    callback(null);
    return () => {};
  }
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(validateUserData(snapshot.data()));
    } else {
      callback(null);
    }
  });
}

// --- Friend System ---

function getFriendsCollection(): CollectionReference {
  if (!db) throw new Error('Firebase not initialized');
  return collection(db, 'friends');
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) throw new Error('Cannot follow yourself');
  const friendsCol = getFriendsCollection();

  // Check if already following
  const existing = await getDocs(
    query(friendsCol, where('followerId', '==', followerId), where('followingId', '==', followingId))
  );
  if (!existing.empty) throw new Error('Already following this user');

  await addDoc(friendsCol, {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const friendsCol = getFriendsCollection();
  const database = ensureDb();
  const snapshot = await getDocs(
    query(friendsCol, where('followerId', '==', followerId), where('followingId', '==', followingId))
  );
  for (const d of snapshot.docs) {
    await deleteDoc(doc(database, 'friends', d.id));
  }
}

export async function getFollowing(userId: string): Promise<string[]> {
  const friendsCol = getFriendsCollection();
  const snapshot = await getDocs(
    query(friendsCol, where('followerId', '==', userId))
  );
  return snapshot.docs.map((d) => d.data().followingId as string);
}

export async function getFollowers(userId: string): Promise<string[]> {
  const friendsCol = getFriendsCollection();
  const snapshot = await getDocs(
    query(friendsCol, where('followingId', '==', userId))
  );
  return snapshot.docs.map((d) => d.data().followerId as string);
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const friendsCol = getFriendsCollection();
  const snapshot = await getDocs(
    query(friendsCol, where('followerId', '==', followerId), where('followingId', '==', followingId))
  );
  return !snapshot.empty;
}

// --- Player Stats ---

export async function getUserCompletedGames(userId: string): Promise<Game[]> {
  const gamesCollection = getGamesCollection();
  const snapshot = await getDocs(
    query(
      gamesCollection,
      where('status', '==', 'completed'),
      where('players', 'array-contains', userId),
      orderBy('startTime', 'desc')
    )
  );
  return snapshot.docs.map((d) => validateGameData(d.data(), d.id));
}
