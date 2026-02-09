'use client';

import { useState, useEffect } from 'react';
import { Check, X, Users } from 'lucide-react';
import { Game, Sport } from '@/lib/types';
import { submitGameResults, confirmGameResults, processEloUpdatesTransactional } from '@/lib/firebase/firestore';
import { processGameResults } from '@/lib/elo';
import { getUserProfile } from '@/lib/firebase/auth';

interface ScoreSubmissionProps {
  game: Game;
  currentUserId: string;
  isHost: boolean;
}

export default function ScoreSubmission({ game, currentUserId, isHost }: ScoreSubmissionProps) {
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});

  // Load player names
  useEffect(() => {
    async function loadPlayerNames() {
      const names: Record<string, string> = {};
      for (const playerId of game.players) {
        const profile = await getUserProfile(playerId);
        if (profile) {
          names[playerId] = profile.displayName;
        }
      }
      setPlayerNames(names);
    }
    loadPlayerNames();
  }, [game.players]);

  const unassignedPlayers = game.checkedIn.filter(
    (p) => !team1.includes(p) && !team2.includes(p)
  );

  const handleAddToTeam = (playerId: string, team: 1 | 2) => {
    if (team === 1) {
      setTeam1([...team1, playerId]);
      setTeam2(team2.filter((p) => p !== playerId));
    } else {
      setTeam2([...team2, playerId]);
      setTeam1(team1.filter((p) => p !== playerId));
    }
  };

  const handleRemoveFromTeam = (playerId: string, team: 1 | 2) => {
    if (team === 1) {
      setTeam1(team1.filter((p) => p !== playerId));
    } else {
      setTeam2(team2.filter((p) => p !== playerId));
    }
  };

  const handleSubmitScore = async () => {
    if (team1.length === 0 || team2.length === 0) {
      setError('Both teams must have at least one player');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await submitGameResults(game.gameId, {
        team1,
        team2,
        team1Score,
        team2Score,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit score');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmScore = async () => {
    setLoading(true);
    setError('');

    try {
      await confirmGameResults(game.gameId, currentUserId);

      // Check if majority confirmed
      const results = game.results;
      if (results) {
        const totalPlayers = results.team1.length + results.team2.length;
        const confirmations = results.confirmedBy.length + 1; // +1 for current confirmation

        if (confirmations > totalPlayers / 2) {
          // Majority confirmed — process Elo updates atomically via transaction
          await processEloUpdatesTransactional(
            game.gameId,
            results.team1,
            results.team2,
            results.team1Score,
            results.team2Score,
            game.sport,
            processGameResults
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm score');
    } finally {
      setLoading(false);
    }
  };

  const hasConfirmed = game.results?.confirmedBy.includes(currentUserId);
  const confirmationCount = game.results?.confirmedBy.length || 0;
  const totalPlayers = (game.results?.team1.length || 0) + (game.results?.team2.length || 0);

  if (game.status === 'pending_results' && game.results) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Confirm Score</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Team 1</h3>
            <p className="text-3xl font-bold text-blue-600">{game.results.team1Score}</p>
            <div className="mt-2 text-sm text-blue-700">
              {game.results.team1.map((p) => playerNames[p] || 'Player').join(', ')}
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Team 2</h3>
            <p className="text-3xl font-bold text-green-600">{game.results.team2Score}</p>
            <div className="mt-2 text-sm text-green-700">
              {game.results.team2.map((p) => playerNames[p] || 'Player').join(', ')}
            </div>
          </div>
        </div>

        <div className="mb-4 text-center text-gray-600">
          {confirmationCount}/{totalPlayers} players confirmed
        </div>

        {!hasConfirmed ? (
          <button
            onClick={handleConfirmScore}
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
          >
            {loading ? 'Confirming...' : 'Confirm Score'}
          </button>
        ) : (
          <div className="text-center text-green-600 font-medium">
            <Check className="inline h-5 w-5 mr-1" />
            You confirmed this score
          </div>
        )}
      </div>
    );
  }

  if (!isHost || game.status !== 'in_progress') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Submit Score</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Unassigned Players */}
      {unassignedPlayers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Assign Players to Teams
          </h3>
          <div className="flex flex-wrap gap-2">
            {unassignedPlayers.map((playerId) => (
              <div
                key={playerId}
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2"
              >
                <span className="text-sm">{playerNames[playerId] || 'Player'}</span>
                <button
                  onClick={() => handleAddToTeam(playerId, 1)}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                >
                  Team 1
                </button>
                <button
                  onClick={() => handleAddToTeam(playerId, 2)}
                  className="text-green-600 hover:text-green-700 text-xs font-medium"
                >
                  Team 2
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams and Scores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team 1
          </h3>
          <div className="space-y-2 mb-3">
            {team1.map((playerId) => (
              <div
                key={playerId}
                className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-blue-800">
                  {playerNames[playerId] || 'Player'}
                </span>
                <button
                  onClick={() => handleRemoveFromTeam(playerId, 1)}
                  className="text-red-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <input
            type="number"
            value={team1Score}
            onChange={(e) => setTeam1Score(Number(e.target.value))}
            min={0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-2xl font-bold"
            placeholder="Score"
          />
        </div>

        <div>
          <h3 className="font-medium text-green-900 mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team 2
          </h3>
          <div className="space-y-2 mb-3">
            {team2.map((playerId) => (
              <div
                key={playerId}
                className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-green-800">
                  {playerNames[playerId] || 'Player'}
                </span>
                <button
                  onClick={() => handleRemoveFromTeam(playerId, 2)}
                  className="text-red-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <input
            type="number"
            value={team2Score}
            onChange={(e) => setTeam2Score(Number(e.target.value))}
            min={0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-2xl font-bold"
            placeholder="Score"
          />
        </div>
      </div>

      <button
        onClick={handleSubmitScore}
        disabled={loading || team1.length === 0 || team2.length === 0}
        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Submit Score'}
      </button>
    </div>
  );
}

