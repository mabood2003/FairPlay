'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Trophy,
  MapPin,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Play,
  AlertCircle,
} from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useGame } from '@/hooks/useGames';
import { useGeolocation } from '@/hooks/useGeolocation';
import {
  joinGame,
  leaveGame,
  checkInToGame,
  updateGameStatus,
  cancelGame,
  updateUserReliability,
  incrementUserGames,
} from '@/lib/firebase/firestore';
import { getUserProfile } from '@/lib/firebase/auth';
import {
  isWithinCheckInRadius,
  isWithinCheckInWindow,
  calculateReliabilityPenalty,
  formatDistance,
  calculateDistance,
} from '@/lib/geolocation';
import { getEloTier, getEloTierColor } from '@/lib/elo';
import ScoreSubmission from '@/components/games/ScoreSubmission';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { User } from '@/lib/types';

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const { user, profile, isAuthenticated, loading: authLoading } = useAuthContext();
  const { game, loading: gameLoading } = useGame(gameId);
  const { position, loading: geoLoading, error: geoError, requestPosition } = useGeolocation();

  const [players, setPlayers] = useState<Record<string, User>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Load player profiles
  const gamePlayers = game?.players;
  useEffect(() => {
    async function loadPlayers() {
      if (!gamePlayers) return;
      const playerData: Record<string, User> = {};
      for (const playerId of gamePlayers) {
        const playerProfile = await getUserProfile(playerId);
        if (playerProfile) {
          playerData[playerId] = playerProfile;
        }
      }
      setPlayers(playerData);
    }
    loadPlayers();
  }, [gamePlayers]);

  if (gameLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Game Not Found</h1>
        <Link href="/games" className="text-green-600 hover:text-green-700">
          Back to Games
        </Link>
      </div>
    );
  }

  const isHost = user?.uid === game.hostId;
  const isJoined = game.players.includes(user?.uid || '');
  const isCheckedIn = game.checkedIn.includes(user?.uid || '');
  const isFull = game.players.length >= game.maxPlayers;
  const gameStartTime = game.startTime.toDate();
  const canCheckIn = isWithinCheckInWindow(gameStartTime);
  const sportEmoji = game.sport === 'basketball' ? '🏀' : '⚽';

  const meetsEloRequirement = !game.minElo || (profile?.sports[game.sport] || 0) >= game.minElo;

  const handleJoin = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      await joinGame(gameId, user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;

    setActionLoading(true);
    setError('');

    try {
      await leaveGame(gameId, user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;

    setActionLoading(true);
    setError('');

    try {
      const currentPosition = await requestPosition();
      if (!currentPosition) {
        throw new Error('Could not get your location');
      }

      const isNearby = isWithinCheckInRadius(currentPosition, {
        lat: game.location.lat,
        lng: game.location.lng,
      });

      if (!isNearby) {
        const distance = calculateDistance(currentPosition, {
          lat: game.location.lat,
          lng: game.location.lng,
        });
        throw new Error(
          `You must be within 500m of the game location to check in. You are ${formatDistance(distance)} away.`
        );
      }

      await checkInToGame(gameId, user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!isHost) return;

    setActionLoading(true);
    setError('');

    try {
      // Apply no-show penalties
      for (const playerId of game.players) {
        if (!game.checkedIn.includes(playerId)) {
          const playerProfile = players[playerId];
          if (playerProfile) {
            const newReliability = calculateReliabilityPenalty(playerProfile.reliabilityScore);
            await updateUserReliability(playerId, newReliability);
            await incrementUserGames(playerId, false);
          }
        }
      }

      await updateGameStatus(gameId, 'in_progress');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelGame = async () => {
    if (!isHost) return;

    setActionLoading(true);
    setError('');

    try {
      await cancelGame(gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel game');
    } finally {
      setActionLoading(false);
    }
  };

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Game Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{sportEmoji}</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{game.location.name}</h1>
                <p className="text-gray-500 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {game.location.address}
                </p>
              </div>
            </div>
            <StatusBadge status={game.status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              {format(gameStartTime, 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              {format(gameStartTime, 'h:mm a')} ({game.duration} min)
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              {game.players.length}/{game.maxPlayers} players
            </div>
            {game.minElo && (
              <div className="flex items-center gap-2 text-gray-600">
                <Trophy className="h-4 w-4" />
                Min {game.minElo} Elo
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                game.skillLevel === 'competitive'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {game.skillLevel}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                game.sport === 'basketball'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {game.sport}
            </span>
            {game.recurrence && game.recurrence.frequency !== 'none' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                {game.recurrence.frequency === 'weekly' ? 'Weekly' : 'Biweekly'}
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Players List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              Players ({game.players.length}/{game.maxPlayers})
            </h2>
            <div className="space-y-3">
              {game.players.map((playerId) => {
                const player = players[playerId];
                const isPlayerCheckedIn = game.checkedIn.includes(playerId);
                const isHostPlayer = playerId === game.hostId;

                return (
                  <div
                    key={playerId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {player?.displayName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {player?.displayName || 'Loading...'}
                          {isHostPlayer && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              Host
                            </span>
                          )}
                        </p>
                        {player && (
                          <p className="text-sm text-gray-500">
                            <span className={getEloTierColor(getEloTier(player.sports[game.sport]))}>
                              {player.sports[game.sport]} Elo
                            </span>
                            {' • '}
                            {player.reliabilityScore}% reliable
                          </p>
                        )}
                      </div>
                    </div>
                    {game.status !== 'open' && (
                      <div>
                        {isPlayerCheckedIn ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions Panel */}
          <div className="space-y-6">
            {/* Join/Leave Actions */}
            {game.status === 'open' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>

                {!isAuthenticated ? (
                  <Link
                    href="/login"
                    className="block w-full py-3 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition"
                  >
                    Sign In to Join
                  </Link>
                ) : isJoined ? (
                  <div className="space-y-3">
                    {canCheckIn && !isCheckedIn && (
                      <button
                        onClick={handleCheckIn}
                        disabled={actionLoading || geoLoading}
                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {geoLoading ? 'Getting Location...' : 'Check In'}
                      </button>
                    )}
                    {isCheckedIn && (
                      <div className="flex items-center gap-2 text-green-600 justify-center py-3">
                        <CheckCircle className="h-5 w-5" />
                        Checked In
                      </div>
                    )}
                    {!isHost && (
                      <button
                        onClick={handleLeave}
                        disabled={actionLoading}
                        className="w-full py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                      >
                        Leave Game
                      </button>
                    )}
                    {isHost && canCheckIn && game.checkedIn.length > 0 && (
                      <button
                        onClick={handleStartGame}
                        disabled={actionLoading}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Play className="h-5 w-5" />
                        Start Game
                      </button>
                    )}
                    {isHost && (
                      <button
                        onClick={handleCancelGame}
                        disabled={actionLoading}
                        className="w-full py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        Cancel Game
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!meetsEloRequirement && (
                      <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                        Your Elo ({profile?.sports[game.sport]}) is below the minimum requirement (
                        {game.minElo})
                      </div>
                    )}
                    <button
                      onClick={handleJoin}
                      disabled={actionLoading || isFull || !meetsEloRequirement}
                      className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isFull ? 'Game Full' : 'Join Game'}
                    </button>
                  </div>
                )}

                {geoError && (
                  <p className="text-red-500 text-sm mt-2">{geoError}</p>
                )}
              </div>
            )}

            {/* Score Submission for in_progress or pending_results */}
            {(game.status === 'in_progress' || game.status === 'pending_results') && user && (
              <ErrorBoundary>
                <ScoreSubmission game={game} currentUserId={user.uid} isHost={isHost} />
              </ErrorBoundary>
            )}

            {/* Completed Game Results */}
            {game.status === 'completed' && game.results && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Final Results</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Team 1</h3>
                    <p className="text-4xl font-bold text-blue-600">{game.results.team1Score}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-green-900 mb-2">Team 2</h3>
                    <p className="text-4xl font-bold text-green-600">{game.results.team2Score}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-green-100', text: 'text-green-700', label: 'Open' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
    pending_results: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Results' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  };

  const config = statusConfig[status] || statusConfig.open;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
