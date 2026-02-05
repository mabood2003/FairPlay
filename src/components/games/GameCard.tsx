'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Clock, Users, Trophy } from 'lucide-react';
import { Game } from '@/lib/types';

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  const sportEmoji = game.sport === 'basketball' ? '🏀' : '⚽';
  const sportColor = game.sport === 'basketball' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';
  const isFull = game.players.length >= game.maxPlayers;

  return (
    <Link href={`/games/${game.gameId}`}>
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 border border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{sportEmoji}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{game.location.name}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {game.location.address}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${sportColor}`}
          >
            {game.sport}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-gray-400" />
            {format(game.startTime.toDate(), 'MMM d, h:mm a')}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-400" />
            {game.players.length}/{game.maxPlayers} players
          </div>
          {game.minElo && (
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-gray-400" />
              Min {game.minElo} Elo
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
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
              isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isFull ? 'Full' : 'Open'}
          </span>
        </div>
      </div>
    </Link>
  );
}
