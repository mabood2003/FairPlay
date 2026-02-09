'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Trophy, MapPin } from 'lucide-react';
import { Sport, SkillLevel, CreateGameInput, GameLocation, RecurrenceFrequency } from '@/lib/types';
import { createGame } from '@/lib/firebase/firestore';
import { useAuthContext } from '@/components/auth/AuthProvider';

interface CreateGameFormProps {
  onLocationSelect?: () => void;
  selectedLocation?: GameLocation | null;
}

export default function CreateGameForm({ onLocationSelect, selectedLocation }: CreateGameFormProps) {
  const router = useRouter();
  const { user } = useAuthContext();

  const [sport, setSport] = useState<Sport>('basketball');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('casual');
  const [useEloRequirement, setUseEloRequirement] = useState(false);
  const [minElo, setMinElo] = useState(1200);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedLocation) {
      setError('Please select a location on the map');
      return;
    }

    if (!date || !time) {
      setError('Please select a date and time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const startTime = new Date(`${date}T${time}`);

      if (startTime <= new Date()) {
        throw new Error('Game must be scheduled in the future');
      }

      const gameInput: CreateGameInput = {
        sport,
        location: {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          name: locationName || 'Game Location',
          address: locationAddress || selectedLocation.address || 'Location selected on map',
        },
        startTime,
        duration,
        maxPlayers,
        skillLevel,
        minElo: useEloRequirement ? minElo : undefined,
        recurrence: recurrence !== 'none' ? {
          frequency: recurrence,
          dayOfWeek: startTime.getDay(),
        } : undefined,
      };

      const gameId = await createGame(user.uid, gameInput);
      router.push(`/games/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Sport Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
        <div className="flex gap-4">
          <SportButton
            sport="basketball"
            emoji="🏀"
            selected={sport === 'basketball'}
            onClick={() => setSport('basketball')}
          />
          <SportButton
            sport="soccer"
            emoji="⚽"
            selected={sport === 'soccer'}
            onClick={() => setSport('soccer')}
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="inline h-4 w-4 mr-1" />
          Location
        </label>
        {selectedLocation ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm mb-2">Location selected on map</p>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Location name (e.g., Central Park Court)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
            />
            <input
              type="text"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="Address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onLocationSelect}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-500 hover:text-green-600 transition"
          >
            Click on the map to select location
          </button>
        )}
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="inline h-4 w-4 mr-1" />
            Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
      </div>

      {/* Duration and Max Players */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (minutes)
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="inline h-4 w-4 mr-1" />
            Max Players
          </label>
          <input
            type="number"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            min={2}
            max={30}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Skill Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
        <div className="flex gap-4">
          <SkillButton
            level="casual"
            selected={skillLevel === 'casual'}
            onClick={() => setSkillLevel('casual')}
          />
          <SkillButton
            level="competitive"
            selected={skillLevel === 'competitive'}
            onClick={() => setSkillLevel('competitive')}
          />
        </div>
      </div>

      {/* Recurrence */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="inline h-4 w-4 mr-1" />
          Repeat
        </label>
        <div className="flex gap-3">
          <RecurrenceButton label="One-time" value="none" selected={recurrence === 'none'} onClick={() => setRecurrence('none')} />
          <RecurrenceButton label="Weekly" value="weekly" selected={recurrence === 'weekly'} onClick={() => setRecurrence('weekly')} />
          <RecurrenceButton label="Biweekly" value="biweekly" selected={recurrence === 'biweekly'} onClick={() => setRecurrence('biweekly')} />
        </div>
        {recurrence !== 'none' && (
          <p className="text-xs text-gray-500 mt-2">
            A new game will be automatically created {recurrence === 'weekly' ? 'every week' : 'every 2 weeks'} after this game completes.
          </p>
        )}
      </div>

      {/* Elo Requirement */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useEloRequirement}
            onChange={(e) => setUseEloRequirement(e.target.checked)}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm font-medium text-gray-700">
            <Trophy className="inline h-4 w-4 mr-1" />
            Set minimum Elo requirement
          </span>
        </label>
        {useEloRequirement && (
          <div className="mt-2">
            <input
              type="number"
              value={minElo}
              onChange={(e) => setMinElo(Number(e.target.value))}
              min={800}
              max={2500}
              step={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Only players with {minElo}+ Elo in {sport} can join
            </p>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !selectedLocation}
        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Game...' : 'Create Game'}
      </button>
    </form>
  );
}

function SportButton({
  sport,
  emoji,
  selected,
  onClick,
}: {
  sport: string;
  emoji: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 p-4 rounded-lg border-2 transition ${
        selected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className="text-3xl">{emoji}</span>
      <p className="mt-1 font-medium capitalize">{sport}</p>
    </button>
  );
}

function SkillButton({
  level,
  selected,
  onClick,
}: {
  level: SkillLevel;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 px-4 rounded-lg border-2 transition capitalize ${
        selected
          ? level === 'competitive'
            ? 'border-purple-500 bg-purple-50 text-purple-700'
            : 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {level}
    </button>
  );
}

function RecurrenceButton({
  label,
  value,
  selected,
  onClick,
}: {
  label: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-lg border-2 transition text-sm ${
        selected
          ? 'border-green-500 bg-green-50 text-green-700'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}
