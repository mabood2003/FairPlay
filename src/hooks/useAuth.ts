'use client';

import { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { User } from '@/lib/types';
import { subscribeToUser } from '@/lib/firebase/firestore';

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribeUser = subscribeToUser(firebaseUser.uid, (profile) => {
      setUserProfile(profile);
      setLoading(false);
    });

    return () => unsubscribeUser();
  }, [firebaseUser]);

  return {
    user: firebaseUser,
    profile: userProfile,
    loading,
    isAuthenticated: !!firebaseUser,
  };
}
