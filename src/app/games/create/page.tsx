'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import GameMap from '@/components/games/GameMap';
import CreateGameForm from '@/components/games/CreateGameForm';
import { GameLocation } from '@/lib/types';

export default function CreateGamePage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthContext();
  const [selectedLocation, setSelectedLocation] = useState<GameLocation | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({
      lat,
      lng,
      address: '',
      name: '',
    });
  };

  if (loading) {
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
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Host a Game</h1>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-3">
                Click to Select Location
              </h2>
              <div className="h-[500px] rounded-lg overflow-hidden">
                <GameMap
                  games={[]}
                  onMapClick={handleMapClick}
                  selectedLocation={selectedLocation}
                />
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Game Details</h2>
              <CreateGameForm selectedLocation={selectedLocation} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
