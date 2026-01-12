/**
 * useFavorites Hook
 * Provides reusable favorite operations with proper loading/error states
 * and offline queue support via Firebase
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getUserFavorites, 
  addFavorite, 
  removeFavorite, 
  checkIsFavorite 
} from '../services/backend';

export interface FavoriteItem {
  id: string;
  eventId: string;
  createdAt: string;
}

interface UseFavoritesReturn {
  favorites: FavoriteItem[];
  loading: boolean;
  error: string | null;
  isFavorite: (eventId: string) => boolean;
  toggleFavorite: (eventId: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
}

interface UseFavoriteForEventReturn {
  isFavorite: boolean;
  loading: boolean;
  error: string | null;
  toggleFavorite: () => Promise<void>;
}

/**
 * Hook to manage all user favorites
 */
export function useFavorites(userId: string | undefined): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getUserFavorites(userId);
      setFavorites(data);
    } catch (err) {
      console.error('[useFavorites] Error fetching favorites:', err);
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback((eventId: string): boolean => {
    return favorites.some(f => f.eventId === eventId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (eventId: string): Promise<boolean> => {
    if (!userId) return false;

    const existingFavorite = favorites.find(f => f.eventId === eventId);

    try {
      if (existingFavorite) {
        // Remove from favorites
        await removeFavorite(existingFavorite.id);
        setFavorites(prev => prev.filter(f => f.id !== existingFavorite.id));
        return false;
      } else {
        // Add to favorites
        const newFavorite = await addFavorite(userId, eventId);
        setFavorites(prev => [newFavorite, ...prev]);
        return true;
      }
    } catch (err) {
      console.error('[useFavorites] Error toggling favorite:', err);
      throw new Error('Failed to update favorite');
    }
  }, [userId, favorites]);

  return {
    favorites,
    loading,
    error,
    isFavorite,
    toggleFavorite,
    refreshFavorites: fetchFavorites,
  };
}

/**
 * Hook to manage favorite state for a single event
 * Optimized for EventDetails page with loading state
 */
export function useFavoriteForEvent(
  userId: string | undefined,
  eventId: string | undefined
): UseFavoriteForEventReturn {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if event is favorited on mount
  useEffect(() => {
    const checkFavorite = async () => {
      if (!userId || !eventId) {
        setInitialLoading(false);
        return;
      }

      try {
        const result = await checkIsFavorite(userId, eventId);
        setIsFavorite(result.isFavorite);
        setFavoriteId(result.favoriteId);
      } catch (err) {
        console.error('[useFavoriteForEvent] Error checking favorite:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    checkFavorite();
  }, [userId, eventId]);

  const toggleFavorite = useCallback(async () => {
    if (!userId || !eventId || loading) return;

    setLoading(true);
    setError(null);

    // Optimistic update
    const wasIsFavorite = isFavorite;
    const oldFavoriteId = favoriteId;
    setIsFavorite(!wasIsFavorite);

    try {
      if (wasIsFavorite && oldFavoriteId) {
        // Remove from favorites
        await removeFavorite(oldFavoriteId);
        setFavoriteId(null);
      } else {
        // Add to favorites
        const newFavorite = await addFavorite(userId, eventId);
        setFavoriteId(newFavorite.id);
      }
    } catch (err) {
      // Revert optimistic update on error
      setIsFavorite(wasIsFavorite);
      setFavoriteId(oldFavoriteId);
      setError('Failed to update favorite');
      console.error('[useFavoriteForEvent] Error toggling favorite:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, eventId, isFavorite, favoriteId, loading]);

  return {
    isFavorite,
    loading: loading || initialLoading,
    error,
    toggleFavorite,
  };
}

export default useFavorites;
