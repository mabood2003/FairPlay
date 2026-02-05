'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, ArrowLeft, LogOut, Settings } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { signOut } from '@/lib/firebase/auth';
import ProfileCard from '@/components/profile/ProfileCard';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, isAuthenticated } = useAuthContext();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/games"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                Back
              </Link>
              <div className="flex items-center gap-2">
                <Trophy className="h-8 w-8 text-green-600" />
                <span className="text-xl font-bold text-gray-900">FairPlay</span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        <ProfileCard user={profile} isOwnProfile />

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Link
            href="/games"
            className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition text-gray-700"
          >
            Find Games
          </Link>
          <Link
            href="/games/create"
            className="flex items-center justify-center gap-2 p-4 bg-green-600 text-white rounded-xl shadow-md hover:shadow-lg hover:bg-green-700 transition"
          >
            Host a Game
          </Link>
        </div>
      </div>
    </main>
  );
}
