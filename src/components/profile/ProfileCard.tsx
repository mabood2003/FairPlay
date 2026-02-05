'use client';

import { User } from '@/lib/types';
import EloDisplay, { EloProgress } from './EloDisplay';
import { Shield, Award, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ProfileCardProps {
  user: User;
  isOwnProfile?: boolean;
}

export default function ProfileCard({ user, isOwnProfile = false }: ProfileCardProps) {
  const reliabilityColor =
    user.reliabilityScore >= 90
      ? 'text-green-600'
      : user.reliabilityScore >= 70
      ? 'text-yellow-600'
      : 'text-red-600';

  const reliabilityBg =
    user.reliabilityScore >= 90
      ? 'bg-green-100'
      : user.reliabilityScore >= 70
      ? 'bg-yellow-100'
      : 'bg-red-100';

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.displayName}</h1>
            <p className="text-green-100">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6">
        {/* Reliability Score */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Reliability Score
          </h2>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${reliabilityBg}`}>
            <span className={`text-3xl font-bold ${reliabilityColor}`}>
              {user.reliabilityScore}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {user.gamesAttended} of {user.gamesPlayed} games attended
          </p>
        </div>

        {/* Elo Ratings */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Skill Ratings
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <EloDisplay sport="basketball" elo={user.sports.basketball} size="md" />
              <div className="mt-2">
                <EloProgress elo={user.sports.basketball} />
              </div>
            </div>
            <div>
              <EloDisplay sport="soccer" elo={user.sports.soccer} size="md" />
              <div className="mt-2">
                <EloProgress elo={user.sports.soccer} />
              </div>
            </div>
          </div>
        </div>

        {/* Games Played */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Member since
            </span>
            <span>
              {user.createdAt ? format(user.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
            <span>Total games</span>
            <span className="font-medium">{user.gamesPlayed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
