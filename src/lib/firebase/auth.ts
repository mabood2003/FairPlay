import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { User, DEFAULT_ELO, DEFAULT_RELIABILITY_SCORE } from '../types';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<FirebaseUser> {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, googleProvider);
  await createUserProfileIfNotExists(result.user);
  return result.user;
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await createUserProfileIfNotExists(result.user, displayName);
  return result.user;
}

export async function signOut(): Promise<void> {
  if (!auth) throw new Error('Firebase not initialized');
  await firebaseSignOut(auth);
}

export async function createUserProfileIfNotExists(
  firebaseUser: FirebaseUser,
  displayName?: string
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const newUser: Omit<User, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      uid: firebaseUser.uid,
      displayName: displayName || firebaseUser.displayName || 'Anonymous',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || undefined,
      sports: {
        basketball: DEFAULT_ELO,
        soccer: DEFAULT_ELO,
      },
      reliabilityScore: DEFAULT_RELIABILITY_SCORE,
      gamesPlayed: 0,
      gamesAttended: 0,
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, newUser);
  }
}

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!db) return null;
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    // Runtime validation of user data from Firestore
    if (
      typeof data.uid !== 'string' ||
      typeof data.displayName !== 'string' ||
      typeof data.email !== 'string' ||
      typeof data.sports !== 'object' ||
      data.sports === null ||
      typeof data.sports.basketball !== 'number' ||
      typeof data.sports.soccer !== 'number' ||
      typeof data.reliabilityScore !== 'number' ||
      typeof data.gamesPlayed !== 'number' ||
      typeof data.gamesAttended !== 'number'
    ) {
      console.error('Invalid user data from Firestore for uid:', uid);
      return null;
    }
    return data as unknown as User;
  }
  return null;
}
