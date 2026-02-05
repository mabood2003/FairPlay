'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, List, Map as MapIcon, Trophy } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useGames } from '@/hooks/useGames';
import GameMap from '@/components/games/GameMap';
import GameCard from '@/components/games/GameCard';
import GameFilters from '@/components/games/GameFilters';
import { Sport, SkillLevel } from '@/lib/types';

export default function GamesPage() {
  const { isAuthenticated, loading: authLoading, profile } = useAuthContext();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedSport, setSelectedSport] = useState<Sport | undefined>();
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<SkillLevel | undefined>();

  const filters = useMemo(
    () => ({
      sport: selectedSport,
      skillLevel: selectedSkillLevel,
    }),
    [selectedSport, selectedSkillLevel]
  );

  const { games, loading: gamesLoading } = useGames(filters);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-green-600" />
              <span className="text-xl font-bold text-gray-900">FairPlay</span>
            </Link>

            <div className="flex items-center gap-4">
              {authLoading ? (
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded-lg" />
              ) : isAuthenticated ? (
                <>
                  <Link
                    href="/games/create"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Host Game
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    {profile?.displayName || 'Profile'}
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Find Games</h1>
            <p className="text-gray-600">
              {games.length} active games near you
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                viewMode === 'map'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapIcon className="h-4 w-4" />
              Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>
        </div>

        {/* Filters */}
        <GameFilters
          selectedSport={selectedSport}
          selectedSkillLevel={selectedSkillLevel}
          onSportChange={setSelectedSport}
          onSkillLevelChange={setSelectedSkillLevel}
        />

        {/* Content */}
        <div className="mt-6">
          {gamesLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
            </div>
          ) : viewMode === 'map' ? (
            <div className="h-[600px] rounded-xl overflow-hidden shadow-lg">
              <GameMap games={games} />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 mb-4">No games found matching your filters</p>
                  {isAuthenticated && (
                    <Link
                      href="/games/create"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Plus className="h-5 w-5" />
                      Host a Game
                    </Link>
                  )}
                </div>
              ) : (
                games.map((game) => <GameCard key={game.gameId} game={game} />)
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
