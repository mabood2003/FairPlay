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
} from 'firebase/firestore';
import { db } from './config';
import { Game, CreateGameInput, User, Sport, SkillLevel, GameStatus } from '../types';

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
  const gameData = {
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

  const docRef = await addDoc(gamesCollection, gameData);
  await updateDoc(docRef, { gameId: docRef.id });
  return docRef.id;
}

export async function getGame(gameId: string): Promise<Game | null> {
  const database = ensureDb();
  const gameRef = doc(database, 'games', gameId);
  const gameSnap = await getDoc(gameRef);

  if (gameSnap.exists()) {
    return { ...gameSnap.data(), gameId: gameSnap.id } as Game;
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

  return snapshot.docs.map((d) => ({ ...d.data(), gameId: d.id }) as Game);
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
      callback({ ...snapshot.data(), gameId: snapshot.id } as Game);
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
    const games = snapshot.docs.map((d) => ({ ...d.data(), gameId: d.id }) as Game);
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
    const userData = userSnap.data() as User;
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
      callback(snapshot.data() as User);
    } else {
      callback(null);
    }
  });
}
