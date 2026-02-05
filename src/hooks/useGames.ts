'use client';

import { useState, useEffect, useCallback } from 'react';
import { Game, Sport, SkillLevel } from '@/lib/types';
import { subscribeToOpenGames, subscribeToGame } from '@/lib/firebase/firestore';

interface GameFilters {
  sport?: Sport;
  skillLevel?: SkillLevel;
}

export function useGames(filters?: GameFilters) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const sport = filters?.sport;
  const skillLevel = filters?.skillLevel;

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const unsubscribe = subscribeToOpenGames((fetchedGames) => {
        setGames(fetchedGames);
        setLoading(false);
      }, { sport, skillLevel });

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch games'));
      setLoading(false);
    }
  }, [sport, skillLevel]);

  return { games, loading, error };
}

export function useGame(gameId: string | null) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = subscribeToGame(gameId, (fetchedGame) => {
        setGame(fetchedGame);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch game'));
      setLoading(false);
    }
  }, [gameId]);

  return { game, loading, error };
}
