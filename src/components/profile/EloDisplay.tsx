'use client';

import { getEloTier, getEloTierColor } from '@/lib/elo';
import { Sport } from '@/lib/types';

interface EloDisplayProps {
  sport: Sport;
  elo: number;
  showTier?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function EloDisplay({ sport, elo, showTier = true, size = 'md' }: EloDisplayProps) {
  const tier = getEloTier(elo);
  const tierColor = getEloTierColor(tier);

  const sportEmoji = sport === 'basketball' ? '🏀' : '⚽';
  const sportColor = sport === 'basketball' ? 'bg-orange-100' : 'bg-green-100';

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const eloSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={`${sportColor} rounded-xl ${sizeClasses[size]}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className={size === 'lg' ? 'text-3xl' : 'text-2xl'}>{sportEmoji}</span>
        <span className="font-medium text-gray-900 capitalize">{sport}</span>
      </div>
      <div className={`font-bold ${eloSizeClasses[size]} text-gray-900`}>{elo}</div>
      {showTier && (
        <div className={`text-sm font-medium ${tierColor}`}>{tier}</div>
      )}
    </div>
  );
}

export function EloProgress({ elo }: { elo: number }) {
  const tier = getEloTier(elo);
  const tierColor = getEloTierColor(tier);

  // Calculate progress within current tier
  const tiers = [
    { name: 'Bronze', min: 0, max: 1000 },
    { name: 'Silver', min: 1000, max: 1200 },
    { name: 'Gold', min: 1200, max: 1400 },
    { name: 'Platinum', min: 1400, max: 1600 },
    { name: 'Diamond', min: 1600, max: 1800 },
    { name: 'Master', min: 1800, max: 2000 },
    { name: 'Grandmaster', min: 2000, max: 3000 },
  ];

  const currentTier = tiers.find((t) => elo >= t.min && elo < t.max) || tiers[tiers.length - 1];
  const progress = ((elo - currentTier.min) / (currentTier.max - currentTier.min)) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className={tierColor}>{tier}</span>
        <span className="text-gray-500">{elo} / {currentTier.max}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
