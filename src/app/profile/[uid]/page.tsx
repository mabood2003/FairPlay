'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Trophy, ArrowLeft } from 'lucide-react';
import { getUserProfile } from '@/lib/firebase/auth';
import ProfileCard from '@/components/profile/ProfileCard';
import { User } from '@/lib/types';

export default function UserProfilePage() {
  const params = useParams();
  const uid = params.uid as string;

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const userProfile = await getUserProfile(uid);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          setError('User not found');
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [uid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-gray-50">
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
            </div>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <p className="text-gray-600 mb-6">The user profile you are looking for does not exist.</p>
          <Link
            href="/games"
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Back to Games
          </Link>
        </div>
      </main>
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
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Player Profile</h1>
        <ProfileCard user={profile} />
      </div>
    </main>
  );
}
