'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, ArrowLeft, TrendingUp, TrendingDown, Minus, MapPin, BarChart3 } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { getUserCompletedGames } from '@/lib/firebase/firestore';
import { getUserProfile } from '@/lib/firebase/auth';
import { Game, Sport, PlayerStats, PlayerGameRecord, User } from '@/lib/types';
import { getEloTier, getEloTierColor } from '@/lib/elo';
import EloDisplay from '@/components/profile/EloDisplay';

function computeStats(games: Game[], userId: string): PlayerStats {
  const records: PlayerGameRecord[] = [];
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let basketballGames = 0;
  let soccerGames = 0;
  const locationCounts: Record<string, number> = {};

  for (const game of games) {
    if (!game.results) continue;

    const isTeam1 = game.results.team1.includes(userId);
    const isTeam2 = game.results.team2.includes(userId);
    if (!isTeam1 && !isTeam2) continue;

    const playerTeamScore = isTeam1 ? game.results.team1Score : game.results.team2Score;
    const opponentTeamScore = isTeam1 ? game.results.team2Score : game.results.team1Score;
    const won = playerTeamScore > opponentTeamScore;
    const drew = playerTeamScore === opponentTeamScore;

    if (won) wins++;
    else if (drew) draws++;
    else losses++;

    if (game.sport === 'basketball') basketballGames++;
    else soccerGames++;

    const locName = game.location.name || 'Unknown';
    locationCounts[locName] = (locationCounts[locName] || 0) + 1;

    const teammates = isTeam1
      ? game.results.team1.filter((p) => p !== userId)
      : game.results.team2.filter((p) => p !== userId);
    const opponents = isTeam1 ? game.results.team2 : game.results.team1;

    records.push({
      gameId: game.gameId,
      sport: game.sport,
      date: game.startTime.toDate(),
      eloChange: 0, // We don't have per-game Elo snapshots stored
      eloAfter: 0,
      won,
      drew,
      teammates,
      opponents,
      locationName: locName,
    });
  }

  const totalGames = wins + losses + draws;
  const favoriteLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return {
    totalGames,
    wins,
    losses,
    draws,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    basketballGames,
    soccerGames,
    favoriteLocation,
    gameHistory: records,
  };
}

export default function StatsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAuthenticated } = useAuthContext();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      try {
        const games = await getUserCompletedGames(user.uid);
        const computed = computeStats(games, user.uid);
        setStats(computed);

        // Load names for teammates/opponents
        const allPlayerIds = new Set<string>();
        for (const record of computed.gameHistory) {
          record.teammates.forEach((id) => allPlayerIds.add(id));
          record.opponents.forEach((id) => allPlayerIds.add(id));
        }
        const names: Record<string, string> = {};
        const profilePromises = Array.from(allPlayerIds).map(async (id) => {
          const p = await getUserProfile(id);
          if (p) names[id] = p.displayName;
        });
        await Promise.all(profilePromises);
        setPlayerNames(names);
      } catch {
        // Stats are non-critical, silently handle
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!stats || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No stats available yet. Play some games first!</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
                Profile
              </Link>
              <div className="flex items-center gap-2">
                <Trophy className="h-8 w-8 text-green-600" />
                <span className="text-xl font-bold text-gray-900">FairPlay</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="h-7 w-7 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">My Stats</h1>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Games Played" value={stats.totalGames} />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} />
          <StatCard label="Wins" value={stats.wins} color="text-green-600" />
          <StatCard label="Losses" value={stats.losses} color="text-red-500" />
        </div>

        {/* Elo Ratings */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Current Ratings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <EloDisplay sport="basketball" elo={profile.sports.basketball} size="md" />
              <p className="text-sm text-gray-500 mt-2">{stats.basketballGames} games</p>
            </div>
            <div>
              <EloDisplay sport="soccer" elo={profile.sports.soccer} size="md" />
              <p className="text-sm text-gray-500 mt-2">{stats.soccerGames} games</p>
            </div>
          </div>
        </div>

        {/* Win/Loss/Draw Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Record Breakdown</h2>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1">
              <div className="flex h-6 rounded-full overflow-hidden bg-gray-200">
                {stats.totalGames > 0 && (
                  <>
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(stats.wins / stats.totalGames) * 100}%` }}
                    />
                    <div
                      className="bg-gray-400 transition-all"
                      style={{ width: `${(stats.draws / stats.totalGames) * 100}%` }}
                    />
                    <div
                      className="bg-red-400 transition-all"
                      style={{ width: `${(stats.losses / stats.totalGames) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" /> {stats.wins}W
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-400" /> {stats.draws}D
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-400" /> {stats.losses}L
            </span>
          </div>
        </div>

        {/* Favorite Location */}
        {stats.favoriteLocation !== 'N/A' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-2">Favorite Court</h2>
            <p className="flex items-center gap-2 text-gray-700">
              <MapPin className="h-5 w-5 text-green-600" />
              {stats.favoriteLocation}
            </p>
          </div>
        )}

        {/* Game History */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Game History</h2>
          {stats.gameHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No completed games yet</p>
          ) : (
            <div className="space-y-3">
              {stats.gameHistory.map((record) => (
                <Link
                  key={record.gameId}
                  href={`/games/${record.gameId}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{record.sport === 'basketball' ? '🏀' : '⚽'}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{record.locationName}</p>
                      <p className="text-xs text-gray-500">
                        {record.date.toLocaleDateString()} &middot;{' '}
                        {record.teammates.length > 0
                          ? `with ${record.teammates.map((id) => playerNames[id] || 'Player').join(', ')}`
                          : 'Solo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.won ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <TrendingUp className="h-4 w-4" /> Win
                      </span>
                    ) : record.drew ? (
                      <span className="flex items-center gap-1 text-gray-500 text-sm font-medium">
                        <Minus className="h-4 w-4" /> Draw
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-sm font-medium">
                        <TrendingDown className="h-4 w-4" /> Loss
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 text-center">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
