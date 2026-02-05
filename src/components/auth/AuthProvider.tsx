'use client';

import { createContext, useContext, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/lib/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
