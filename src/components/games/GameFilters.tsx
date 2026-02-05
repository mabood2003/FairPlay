'use client';

import { Sport, SkillLevel } from '@/lib/types';

interface GameFiltersProps {
  selectedSport: Sport | undefined;
  selectedSkillLevel: SkillLevel | undefined;
  onSportChange: (sport: Sport | undefined) => void;
  onSkillLevelChange: (level: SkillLevel | undefined) => void;
}

export default function GameFilters({
  selectedSport,
  selectedSkillLevel,
  onSportChange,
  onSkillLevelChange,
}: GameFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl shadow-sm">
      {/* Sport Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Sport:</span>
        <div className="flex gap-2">
          <FilterButton
            active={selectedSport === undefined}
            onClick={() => onSportChange(undefined)}
          >
            All
          </FilterButton>
          <FilterButton
            active={selectedSport === 'basketball'}
            onClick={() => onSportChange('basketball')}
          >
            🏀 Basketball
          </FilterButton>
          <FilterButton
            active={selectedSport === 'soccer'}
            onClick={() => onSportChange('soccer')}
          >
            ⚽ Soccer
          </FilterButton>
        </div>
      </div>

      {/* Skill Level Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Level:</span>
        <div className="flex gap-2">
          <FilterButton
            active={selectedSkillLevel === undefined}
            onClick={() => onSkillLevelChange(undefined)}
          >
            All
          </FilterButton>
          <FilterButton
            active={selectedSkillLevel === 'casual'}
            onClick={() => onSkillLevelChange('casual')}
          >
            Casual
          </FilterButton>
          <FilterButton
            active={selectedSkillLevel === 'competitive'}
            onClick={() => onSkillLevelChange('competitive')}
          >
            Competitive
          </FilterButton>
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
        active
          ? 'bg-green-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
